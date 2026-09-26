const fs = require("node:fs/promises");
const path = require("node:path");
const { createHash } = require("node:crypto");
function fingerprint(input) {
  return createHash("sha256")
    .update(
      JSON.stringify([
        input.cardId.toLowerCase(),
        input.scannedBalanceJpy,
        input.quote,
      ])
    )
    .digest("hex");
}
function createLivePayouts({ file, pay, authorize, networks = ["sui"] }) {
  let queue = Promise.resolve();
  return (input) => {
    const work = queue.then(async () => {
      if (
        !networks.includes(input.quote.network) ||
        input.cardId.toLowerCase() === "ffffffffffffffff"
      )
        throw Error("Live payouts require a physical card and an enabled network (Sui by default).");
      let records = {};
      try {
        records = JSON.parse(await fs.readFile(file, "utf8"));
      } catch (e) {
        if (e.code !== "ENOENT") throw e;
      }
      const key = createHash("sha256").update(input.requestId).digest("hex"),
        binding = fingerprint(input);
      let order = records[key];
      if (order && order.binding !== binding)
        throw Error("Request reference belongs to a different payout");
      if (order?.result) return order.result;
      if (!order) {
        if (
          Object.values(records).some(
            (x) => x.cardId === input.cardId.toLowerCase() && !x.result
          )
        )
          throw Error(
            "This card has an unresolved payout. Retry the original request first."
          );
        if (!authorize(input))
          throw Error(
            "Refunds above ¥1,000 require a completed World ID check."
          );
        order = {
          binding,
          cardId: input.cardId.toLowerCase(),
          humanCheck: input.humanCheck,
          createdAt: new Date().toISOString(),
        };
        records[key] = order;
        await save(records);
      }
      const result = await pay(input);
      if (
        result.status !== "confirmed" ||
        !(input.quote.network === "ethereum" ? /^0x[0-9a-f]{64}$/i : /^[1-9A-HJ-NP-Za-km-z]{43,44}$/).test(result.transactionDigest || "")
      )
        throw Error("Payout confirmation unavailable");
      order.result = { ...result, humanCheck: order.humanCheck };
      await save(records);
      return order.result;
    });
    queue = work.catch(() => {});
    return work;
  };
  async function save(records) {
    await fs.mkdir(path.dirname(file), { recursive: true });
    const h = await fs.open(file + ".tmp", "w", 0o600);
    try {
      await h.writeFile(JSON.stringify(records));
      await h.sync();
    } finally {
      await h.close();
    }
    await fs.rename(file + ".tmp", file);
  }
}
module.exports = { createLivePayouts };
