const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { prepareStations, REVISION } = require('./prepare-stations.cjs');

async function workspace(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'unsui-stations-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}
const log = () => {};
const readLookup = root =>
  fs
    .readFile(path.join(root, 'src/generated/stationCodes.json'), 'utf8')
    .then(JSON.parse);

test('a fresh offline build generates the small Tokyo fallback without a request', async t => {
  const root = await workspace(t);
  const result = await prepareStations({
    root,
    offline: true,
    log,
    fetchImpl: () => {
      throw Error('unexpected request');
    },
  });
  assert.equal(result.source, 'fallback');
  const lookup = await readLookup(root);
  assert.equal(Object.keys(lookup).length, 22);
  assert.equal(lookup['227_62'].s, '渋谷');
  assert.equal(lookup['227_56'].s, '虎ノ門');
  assert.equal(lookup['227_44'].s, '浅草');
  assert.equal(lookup['2_3'].s, '秋葉原');
});

test('download failure replaces stale output with a valid fallback', async t => {
  const root = await workspace(t);
  await fs.mkdir(path.join(root, 'src/generated'), { recursive: true });
  await fs.writeFile(
    path.join(root, 'src/generated/stationCodes.json'),
    'stale',
  );
  const result = await prepareStations({
    root,
    log,
    fetchImpl: async () => {
      throw Error('offline');
    },
  });
  assert.equal(result.source, 'fallback');
  assert.equal((await readLookup(root))['37_10'].s, '新宿');
});

test('rejects corrupted cache and unverified downloaded data', async t => {
  const root = await workspace(t);
  await fs.mkdir(path.join(root, '.cache/stations'), { recursive: true });
  await fs.writeFile(
    path.join(root, '.cache/stations', `${REVISION}.csv`),
    'corrupt',
  );
  let requests = 0;
  const result = await prepareStations({
    root,
    log,
    fetchImpl: async () => {
      requests++;
      return { ok: true, arrayBuffer: async () => Buffer.from('tampered') };
    },
  });
  assert.equal(requests, 1);
  assert.equal(result.source, 'fallback');
  assert.equal(Object.keys(await readLookup(root)).length, 22);
});
