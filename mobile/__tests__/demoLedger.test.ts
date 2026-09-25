import {
  availableDemoBalance,
  createDemoLedger,
  LEDGER_KEY,
} from '../src/lib/demoLedger';
import { createDemoQuote } from '../src/lib/refundQuote';
const cardId = '0123456789abcdef';
const recipient = `0x${'1'.repeat(64)}`;
function fixture() {
  let data: string | null = null;
  const storage = {
    getItem: jest.fn(async () => data),
    setItem: jest.fn(async (_key: string, value: string) => {
      data = value;
    }),
  };
  return {
    storage,
    ledger: createDemoLedger(storage),
    corrupt: (raw: string) => {
      data = raw;
    },
  };
}
const request = (amount = 575, id = 'request-1') => ({
  requestId: id,
  quote: createDemoQuote(String(amount), 1000, 'sui', recipient),
  cardId,
  scannedBalanceJpy: 1000,
  confirmedCardId: cardId,
  confirmedBalanceJpy: 1000,
});
test('persists receipts across ledger instances and preserves a separate demo allowance', async () => {
  const { ledger, storage } = fixture();
  const receipt = await ledger.record(request());
  expect(receipt).toMatchObject({
    id: 'GM-000001',
    status: 'simulated',
    remainingDemoJpy: 425,
    scannedBalanceJpy: 1000,
  });
  const restored = await createDemoLedger(storage).list();
  expect(restored).toEqual([receipt]);
  expect(availableDemoBalance(restored, cardId.toUpperCase(), 1000)).toBe(425);
  expect(availableDemoBalance(restored, cardId, 2000)).toBe(425);
  expect(availableDemoBalance(restored, cardId, 200)).toBe(200);
  expect(availableDemoBalance(restored, '1123456789abcdef', 1000)).toBe(1000);
});
test('concurrent retries of the same request produce one receipt and one debit', async () => {
  const { ledger, storage } = fixture();
  const [a, b] = await Promise.all([
    ledger.record(request()),
    ledger.record(request()),
  ]);
  expect(a).toEqual(b);
  expect(storage.setItem).toHaveBeenCalledTimes(1);
  expect(await ledger.list()).toHaveLength(1);
});
test('serializes different requests and prevents overspending across networks', async () => {
  const { ledger } = fixture();
  const second = {
    ...request(600, 'request-2'),
    quote: createDemoQuote('600', 1000, 'ethereum', `0x${'2'.repeat(40)}`),
  };
  const result = await Promise.allSettled([
    ledger.record(request(600)),
    ledger.record(second),
  ]);
  expect(result.map(r => r.status)).toEqual(['fulfilled', 'rejected']);
  expect(availableDemoBalance(await ledger.list(), cardId, 1000)).toBe(400);
});
test('rejects the wrong card, changed balances and tampered quotes before writing', async () => {
  const { ledger, storage } = fixture();
  await expect(
    ledger.record({ ...request(), confirmedCardId: '1123456789abcdef' }),
  ).rejects.toThrow('different card');
  await expect(
    ledger.record({ ...request(), confirmedBalanceJpy: 999 }),
  ).rejects.toThrow('balance changed');
  await expect(
    ledger.record({ ...request(), quote: { ...request().quote, feeJpy: 0 } }),
  ).rejects.toThrow('quote changed');
  expect(storage.setItem).not.toHaveBeenCalled();
});
test('a failed write does not consume the allowance and can be retried', async () => {
  const { ledger, storage } = fixture();
  storage.setItem.mockRejectedValueOnce(Error('disk full'));
  await expect(ledger.record(request())).rejects.toThrow('Could not save');
  expect(await ledger.list()).toEqual([]);
  await expect(ledger.record(request())).resolves.toMatchObject({
    remainingDemoJpy: 425,
  });
});
test('a persisted write with an ambiguous response is recovered without a duplicate', async () => {
  const { ledger, storage, corrupt } = fixture();
  storage.setItem.mockImplementationOnce(async (_key, value) => {
    corrupt(value);
    throw Error('response lost');
  });
  await expect(ledger.record(request())).rejects.toThrow();
  await expect(ledger.record(request())).resolves.toMatchObject({
    id: 'GM-000001',
  });
  expect(storage.setItem).toHaveBeenCalledTimes(1);
});
test('unreadable storage fails closed rather than resetting previous refunds', async () => {
  const { ledger, storage, corrupt } = fixture();
  corrupt('broken json');
  await expect(ledger.list()).rejects.toThrow('unreadable');
  await expect(ledger.record(request())).rejects.toThrow('unreadable');
  expect(storage.setItem).not.toHaveBeenCalled();
  storage.getItem.mockRejectedValueOnce(Error('storage offline'));
  await expect(ledger.list()).rejects.toThrow('Could not read');
});
test('rejects duplicate request ids with different inputs and altered persisted balances', async () => {
  const { ledger, corrupt } = fixture();
  const r = await ledger.record(request());
  await expect(ledger.record(request(100))).rejects.toThrow('different quote');
  corrupt(
    JSON.stringify({
      version: 1,
      receipts: [{ ...r, remainingDemoJpy: 1000 }],
    }),
  );
  await expect(ledger.list()).rejects.toThrow('unreadable');
  expect(LEDGER_KEY).toBe('unsui.demo-refunds.v1');
});

test('legacy DEMO receipts remain readable and retries keep their reference', async () => {
  const { ledger, corrupt } = fixture();
  const receipt = await ledger.record(request());
  corrupt(
    JSON.stringify({
      version: 1,
      receipts: [{ ...receipt, id: 'DEMO-000001' }],
    }),
  );
  expect((await ledger.list())[0].id).toBe('DEMO-000001');
  expect((await ledger.record(request())).id).toBe('DEMO-000001');
});
