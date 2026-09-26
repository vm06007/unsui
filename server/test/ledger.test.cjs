const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createServer } = require('../server.cjs');
const { createDemoQuote } = require('../build/refundQuote');

async function fixture(
  t,
  options = {}
) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'unsui-ledger-'));
  const file = path.join(dir, 'ledger.json');
  let server;
  const start = async () => {
    server = createServer({ file, ...options });
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    return `http://127.0.0.1:${server.address().port}`;
  };
  const stop = () => new Promise(r => server.close(r));
  t.after(async () => {
    if (server.listening) await stop();
    await fs.rm(dir, { recursive: true, force: true });
  });
  return { url: await start(), start, stop, file };
}
const input = (
  requestId = 'test-1',
  amount = 1000
) => ({
  requestId,
  cardId: '0123456789abcdef',
  scannedBalanceJpy: 1500,
  confirmedCardId: '0123456789abcdef',
  confirmedBalanceJpy: 1500,
  quote: createDemoQuote(String(amount), 1500, 'sui', `0x${'1'.repeat(64)}`),
});
const post = (
  url,
  body
) =>
  fetch(url + '/refunds', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
test('receipts survive restart, retries are idempotent and merchant feed omits private fields', async t => {
  const f = await fixture(t);
  const first = await (await post(f.url, input())).json();
  assert.equal(first.receipt.remainingDemoJpy, 500);
  assert.deepEqual(await (await post(f.url, input())).json(), first);
  await f.stop();
  f.url = await f.start();
  assert.equal(
    (await (await fetch(f.url + '/ledger')).json()).receipts.length,
    1,
  );
  const feed = await (await fetch(f.url + '/merchant-feed')).json();
  assert.equal(feed.records[0].amount, 1000);
  assert.equal(feed.records[0].feeJpy, 20);
  assert.equal(feed.records[0].cryptoAmount, 0.098);
  assert.equal(feed.records[0].mode, 'demo');
  assert.equal(feed.records[0].digest, null);
  assert.equal('recipient' in feed.records[0], false);
  assert.equal('cardId' in feed.records[0], false);
});
test('concurrent refunds cannot overspend and changed quotes/re-scan are rejected', async t => {
  const f = await fixture(t);
  const results = await Promise.all([
    post(f.url, input('a')),
    post(f.url, input('b')),
  ]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 400]);
  const records = (await (await fetch(f.url + '/ledger')).json()).receipts;
  assert.equal(records.length, 1);
  const altered = input(records[0].requestId, 500);
  assert.equal((await post(f.url, altered)).status, 400);
  assert.equal(
    (
      await post(f.url, {
        ...input('c', 500),
        confirmedCardId: 'aaaaaaaaaaaaaaaa',
      })
    ).status,
    400,
  );
  assert.equal(
    (await post(f.url, { ...input('d', 500), confirmedBalanceJpy: 1000 }))
      .status,
    400,
  );
  const quote = input('e', 500);
  quote.quote.feeJpy = 0;
  assert.equal((await post(f.url, quote)).status, 400);
});
test('corrupt storage blocks new refunds and unknown origins cannot read records', async t => {
  const f = await fixture(t);
  await fs.writeFile(f.file, 'not json');
  assert.equal((await post(f.url, input())).status, 400);
  assert.equal(await fs.readFile(f.file, 'utf8'), 'not json');
  assert.equal(
    (
      await fetch(f.url + '/ledger', {
        headers: { Origin: 'https://example.com' },
      })
    ).status,
    403,
  );
  assert.equal(
    (await fetch(f.url + '/ledger', { headers: { Origin: 'null' } })).status,
    403,
  );
});

test('merchant extension can read the feed and no other route', async t => {
  const f = await fixture(t);
  await post(f.url, input());
  const origin = 'chrome-extension://abcdefghijklmnopabcdefghijklmnop';
  const feed = await fetch(f.url + '/merchant-feed', {
    headers: { Origin: origin },
  });
  assert.equal(feed.status, 200);
  assert.equal(feed.headers.get('access-control-allow-origin'), origin);
  assert.equal((await feed.json()).records[0].amount, 1000);
  assert.equal(
    (await fetch(f.url + '/ledger', { headers: { Origin: origin } })).status,
    403,
  );
  assert.equal(
    (
      await fetch(f.url + '/refunds', {
        method: 'POST',
        headers: { Origin: origin, 'Content-Type': 'application/json' },
        body: '{}',
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(f.url + '/merchant-feed', {
        headers: { Origin: 'chrome-extension://not-a-valid-id' },
      })
    ).status,
    403,
  );
});

test('development reset clears shared receipts and restores allowance durably', async t => {
  const f = await fixture(t);
  await post(f.url, input());
  const reset = await fetch(f.url + '/ledger/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirm: 'reset-demo-ledger' }),
  });
  assert.equal(reset.status, 200);
  assert.equal(
    (await (await fetch(f.url + '/ledger')).json()).receipts.length,
    0,
  );
  assert.equal(
    (await (await fetch(f.url + '/merchant-feed')).json()).records.length,
    0,
  );
  await f.stop();
  f.url = await f.start();
  assert.equal(
    (await (await fetch(f.url + '/ledger')).json()).receipts.length,
    0,
  );
  assert.equal((await post(f.url, input('after-reset', 1000))).status, 200);
});

test('reset is unavailable when disabled', async t => {
  const f = await fixture(t, { allowReset: false });
  await post(f.url, input());
  const response = await fetch(f.url + '/ledger/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirm: 'reset-demo-ledger' }),
  });
  assert.equal(response.status, 403);
  assert.equal(
    (await (await fetch(f.url + '/ledger')).json()).receipts.length,
    1,
  );
});

test('refund endpoint enforces World ID above 1000 yen', async t => {
  const f = await fixture(t);
  assert.equal((await post(f.url, input('large', 1001))).status, 403);
  assert.equal(
    (
      await post(f.url, {
        ...input('forged', 1001),
        worldVerificationId: 'forged',
      })
    ).status,
    403,
  );
  assert.equal(
    (await (await fetch(f.url + '/ledger')).json()).receipts.length,
    0,
  );
  assert.equal((await post(f.url, input('boundary', 1000))).status, 200);
});
test('verified request reaches ledger and persisted retries do not consume another proof', async t => {
  let uses = 0;
  const f = await fixture(t, {
    worldId: {
      status() {
        return { status: 'verified' };
      },
      allows(body) {
        uses++;
        return (
          body.worldVerificationId === 'approved' && body.amountJpy === 1112
        );
      },
    },
  });
  const body = { ...input('verified', 1112), worldVerificationId: 'approved' };
  assert.equal((await post(f.url, body)).status, 200);
  assert.equal((await post(f.url, body)).status, 200);
  assert.equal(uses, 1);
  assert.equal(
    (await post(f.url, { ...body, quote: { ...body.quote, amountJpy: 1200 } }))
      .status,
    400,
  );
});
test('test bypass audit is server-owned and survives retries and restart', async t => {
  const f = await fixture(t, {
    worldId: {
      status() {
        return { status: 'bypassed' };
      },
      allows() {
        return true;
      },
    },
  });
  const body = { ...input('bypass', 1112), humanCheck: 'verified' };
  const first = await (await post(f.url, body)).json();
  assert.equal(first.receipt.humanCheck, 'bypassed');
  await f.stop();
  f.url = await f.start();
  assert.equal(
    (await (await post(f.url, body)).json()).receipt.humanCheck,
    'bypassed',
  );
});

test('live reset preserves prior receipts and starts a durable new card round', async t => {
  const rounds = [];
  const f = await fixture(t, {
    allowLiveReset: true,
    liveClient: {
      pay: async i => {
        rounds.push(i.demoRound);
        return {
          status: 'confirmed',
          transactionDigest: '1'.repeat(43),
          chainReceiptId: '0x' + '2'.repeat(64),
          chainNetwork: 'mainnet',
          amountMist: String(i.quote.amountJpy * 98000),
        };
      },
    },
  });
  assert.equal((await post(f.url, input())).status, 200);
  const reset = await fetch(f.url + '/ledger/reset', {
    method: 'POST',
    body: JSON.stringify({ confirm: 'reset-demo-ledger' }),
  });
  assert.equal(reset.status, 200);
  assert.equal(
    (await (await fetch(f.url + '/ledger')).json()).receipts.length,
    0,
  );
  assert.equal(
    JSON.parse(await fs.readFile(f.file, 'utf8')).receipts.length,
    1,
  );
  await f.stop();
  f.url = await f.start();
  assert.equal((await post(f.url, input())).status, 200);
  assert.equal(rounds[0], null);
  assert.match(rounds[1], /^[0-9a-f-]{36}$/);
});
test('live reset refuses an unresolved payout', async t => {
  const f = await fixture(t, {
    allowLiveReset: true,
    liveClient: {
      pay: async () => {
        throw Error('Unknown outcome');
      },
    },
  });
  assert.equal((await post(f.url, input())).status, 400);
  const reset = await fetch(f.url + '/ledger/reset', {
    method: 'POST',
    body: JSON.stringify({ confirm: 'reset-demo-ledger' }),
  });
  assert.equal(reset.status, 400);
  assert.match((await reset.json()).error, /pending payout/);
});

test('MultiBaas feed exposes the configured SDK snapshot', async t => {
  const snapshot = { status: 'awaiting-contract', chainId: 6497, records: [] };
  const { url } = await fixture(t, {
    multibaasFeed: { snapshot: async () => snapshot },
  });
  const response = await fetch(url + '/multibaas-feed');
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), snapshot);
});
