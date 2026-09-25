import { cardReceipts } from '../src/lib/cardReceipts';
import type { DemoReceipt } from '../src/lib/demoLedger';
test('filters by card, deduplicates receipts, and orders latest refunds first without mutating inputs', () => {
  const receipt = (id: string, cardId: string, createdAt: string) =>
    ({ id, cardId, createdAt } as DemoReceipt);
  const old = receipt('old', 'ABC', '2026-09-25T12:00:00Z');
  const latest = receipt('new', 'abc', '2026-09-26T12:00:00Z');
  const other = receipt('other', 'def', '2026-09-27T12:00:00Z');
  const input = [old, other, latest, old];
  expect(cardReceipts(input, 'abc')).toEqual([latest, old]);
  expect(input).toEqual([old, other, latest, old]);
  expect(cardReceipts([], 'abc')).toEqual([]);
});
