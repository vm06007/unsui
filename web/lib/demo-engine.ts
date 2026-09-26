/** Browser-only demo. No wallet, NFC, authorizer or transaction submission. */
export type Chain = 'sui' | 'ethereum' | 'mizuhiki';
export const DEMO_NETWORKS = {
  sui: { name: 'Sui', asset: 'SUI', rate: 0.0001 },
  ethereum: { name: 'Ethereum', asset: 'ETH', rate: 0.000002 },
  mizuhiki: { name: 'Mizuhiki · Awaji Testnet', asset: 'MIZU', rate: 0.0001 },
} as const;
export type Receipt = {
  version: 'UNSUI_WEB_DEMO_V1';
  id: string;
  chain: Chain;
  recipient: string;
  amountJpy: number;
  amount: number;
  sequence: number;
  timestamp: string;
  previousHash: string;
  root: string;
  hash: string;
};
const encode = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value));
const bytes = (hex: string) =>
  Uint8Array.from(hex.match(/.{2}/g) || [], (v) => parseInt(v, 16));
const digest = async (input: Uint8Array) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new Uint8Array(input).buffer),
    ),
  )
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('');
const leaf = (name: string, value: unknown) =>
  digest(Uint8Array.from([0, ...encode([name, value])]));
const node = (left: string, right: string) =>
  digest(Uint8Array.from([1, ...bytes(left), ...bytes(right)]));
export async function merkle(
  receipt: Pick<Receipt, 'recipient' | 'amountJpy' | 'chain'>,
) {
  const leaves = await Promise.all([
    leaf('card', 'UNSUI-SAMPLE-2026'),
    leaf('recipient', receipt.recipient),
    leaf('amountJpy', receipt.amountJpy),
    leaf('chain', receipt.chain),
  ]);
  const left = await node(leaves[0], leaves[1]);
  const right = await node(leaves[2], leaves[3]);
  return { root: await node(left, right), leaves, parents: [left, right] };
}
export async function issueDemoReceipt(
  chain: Chain,
  recipient: string,
  amountJpy: number,
  previous?: Receipt,
): Promise<Receipt> {
  if (!Number.isInteger(amountJpy) || amountJpy <= 0 || amountJpy > 1500)
    throw Error('Choose a valid refund amount.');
  if (!Object.hasOwn(DEMO_NETWORKS, chain)) throw Error('Unsupported network.');
  const addressPattern =
    chain === 'sui' ? /^0x[0-9a-fA-F]{64}$/ : /^0x[0-9a-fA-F]{40}$/;
  if (!addressPattern.test(recipient))
    throw Error('Enter a valid wallet address.');
  const payload = {
    version: 'UNSUI_WEB_DEMO_V1' as const,
    id: crypto.randomUUID(),
    chain,
    recipient,
    amountJpy,
    amount: amountJpy * DEMO_NETWORKS[chain].rate,
    sequence: (previous?.sequence || 0) + 1,
    timestamp: new Date().toISOString(),
    previousHash: previous?.hash || '0'.repeat(64),
    root: (await merkle({ chain, recipient, amountJpy })).root,
  };
  return { ...payload, hash: await digest(encode(payload)) };
}
export async function verifyDemoReceipt(receipt: Receipt, previous?: Receipt) {
  const { hash, ...payload } = receipt;
  const calculated = await digest(encode(payload));
  const root = (await merkle(receipt)).root;
  const linked =
    receipt.sequence === 1
      ? receipt.previousHash === '0'.repeat(64)
      : !!previous &&
        previous.hash === receipt.previousHash &&
        previous.sequence + 1 === receipt.sequence;
  return calculated === hash && root === receipt.root && linked;
}
export const DEMO_ADDRESSES = {
  sui: '0x02b45b23d9f1d739a7ee4424009efb342029007eef9d3f72275dec2afb4a1c47',
  mizuhiki: '0x0000000000000000000000000000000000000001',
  ethereum: '0x0000000000000000000000000000000000000001',
};
export const TRIPS = [
  {
    name: 'Shibuya → Shinjuku',
    detail: 'JR Yamanote Line',
    amount: -180,
    date: 'Today · 09:41',
    kind: 'train',
  },
  {
    name: 'A little pick-me-up',
    detail: 'Vending machine · Shibuya',
    amount: -160,
    date: 'Today · 09:18',
    kind: 'drink',
  },
  {
    name: 'Harajuku → Shibuya',
    detail: 'JR Yamanote Line',
    amount: -150,
    date: 'Yesterday · 18:32',
    kind: 'train',
  },
  {
    name: 'A ride through the city',
    detail: 'Toei Bus · 都営バス',
    amount: -210,
    date: 'Yesterday · 16:05',
    kind: 'bus',
  },
  {
    name: 'Card top-up',
    detail: 'Shibuya Station',
    amount: 2000,
    date: 'Yesterday · 10:12',
    kind: 'topup',
  },
];
