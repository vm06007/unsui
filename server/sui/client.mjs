import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { bcs } from "@mysten/sui/bcs";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import {
  CardState,
  Receipt,
  cardCommitment,
  hex,
  verifyReceipt,
} from "./proof.mjs";
const exec = promisify(execFile);
const Table = bcs.struct("Table", { id: bcs.Address, size: bcs.u64() });
const Ledger = bcs.struct("Ledger", {
  id: bcs.Address,
  operator: bcs.Address,
  paused: bcs.bool(),
  pool: bcs.u64(),
  cards: Table,
  requests: Table,
});
export function createSuiPayoutClient({ deployment, secret, binary }) {
  if (
    !secret ||
    secret.length < 32 ||
    !binary ||
    deployment.network !== "mainnet"
  )
    throw Error("Missing Sui mainnet configuration");
  const client = new SuiGrpcClient({
    network: "mainnet",
    baseUrl: "https://fullnode.mainnet.sui.io:443",
  });
  const { packageId, ledgerId, publisher } = deployment;
  async function ledger() {
    const { object } = await client.getObject({
      objectId: ledgerId,
      include: { content: true },
    });
    if (object.type !== `${packageId}::refunds::Ledger`)
      throw Error("Wrong treasury type");
    return Ledger.parse(object.content);
  }
  async function field(parentId, name, type) {
    try {
      const { dynamicField } = await client.getDynamicField({
        parentId,
        name: {
          type: "vector<u8>",
          bcs: bcs.vector(bcs.u8()).serialize(name).toBytes(),
        },
      });
      return type.parse(dynamicField.value.bcs);
    } catch (e) {
      if (e.reason === "notFound") return null;
      throw e;
    }
  }
  async function receipt(id, input, card, request) {
    const { object } = await client.getObject({
      objectId: id,
      include: { content: true, previousTransaction: true },
    });
    if (
      object.type !== `${packageId}::refunds::Receipt` ||
      object.owner.$kind !== "Immutable"
    )
      throw Error("Invalid payout receipt");
    const r = Receipt.parse(object.content),
      d = r.data;
    if (
      !verifyReceipt(r).valid ||
      d.ledger !== ledgerId ||
      hex(d.card) !== hex(card) ||
      hex(d.request) !== hex(request) ||
      d.recipient !== input.quote.recipient.toLowerCase() ||
      Number(d.amount_jpy) !== input.quote.amountJpy ||
      Number(d.observed_jpy) !== input.scannedBalanceJpy
    )
      throw Error("Payout receipt does not match this request");
    if (!object.previousTransaction)
      throw Error("Payout transaction indexing pending. Retry this request.");
    return {
      status: "confirmed",
      transactionDigest: object.previousTransaction,
      chainReceiptId: id,
      chainNetwork: "mainnet",
      amountMist: d.amount_mist,
    };
  }
  async function pay(input) {
    const card = [...cardCommitment(input.demoRound ? `${input.demoRound}:${input.cardId}` : input.cardId, secret)],
      request = [...createHash("sha256").update(input.demoRound ? `${input.demoRound}:${input.requestId}` : input.requestId).digest()];
    const l = await ledger();
    const prior = await field(l.requests.id, request, bcs.Address);
    if (prior) return receipt(prior, input, card, request);
    if (l.operator !== publisher || l.paused)
      throw Error("Treasury operator mismatch or payouts paused");
    const state = await field(l.cards.id, card, CardState);
    const redeemed = BigInt(state?.redeemed_jpy || 0),
      amount = BigInt(input.quote.amountJpy);
    if (redeemed + amount > BigInt(input.scannedBalanceJpy))
      throw Error("This card balance has already been refunded on chain");
    if (BigInt(l.pool) < amount * 98000n)
      throw Error("Treasury needs more SUI. No payout was submitted.");
    let output;
    try {
      output = await exec(
        binary,
        [
          "client",
          "--client.env",
          "mainnet",
          "call",
          "--package",
          packageId,
          "--module",
          "refunds",
          "--function",
          "refund",
          "--args",
          ledgerId,
          JSON.stringify(card),
          JSON.stringify(request),
          input.quote.recipient,
          String(input.quote.amountJpy),
          String(input.scannedBalanceJpy),
          String(state?.sequence || 0),
          String(Date.now() + 120000),
          "0x6",
          "--sender",
          publisher,
          "--gas-budget",
          "50000000",
          "--json",
        ],
        { timeout: 90000, maxBuffer: 4 * 1024 * 1024 }
      );
    } catch {
      throw Error(
        "Payout outcome is not yet confirmed. Retry the same request to check the chain."
      );
    }
    const result = JSON.parse(output.stdout);
    if (result.effects?.status?.status !== "success")
      throw Error("Sui rejected the payout. Retry to check its status.");
    await client.waitForTransaction({ digest: result.digest });
    const id = result.objectChanges?.find(
      (x) => x.objectType === `${packageId}::refunds::Receipt`
    )?.objectId;
    if (!id)
      throw Error(
        "Payout submitted; receipt indexing pending. Retry the same request."
      );
    return receipt(id, input, card, request);
  }
  return { pay, ledger };
}
