const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Pool } = require('pg');
const { createPostgresStore } = require('../storage/postgres.cjs');

test('Postgres persists retries and prevents concurrent overwrites', {
  skip: !process.env.TEST_DATABASE_URL,
}, async () => {
  const connectionString = process.env.TEST_DATABASE_URL;
  const first = createPostgresStore({ connectionString });
  const second = createPostgresStore({ connectionString });
  const scope = 'test:' + randomUUID();
  const requestId = scope + ':request';
  const cleanup = new Pool({ connectionString });
  try {
    await first.migrate();
    const writes = await Promise.allSettled([
      first.write(scope, 'ledger', { receipts: [1] }),
      second.write(scope, 'ledger', { receipts: [2] }),
    ]);
    assert.equal(writes.filter(x => x.status === 'fulfilled').length, 1);
    const saved = await second.read(scope, 'ledger');
    await first.write(scope, 'ledger', { receipts: [3] }, saved.version);
    await assert.rejects(second.write(scope, 'ledger', { receipts: [4] }, saved.version));
    assert.deepEqual((await second.read(scope, 'ledger')).value, { receipts: [3] });
    const reservation = { requestId, cardScope: scope, binding: 'binding', input: { amount: 70 } };
    const reserved = await Promise.all([first.reserve(reservation), second.reserve(reservation)]);
    assert.equal(reserved[0].request_id, reserved[1].request_id);
    await assert.rejects(second.reserve({ ...reservation, requestId: scope + ':other' }));
    await assert.rejects(second.reserve({ ...reservation, binding: 'different' }));
    const result = { digest: 'test-transaction' };
    await first.complete(requestId, 'binding', result);
    assert.deepEqual((await second.reserve(reservation)).result, result);
    await assert.rejects(second.complete(requestId, 'binding', { digest: 'different' }));
    const a = first.journal(scope), b = second.journal(scope);
    await a.put('tx', { raw: 'test-only', hash: 'hash' });
    await b.put('tx', { hash: 'hash', raw: 'test-only' });
    await assert.rejects(b.put('tx', { raw: 'other', hash: 'other' }));
    assert.equal((await b.get('tx')).raw, 'test-only');
  } finally {
    await cleanup.query('DELETE FROM unsui_documents WHERE namespace = $1', [scope]);
    await cleanup.query('DELETE FROM unsui_payout_requests WHERE card_scope = $1', [scope]);
    await Promise.all([first.close(), second.close(), cleanup.end()]);
  }
});
