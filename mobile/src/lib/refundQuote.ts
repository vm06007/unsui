// Fixed conversion policy shared with the deployed treasuries; not a market price feed.
export const PAYOUT_NETWORKS = {
  sui: { name: 'Sui', asset: 'SUI', unitsPerYen: 10000, yenPerAsset: 10000 },
  ethereum: {
    name: 'Ethereum',
    asset: 'ETH',
    unitsPerYen: 200,
    yenPerAsset: 500000,
  },
  mizuhiki: {
    name: 'Mizuhiki',
    asset: 'MJPY',
    unitsPerYen: 100000000,
    yenPerAsset: 1,
  },
} as const;
export type PayoutNetwork = keyof typeof PAYOUT_NETWORKS;
export const DEMO_FEE_BPS = 200;
const QUOTE_PRECISION = 100000000;

export type RefundQuote = {
  network: PayoutNetwork;
  recipient: string;
  amountJpy: number;
  feeJpy: number;
  netJpy: number;
  estimatedCrypto: string;
  payoutAsset?: 'MJPY';
  pricing?: {
    source: 'coingecko';
    jpyPerSuiMicros: string;
    priceTimestamp: number;
    issuedAt: number;
    expiresAt: number;
    amountMist: string;
    cardId: string;
    scannedBalanceJpy: number;
    signature: string;
  };
};

export function amountError(value: string, balance: number): string | null {
  if (!Number.isInteger(balance) || balance < 0 || balance > 20000)
    return 'Scan your card again to read a valid balance.';
  if (!/^\d+$/.test(value.trim())) return 'Enter a whole-yen amount.';
  const amount = Number(value.trim());
  if (!Number.isSafeInteger(amount) || amount < 1) return 'Enter at least ¥1.';
  if (amount > balance)
    return 'The amount cannot exceed your available balance.';
  return null;
}

export function recipientError(
  value: string,
  network: PayoutNetwork,
): string | null {
  const recipient = value.trim();
  const length = network === 'sui' ? 64 : 40;
  if (!new RegExp(`^0x[0-9a-fA-F]{${length}}$`).test(recipient)) {
    return `Enter a 0x address with ${length} hexadecimal characters for ${PAYOUT_NETWORKS[network].name}.`;
  }
  if (/^0x0+$/.test(recipient))
    return 'The zero address cannot receive your refund.';
  return null;
}

export function createDemoQuote(
  amountText: string,
  balance: number,
  network: PayoutNetwork,
  recipientText: string,
): RefundQuote {
  const error =
    amountError(amountText, balance) || recipientError(recipientText, network);
  if (error) throw Error(error);
  const amountJpy = Number(amountText.trim());
  // Use integer units at eight decimal places; round payout estimates down.
  const units = Math.floor(
    (amountJpy *
      (10000 - DEMO_FEE_BPS) *
      PAYOUT_NETWORKS[network].unitsPerYen) /
      10000,
  );
  const whole = Math.floor(units / QUOTE_PRECISION);
  const fraction = String(units % QUOTE_PRECISION)
    .padStart(8, '0')
    .replace(/0+$/, '');
  return {
    network,
    ...(network === 'mizuhiki' ? { payoutAsset: 'MJPY' as const } : {}),
    recipient: recipientText.trim(),
    amountJpy,
    feeJpy: (amountJpy * DEMO_FEE_BPS) / 10000,
    netJpy: (amountJpy * (10000 - DEMO_FEE_BPS)) / 10000,
    estimatedCrypto: fraction ? `${whole}.${fraction}` : String(whole),
  };
}

export function marketAmountMist(
  amountJpy: number,
  rateMicros: string,
): string {
  if (
    !Number.isInteger(amountJpy) ||
    amountJpy < 1 ||
    amountJpy > 20000 ||
    !/^[1-9][0-9]{0,14}$/.test(rateMicros)
  )
    throw Error('Invalid market quote.');
  const mist = (BigInt(amountJpy) * 980000000000000n) / BigInt(rateMicros);
  if (mist < 1n || mist > 200000000000n)
    throw Error('Market payout exceeds the treasury policy.');
  return mist.toString();
}
export function formatMist(mist: string): string {
  const n = BigInt(mist);
  const fraction = (n % 1000000000n)
    .toString()
    .padStart(9, '0')
    .replace(/0+$/, '');
  return `${n / 1000000000n}${fraction ? '.' + fraction : ''}`;
}
// Structural validation for saved receipts; backend separately authenticates live quotes.
export function applyMarketQuote(
  base: RefundQuote,
  quote: RefundQuote,
): RefundQuote {
  const p = quote.pricing;
  if (!p) return base;
  if (
    base.network !== 'sui' ||
    p.source !== 'coingecko' ||
    !/^[a-f0-9]{16}$/.test(p.cardId) ||
    !Number.isInteger(p.scannedBalanceJpy) ||
    p.scannedBalanceJpy < base.amountJpy ||
    p.scannedBalanceJpy > 20000 ||
    !Number.isSafeInteger(p.priceTimestamp) ||
    !Number.isSafeInteger(p.issuedAt) ||
    !Number.isSafeInteger(p.expiresAt) ||
    p.expiresAt - p.issuedAt !== 300000 ||
    !/^[a-f0-9]{64}$/.test(p.signature) ||
    p.amountMist !== marketAmountMist(base.amountJpy, p.jpyPerSuiMicros)
  )
    throw Error('Invalid market quote.');
  return { ...base, estimatedCrypto: formatMist(p.amountMist), pricing: p };
}
