const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createLivePayouts } = require("../live-payouts.cjs");
const { createDemoLedger } = require("../build/demoLedger");
const { createDemoQuote } = require("../build/refundQuote");
const input = {
  requestId: "live-1",
  cardId: "0123456789abcdef",
  confirmedCardId: "0123456789abcdef",
  scannedBalanceJpy: 1100,
  confirmedBalanceJpy: 1100,
  quote: createDemoQuote("1100", 1100, "sui", "0x" + "1".repeat(64)),
  humanCheck: "bypassed",
};
const result = {
  status: "confirmed",
  transactionDigest: "1".repeat(43),
  chainReceiptId: "0x" + "2".repeat(64),
  chainNetwork: "mainnet",
  amountMist: "107800000",
};
async function file(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "unsui-live-"));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return path.join(dir, "orders.json");
}
test("concurrent/restarted retries reuse confirmed payout and preserve bypass audit", async (t) => {
  const f = await file(t);
  let calls = 0,
    auth = 0;
  const pay = async () => {
    calls++;
    return result;
  };
  const run = createLivePayouts({
    file: f,
    pay,
    authorize: () => {
      auth++;
      return true;
    },
  });
  const [a, b] = await Promise.all([run(input), run(input)]);
  assert.deepEqual(a, b);
  assert.equal(calls, 1);
  assert.equal(auth, 1);
  assert.equal(a.humanCheck, "bypassed");
  const restarted = createLivePayouts({ file: f, pay, authorize: () => false });
  assert.deepEqual(await restarted({ ...input, humanCheck: "verified" }), a);
  assert.equal(calls, 1);
  await assert.rejects(
    () =>
      restarted({
        ...input,
        quote: { ...input.quote, recipient: "0x" + "3".repeat(64) },
      }),
    /different payout/
  );
});
test("unknown outcome reserves card and retry reconciles without another proof", async (t) => {
  const f = await file(t);
  let calls = 0;
  const run = createLivePayouts({
    file: f,
    authorize: () => true,
    pay: async () => {
      if (++calls === 1) throw Error("timeout");
      return result;
    },
  });
  await assert.rejects(() => run(input), /timeout/);
  await assert.rejects(
    () => run({ ...input, requestId: "different" }),
    /unresolved/
  );
  assert.equal((await run(input)).status, "confirmed");
});
test("sample cards, wrong chain and unauthenticated requests never pay", async (t) => {
  const f = await file(t);
  const run = createLivePayouts({
    file: f,
    authorize: () => false,
    pay: async () => {
      throw Error("must not pay");
    },
  });
  await assert.rejects(
    () => run({ ...input, cardId: "ffffffffffffffff" }),
    /physical/
  );
  await assert.rejects(
    () => run({ ...input, quote: { ...input.quote, network: "ethereum" } }),
    /Sui/
  );
  await assert.rejects(() => run(input), /World ID/);
});
test("validation precedes payout; failed receipt storage retries without duplicate transfer", async (t) => {
  const f = await file(t);
  let calls = 0,
    raw = null,
    fail = true;
  const payout = createLivePayouts({
    file: f,
    authorize: () => true,
    pay: async () => {
      calls++;
      return result;
    },
  });
  const ledger = createDemoLedger(
    {
      getItem: async () => raw,
      setItem: async (_k, v) => {
        if (fail) {
          fail = false;
          throw Error("disk");
        }
        raw = v;
      },
    },
    payout
  );
  await assert.rejects(
    () => ledger.record({ ...input, confirmedCardId: "1123456789abcdef" }),
    /different card/
  );
  assert.equal(calls, 0);
  await assert.rejects(() => ledger.record(input), /save/);
  assert.equal(calls, 1);
  const r = await ledger.record(input);
  assert.equal(r.transactionDigest, result.transactionDigest);
  assert.equal(calls, 1);
  assert.equal((await ledger.list())[0].status, "confirmed");
});

test('Ethereum receipts survive ledger reload and reject another amount', async t => {
  const f=await file(t);let raw=null;
  const eth={...input,quote:createDemoQuote('1100',1100,'ethereum','0x'+'3'.repeat(40))};
  const payout=createLivePayouts({file:f,networks:['sui','ethereum'],authorize:()=>true,pay:async()=>({status:'confirmed',transactionDigest:'0x'+'a'.repeat(64),chainReceiptId:'0x'+'b'.repeat(64),chainNetwork:'mainnet',amountWei:'2156000000000000'})});
  const ledger=createDemoLedger({getItem:async()=>raw,setItem:async(_,v)=>{raw=v;}},payout);
  const receipt=await ledger.record(eth);assert.equal(receipt.network,'ethereum');assert.equal((await ledger.list())[0].amountWei,'2156000000000000');
  const {decodeDemoReceipts}=require('../build/demoLedger');
  assert.throws(()=>decodeDemoReceipts(raw.replace('2156000000000000','1')),/unreadable/);
});
