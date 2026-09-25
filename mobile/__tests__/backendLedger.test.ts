import {
  recordBackend,
  listBackend,
  checkBackend,
} from '../src/lib/backendLedger';
import { createDemoQuote } from '../src/lib/refundQuote';
const originalFetch = globalThis.fetch;
const fetchMock = jest.fn();
const cardId = '0123456789abcdef';
const input = {
  requestId: 'first-attempt',
  cardId,
  scannedBalanceJpy: 1500,
  confirmedCardId: cardId,
  confirmedBalanceJpy: 1500,
  quote: createDemoQuote('500', 1500, 'sui', `0x${'1'.repeat(64)}`),
};
const receipt = {
  ...input.quote,
  id: 'DEMO-000001',
  requestId: input.requestId,
  cardId,
  scannedBalanceJpy: 1500,
  remainingDemoJpy: 1000,
  createdAt: '2026-09-25T12:00:00Z',
  status: 'simulated',
};
const ok = (data: unknown) => ({ ok: true, json: async () => data });
beforeEach(() => {
  globalThis.fetch = fetchMock;
  fetchMock.mockReset();
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});
test('lost responses retry the same request ID instead of making a new debit', async () => {
  fetchMock.mockRejectedValueOnce(Error('Connection lost'));
  await expect(recordBackend('http://localhost:4100', input)).rejects.toThrow(
    'Connection lost',
  );
  fetchMock
    .mockResolvedValueOnce(ok({ receipt }))
    .mockResolvedValueOnce(ok({ version: 1, receipts: [receipt] }));
  await expect(
    recordBackend('http://localhost:4100', {
      ...input,
      requestId: 'new-screen-attempt',
    }),
  ).resolves.toEqual(receipt);
  expect(JSON.parse(fetchMock.mock.calls[1][1].body).requestId).toBe(
    'first-attempt',
  );
});
test('unavailable or corrupt backend never becomes an empty local ledger', async () => {
  fetchMock.mockRejectedValueOnce(Error('Offline'));
  await expect(listBackend('http://localhost:4100')).rejects.toThrow('Offline');
  fetchMock.mockResolvedValueOnce(
    ok({ version: 1, receipts: [{ ...receipt, remainingDemoJpy: 9999 }] }),
  );
  await expect(listBackend('http://localhost:4100')).rejects.toThrow(
    'unreadable',
  );
});
test('connection check rejects a different service', async () => {
  fetchMock.mockResolvedValueOnce(ok({ service: 'another-api', version: 1 }));
  await expect(checkBackend('http://localhost:4100')).rejects.toThrow(
    'compatible',
  );
});
