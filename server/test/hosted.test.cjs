const { test } = require('node:test');
const assert = require('node:assert/strict');
const { handle } = require('../hosted.cjs');
const { createDemoQuote } = require('../build/refundQuote.js');

test('hosted refunds allow arbitrary valid destinations and persist retries', async () => {
  const values = new Map(), docs = new Map(), orders = new Map();
  let payouts = 0;
  const store = {
    coordinate: work => work({ get: async key => values.get(key), set: async (key, value) => values.set(key, value) }),
    pending: async () => null,
    read: async (_, key) => docs.has(key) ? { value: docs.get(key) } : null,
    write: async (_, key, value) => docs.set(key, value),
    reserve: async ({ requestId }) => orders.get(requestId) || {},
    complete: async (id, _, result) => { orders.set(id, { result }); return result; },
  };
  const input = {
    requestId: 'hosted-test', cardId: '0123456789abcdef', confirmedCardId: '0123456789abcdef',
    scannedBalanceJpy: 70, confirmedBalanceJpy: 70,
    quote: createDemoQuote('70', 70, 'ethereum', '0x1111111111111111111111111111111111111111'),
  };
  const result = { status: 'confirmed', transactionDigest: '0x' + '1'.repeat(64), chainReceiptId: '0x' + '2'.repeat(64), chainNetwork: 'mainnet', amountWei: String(70n * 1960000000000n) };
  const dependencies = { store, clients: { ethereum: { pay: async () => { payouts++; return result; } } } };
  const send = body => handle({ method: 'POST', url: '/refunds', headers: {}, body: JSON.stringify(body) }, dependencies);
  assert.equal((await send(input)).status, 200);
  assert.equal((await send(input)).status, 200);
  assert.equal(payouts, 1);
  assert.equal((await send({ ...input, requestId: 'another' })).status, 400);
  assert.equal(payouts, 1);
  const list = await handle({ method: 'GET', url: '/ledger', headers: {} }, dependencies);
  assert.equal(JSON.parse(list.body).receipts.length, 1);
  assert.equal((await handle({ method: 'POST', url: '/ledger/reset', headers: {} }, dependencies)).status, 404);
});
