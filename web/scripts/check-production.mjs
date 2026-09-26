// Read-only deployment checks. No orders, transfers, or layout mutations.
import assert from 'node:assert/strict';
const base = process.argv[2];
if (!base || !/^https?:\/\//.test(base)) throw Error('Usage: node scripts/check-production.mjs https://deployment.example');
async function check(path, options, statuses) {
  const response = await fetch(new URL(path, base), { ...options, signal: AbortSignal.timeout(20000) });
  assert.ok(response.headers.get('content-type')?.includes('application/json'), `${path}: expected JSON, received ${response.status} ${response.headers.get('content-type')}`);
  assert.ok(statuses.includes(response.status), `${path}: unexpected HTTP ${response.status}`);
  console.log(`PASS ${options?.method || 'GET'} ${path}: ${response.status}`);
  return response.json();
}
const post = (body, token) => ({ method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body) });
await check('/api/auth/session', {}, [401]);
await check('/api/operations', {}, [401]);
await check('/api/operations/agent', post({}), [401]);
await check('/api/auth/password', post({ email: 'invalid@example.com', password: 'invalid' }), [401]);
// The public demo entry is part of this dashboard; tokens stay in memory.
const session = await check('/api/auth/demo', post({}), [200]);
assert.ok(session.token, 'Demo login must return a session');
await check('/api/auth/session', { headers: { Authorization: 'Bearer ' + session.token } }, [200]);
const feed = await check('/api/operations', { headers: { Authorization: 'Bearer ' + session.token } }, [200, 503]);
if (feed.error) console.warn(`DATA CONNECTION: ${feed.error}`);
else assert.ok(Array.isArray(feed.records), 'Operations records must be an array');
// Empty input must be rejected locally before spending an inference request.
const invalid = await check('/api/operations/agent', post({ message: '' }, session.token), [400]);
assert.match(invalid.error, /message/i);
console.log('Production route smoke checks passed. Live ledger connectivity is reported separately above.');
