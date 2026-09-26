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

test('hosted rounds preserve history and reject pending resets and archived request replays', async () => {
  const flag = process.env.ALLOW_HOSTED_HACKATHON_RESET;
  process.env.ALLOW_HOSTED_HACKATHON_RESET = 'true';
  try {
    const values = new Map(), docs = new Map(), orders = new Map();
    let pending = null;
    const scopes = [], rounds = [];
    const store = {
      coordinate: work => work({ get: async key => values.get(key), set: async (key, value) => values.set(key, structuredClone(value)) }),
      pending: async () => pending,
      read: async (_, key) => docs.has(key) ? { value: docs.get(key) } : null,
      write: async (_, key, value) => docs.set(key, value),
      reserve: async ({ requestId, cardScope }) => { scopes.push(cardScope); return orders.get(requestId) || {}; },
      complete: async (id, _, result) => { orders.set(id, { result }); return result; },
    };
    const input = {
      requestId: 'round-one', cardId: '0123456789abcdef', confirmedCardId: '0123456789abcdef',
      scannedBalanceJpy: 70, confirmedBalanceJpy: 70,
      quote: createDemoQuote('70', 70, 'ethereum', '0x1111111111111111111111111111111111111111'),
    };
    const dependencies = { store, clients: { ethereum: { pay: async input => {
      rounds.push(input.demoRound);
      return { status: 'confirmed', transactionDigest: '0x' + String(rounds.length).repeat(64), chainReceiptId: '0x' + '2'.repeat(64), chainNetwork: 'mainnet', amountWei: String(70n * 1960000000000n) };
    } } } };
    const call = (method, url, body) => handle({ method, url, headers: {}, body: body && JSON.stringify(body) }, dependencies);
    const reset = () => call('POST', '/ledger/reset', { confirm: 'reset-demo-ledger' });
    assert.equal(JSON.parse((await call('GET', '/health')).body).canReset, true);
    assert.equal((await call('POST', '/refunds', input)).status, 200);
    assert.equal((await call('POST', '/ledger/reset', {})).status, 400);
    pending = 'unfinished';
    assert.equal((await reset()).status, 409);
    assert.equal(values.has('round'), false);
    pending = null;
    values.set('world-sessions', [['stale-proof', {}]]);
    assert.equal((await reset()).status, 200);
    assert.deepEqual(values.get('world-sessions'), []);
    assert.equal(JSON.parse((await call('GET', '/ledger')).body).receipts.length, 0);
    assert.equal((await call('POST', '/refunds', input)).status, 409);
    assert.equal(rounds.length, 1);
    const second = { ...input, requestId: 'round-two' };
    const result = await call('POST', '/refunds', second);
    assert.equal(result.status, 200);
    assert.equal(JSON.parse(result.body).receipt.id, 'GM-000002');
    assert.equal((await call('POST', '/refunds', second)).status, 200);
    assert.equal(rounds.length, 2);
    assert.notEqual(scopes[0], scopes[1]);
    assert.notEqual(rounds[0], rounds[1]);
    assert.equal(orders.size, 2);
    assert.equal((await reset()).status, 200);
    assert.equal(JSON.parse((await call('GET', '/dashboard-feed')).body).records.length, 2);
    assert.equal(values.get('ledger-rounds').length, 2);
    process.env.ALLOW_HOSTED_HACKATHON_RESET = 'false';
    assert.equal((await reset()).status, 404);
    assert.equal(JSON.parse((await call('GET', '/health')).body).canReset, false);
  } finally {
    if (flag === undefined) delete process.env.ALLOW_HOSTED_HACKATHON_RESET;
    else process.env.ALLOW_HOSTED_HACKATHON_RESET = flag;
  }
});
