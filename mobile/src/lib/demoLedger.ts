import { createDemoQuote, PAYOUT_NETWORKS, RefundQuote } from './refundQuote';

export type DemoReceipt = RefundQuote & {
  id: string;
  requestId: string;
  cardId: string;
  scannedBalanceJpy: number;
  remainingDemoJpy: number;
  createdAt: string;
  status: 'simulated' | 'confirmed';
  transactionDigest?: string;
  chainReceiptId?: string;
  chainNetwork?: 'mainnet';
  amountMist?: string;
  amountWei?: string;
  humanCheck?: 'verified' | 'bypassed' | 'not_required';
};
type Storage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};
export const LEDGER_KEY = 'unsui.demo-refunds.v1';
const validBalance = (n: number) => Number.isInteger(n) && n >= 0 && n <= 20000;
function cardKey(id: string) {
  if (!/^[0-9a-f]{16}$/i.test(id))
    throw Error('Scan a physical transit card again.');
  return id.toLowerCase();
}
export function availableDemoBalance(
  receipts: DemoReceipt[],
  cardId: string,
  scannedBalance: number,
) {
  if (!validBalance(scannedBalance))
    throw Error('Scan a valid card balance again.');
  const records = receipts.filter(r => r.cardId === cardKey(cardId));
  const opening = records[0]?.scannedBalanceJpy ?? scannedBalance;
  const used = records.reduce((sum, r) => sum + r.amountJpy, 0);
  return Math.max(0, Math.min(scannedBalance, opening - used));
}
function sameQuote(a: RefundQuote, b: RefundQuote) {
  return (
    a.network === b.network &&
    a.recipient === b.recipient &&
    a.amountJpy === b.amountJpy &&
    a.feeJpy === b.feeJpy &&
    a.netJpy === b.netJpy &&
    a.estimatedCrypto === b.estimatedCrypto
  );
}
export function decodeDemoReceipts(raw: string | null): DemoReceipt[] {
  if (raw === null) return [];
  try {
    const parsed = JSON.parse(raw);
    if (parsed.version !== 1 || !Array.isArray(parsed.receipts)) throw Error();
    const validated: DemoReceipt[] = [];
    const requests = new Set();
    for (const r of parsed.receipts) {
      if (
        !r ||
        !['GM', 'DEMO'].some(
          prefix =>
            r.id ===
            `${prefix}-${String(validated.length + 1).padStart(6, '0')}`,
        ) ||
        typeof r.requestId !== 'string' ||
        !r.requestId ||
        requests.has(r.requestId) ||
        typeof r.cardId !== 'string' ||
        cardKey(r.cardId) !== r.cardId ||
        !validBalance(r.scannedBalanceJpy) ||
        !['simulated', 'confirmed'].includes(r.status) ||
        (r.status === 'confirmed' &&
          (r.chainNetwork !== 'mainnet' ||
            !/^0x[0-9a-f]{64}$/.test(r.chainReceiptId || '') ||
            (r.network === 'sui'
              ? !/^[1-9A-HJ-NP-Za-km-z]{43,44}$/.test(
                  r.transactionDigest || '',
                ) || r.amountMist !== String(r.amountJpy * 98000)
              : r.network === 'ethereum'
              ? !/^0x[0-9a-f]{64}$/.test(r.transactionDigest || '') ||
                r.amountWei !==
                  (BigInt(r.amountJpy) * 1960000000000n).toString()
              : true))) ||
        typeof r.createdAt !== 'string' ||
        !Number.isFinite(Date.parse(r.createdAt)) ||
        !Object.prototype.hasOwnProperty.call(PAYOUT_NETWORKS, r.network) ||
        typeof r.recipient !== 'string'
      )
        throw Error();
      const available = availableDemoBalance(
        validated,
        r.cardId,
        r.scannedBalanceJpy,
      );
      const quote = createDemoQuote(
        String(r.amountJpy),
        available,
        r.network,
        r.recipient,
      );
      if (
        !sameQuote(quote, r) ||
        r.remainingDemoJpy !== available - r.amountJpy
      )
        throw Error();
      requests.add(r.requestId);
      validated.push(r);
    }
    return validated;
  } catch {
    throw Error(
      'The demo ledger is unreadable. Refunds are paused to protect the saved balance.',
    );
  }
}
export type RecordInput = {
  requestId: string;
  quote: RefundQuote;
  cardId: string;
  scannedBalanceJpy: number;
  confirmedCardId: string;
  confirmedBalanceJpy: number;
  worldVerificationId?: string;
  humanCheck?: DemoReceipt['humanCheck'];
};
export function createDemoLedger(
  storage: Storage,
  payout?: (input: RecordInput) => Promise<Partial<DemoReceipt>>,
) {
  // Serialize read/modify/write operations across all cards and networks.
  let queue: Promise<unknown> = Promise.resolve();
  function serial<T>(work: () => Promise<T>): Promise<T> {
    const next = queue.then(work);
    queue = next.catch(() => {});
    return next;
  }
  const load = async () => {
    let raw: string | null;
    try {
      raw = await storage.getItem(LEDGER_KEY);
    } catch {
      throw Error('Could not read the demo ledger. Try loading it again.');
    }
    return decodeDemoReceipts(raw);
  };
  return {
    list: () => serial(load),
    reset: () =>
      serial(() =>
        storage.setItem(
          LEDGER_KEY,
          JSON.stringify({ version: 1, receipts: [] }),
        ),
      ),
    record: (input: RecordInput) =>
      serial(async () => {
        const cardId = cardKey(input.cardId);
        if (cardKey(input.confirmedCardId) !== cardId)
          throw Error('That is a different card. Re-scan the original card.');
        if (input.confirmedBalanceJpy !== input.scannedBalanceJpy)
          throw Error('The card balance changed. Go back and scan it again.');
        if (!input.requestId) throw Error('Missing demo request reference.');
        const receipts = await load();
        const existing = receipts.find(r => r.requestId === input.requestId);
        if (existing) {
          if (
            existing.cardId !== cardId ||
            existing.scannedBalanceJpy !== input.scannedBalanceJpy ||
            !sameQuote(existing, input.quote)
          )
            throw Error('This request reference belongs to a different quote.');
          return existing;
        }
        const available = availableDemoBalance(
          receipts,
          cardId,
          input.scannedBalanceJpy,
        );
        const quote = createDemoQuote(
          String(input.quote.amountJpy),
          available,
          input.quote.network,
          input.quote.recipient,
        );
        if (!sameQuote(quote, input.quote))
          throw Error('The quote changed. Please review it again.');
        const receipt: DemoReceipt = {
          ...quote,
          id: `GM-${String(receipts.length + 1).padStart(6, '0')}`,
          requestId: input.requestId,
          cardId,
          scannedBalanceJpy: input.scannedBalanceJpy,
          remainingDemoJpy: available - quote.amountJpy,
          createdAt: new Date().toISOString(),
          status: 'simulated',
          ...(input.humanCheck ? { humanCheck: input.humanCheck } : {}),
        };
        if (payout) Object.assign(receipt, await payout(input));
        try {
          await storage.setItem(
            LEDGER_KEY,
            JSON.stringify({ version: 1, receipts: [...receipts, receipt] }),
          );
        } catch {
          throw Error(
            'Could not save the demo receipt. Retry confirmation to check and save this same request.',
          );
        }
        return receipt;
      }),
  };
}
