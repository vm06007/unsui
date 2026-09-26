const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createMarketQuotes } = require("../market-quotes.cjs");
const { createDemoLedger, decodeDemoReceipts } = require("../build/demoLedger");
const args = {
  cardId: "0123456789abcdef",
  scannedBalanceJpy: 1112,
  amountJpy: 1112,
  recipient: "0x" + "1".repeat(64),
};
function setup() {
  let time = 1800000000000,
    calls = 0;
  const service = createMarketQuotes({
    secret: "s".repeat(32),
    now: () => time,
    fetchPrice: async () => {
      calls++;
      return {
        ok: true,
        json: async () => ({
          sui: { jpy: 186.21, last_updated_at: Math.floor(time / 1000) },
        }),
      };
    },
  });
  return { service, advance: (n) => (time += n), calls: () => calls };
}
test("JPY quote rounds down to MIST, binds destination/card, caches price and expires", async () => {
  const t = setup(),
    q = await t.service.issue(args);
  const input = { ...args, quote: q };
  assert.equal(
    q.pricing.amountMist,
    ((1112n * 980000000000000n) / 186210000n).toString()
  );
  assert.equal(t.service.verify(input).source, "coingecko");
  await t.service.issue(args);
  assert.equal(t.calls(), 1);
  assert.throws(() => t.service.verify({ ...input, cardId: "a".repeat(16) }));
  assert.throws(() =>
    t.service.verify({
      ...input,
      quote: { ...q, recipient: "0x" + "2".repeat(64) },
    })
  );
  assert.throws(() =>
    t.service.verify({ ...input, quote: { ...q, estimatedCrypto: "999" } })
  );
  t.advance(300001);
  assert.throws(() => t.service.verify(input), /expired/);
  assert.doesNotThrow(() => t.service.verify(input, { allowExpired: true }));
});
test("stale or unavailable source fails closed without fixed-rate fallback", async () => {
  for (const response of [
    { ok: false },
    { ok: true, json: async () => ({ sui: { jpy: 186, last_updated_at: 1 } }) },
  ]) {
    const s = createMarketQuotes({
      secret: "s".repeat(32),
      fetchPrice: async () => response,
    });
    await assert.rejects(s.issue(args));
  }
});
test("market receipt round trips and a retry never executes another payout", async () => {
  const { service } = setup();
  const quote = await service.issue(args);
  let raw = null,
    pays = 0;
  const ledger = createDemoLedger(
    { getItem: async () => raw, setItem: async (_, v) => (raw = v) },
    async () => {
      pays++;
      return {
        status: "confirmed",
        chainNetwork: "mainnet",
        transactionDigest: "1".repeat(43),
        chainReceiptId: "0x" + "2".repeat(64),
        amountMist: quote.pricing.amountMist,
      };
    }
  );
  const input = {
    ...args,
    quote,
    requestId: "market-1",
    confirmedCardId: args.cardId,
    confirmedBalanceJpy: 1112,
  };
  await ledger.record(input);
  const receipt = await ledger.record(input);
  assert.equal(pays, 1);
  assert.equal(decodeDemoReceipts(raw)[0].amountMist, quote.pricing.amountMist);
  assert.equal(receipt.pricing.source, "coingecko");
  const broken = JSON.parse(raw);
  broken.receipts[0].amountMist = "1";
  assert.throws(() => decodeDemoReceipts(JSON.stringify(broken)));
});
