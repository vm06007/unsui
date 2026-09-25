// Illustrative conversion rates only. No price feed or payout service is connected.
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
    asset: 'MIZU',
    unitsPerYen: 10000,
    yenPerAsset: 10000,
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
};

export function amountError(value: string, balance: number): string | null {
  if (!Number.isInteger(balance) || balance < 0 || balance > 20000)
    return 'Scan your card again to read a valid balance.';
  if (!/^\d+$/.test(value.trim())) return 'Enter a whole-yen amount.';
  const amount = Number(value.trim());
  if (!Number.isSafeInteger(amount) || amount < 1) return 'Enter at least ¥1.';
  if (amount > balance) return 'The amount cannot exceed your scanned balance.';
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
    recipient: recipientText.trim(),
    amountJpy,
    feeJpy: (amountJpy * DEMO_FEE_BPS) / 10000,
    netJpy: (amountJpy * (10000 - DEMO_FEE_BPS)) / 10000,
    estimatedCrypto: fraction ? `${whole}.${fraction}` : String(whole),
  };
}
