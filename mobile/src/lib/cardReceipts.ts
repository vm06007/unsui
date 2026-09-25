import type { DemoReceipt } from './demoLedger';

// Backend activity belongs only to the scanned card; never alter its NFC records.
export function cardReceipts(receipts: DemoReceipt[], cardId: string) {
  const seen = new Set<string>();
  return receipts
    .filter(receipt => {
      if (
        receipt.cardId.toLowerCase() !== cardId.toLowerCase() ||
        seen.has(receipt.id)
      )
        return false;
      seen.add(receipt.id);
      return true;
    })
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
