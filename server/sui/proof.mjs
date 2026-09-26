import { createHash, createHmac } from 'node:crypto';
import { bcs } from '@mysten/sui/bcs';

export const ReceiptData = bcs.struct('ReceiptData', {
  domain: bcs.vector(bcs.u8()),
  ledger: bcs.Address,
  card: bcs.vector(bcs.u8()),
  request: bcs.vector(bcs.u8()),
  recipient: bcs.Address,
  amount_jpy: bcs.u64(),
  amount_mist: bcs.u64(),
  observed_jpy: bcs.u64(),
  redeemed_jpy: bcs.u64(),
  sequence: bcs.u64(),
  previous_receipt: bcs.Address,
  previous_hash: bcs.vector(bcs.u8()),
  claim_root: bcs.vector(bcs.u8()),
  timestamp_ms: bcs.u64(),
});
export const Receipt = bcs.struct('Receipt', {
  id: bcs.Address,
  data: ReceiptData,
  hash: bcs.vector(bcs.u8()),
});
export const CardState = bcs.struct('CardState', {
  redeemed_jpy: bcs.u64(),
  sequence: bcs.u64(),
  head: bcs.vector(bcs.u8()),
  latest: bcs.Address,
});
export const hash = bytes => createHash('sha256').update(bytes).digest();
export const hex = bytes => Buffer.from(bytes).toString('hex');
export const cardCommitment = (
  idm,
  secret
) =>
  createHmac('sha256', secret)
    .update('UNSUI_CARD_V1:')
    .update(idm.toLowerCase())
    .digest();
const leaf = bytes =>
  hash(Buffer.concat([Buffer.from([0]), Buffer.from(bytes)]));
const node = (
  a,
  b
) => hash(Buffer.concat([Buffer.from([1]), a, b]));

export function claimProofs(data) {
  const names = ['card', 'recipient', 'amount_jpy', 'observed_jpy'];
  const types = [bcs.vector(bcs.u8()), bcs.Address, bcs.u64(), bcs.u64()];
  const leaves = names.map((
    name,
    i
  ) =>
    leaf(types[i].serialize(data[name]).toBytes()),
  );
  const parents = [node(leaves[0], leaves[1]), node(leaves[2], leaves[3])];
  const root = node(...parents);
  return {
    root: hex(root),
    fields: names.map((
      name,
      i
    ) => ({
      name,
      value: data[name],
      leaf: hex(leaves[i]),
      index: i,
      siblings: [hex(leaves[i ^ 1]), hex(parents[(i >> 1) ^ 1])],
    })),
  };
}

export function verifyInclusion(
  proof,
  root
) {
  const types = {
    card: bcs.vector(bcs.u8()),
    recipient: bcs.Address,
    amount_jpy: bcs.u64(),
    observed_jpy: bcs.u64(),
  };
  const names = Object.keys(types);
  if (names[proof.index] !== proof.name || proof.siblings.length !== 2)
    return false;
  let digest = leaf(types[proof.name].serialize(proof.value).toBytes());
  let index = proof.index;
  for (const sibling of proof.siblings) {
    if (!/^[a-f0-9]{64}$/.test(sibling)) return false;
    const other = Buffer.from(sibling, 'hex');
    digest = index & 1 ? node(other, digest) : node(digest, other);
    index >>= 1;
  }
  return hex(digest) === root;
}

export function verifyReceipt(receipt) {
  const merkle = claimProofs(receipt.data);
  const computedHash = hex(hash(ReceiptData.serialize(receipt.data).toBytes()));
  const valid =
    ['UNSUI_RECEIPT_V2', 'UNSUI_RECEIPT_V3'].includes(Buffer.from(receipt.data.domain).toString()) &&
    computedHash === hex(receipt.hash) &&
    merkle.root === hex(receipt.data.claim_root) &&
    (Buffer.from(receipt.data.domain).toString() === 'UNSUI_RECEIPT_V2'
      ? BigInt(receipt.data.amount_mist) === BigInt(receipt.data.amount_jpy) * 98000n
      : BigInt(receipt.data.amount_mist) > 0n && BigInt(receipt.data.amount_mist) <= 200000000000n);
  return { valid, hash: computedHash, merkle };
}
