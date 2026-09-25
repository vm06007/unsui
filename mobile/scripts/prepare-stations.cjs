const { createHash } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const fallback = require('../src/lib/stationCodes.fallback.json');

const REVISION = 'e550c704890ba66149fcbb5f78ce15e66bc2ef60';
const SHA256 =
  '9356b386afe0acba5b655a0acd69f34e53df236d9ed8909c6e3f124c776b5957';
const URL = `https://raw.githubusercontent.com/m2wasabi/nfcpy-suica-sample/${REVISION}/StationCode.csv`;
const ROOT = path.resolve(__dirname, '..');

function decodeSource(bytes) {
  if (createHash('sha256').update(bytes).digest('hex') !== SHA256) {
    throw Error('Station source checksum mismatch');
  }
  const stations = {};
  // This pinned CSV has six unquoted fields per row, in decimal code notation.
  for (const row of bytes.toString('utf8').trim().split(/\r?\n/)) {
    const fields = row.split(',');
    if (
      fields.length !== 6 ||
      !fields.slice(0, 3).every(n => /^\d+$/.test(n))
    ) {
      throw Error('Invalid station source row');
    }
    const [region, line, station, c, l, s] = fields;
    const key = `${Number(line)}_${Number(station)}`;
    if (!stations[key] || Number(region) === 0) stations[key] = { c, l, s };
  }
  return stations;
}

async function atomicWrite(file, bytes) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${Math.random()
    .toString(36)
    .slice(2)}.tmp`;
  try {
    await fs.writeFile(temp, bytes);
    await fs.rename(temp, file);
  } finally {
    await fs.rm(temp, { force: true });
  }
}

async function prepareStations({
  root = ROOT,
  offline = false,
  fetchImpl = fetch,
  log = console.log,
} = {}) {
  const cache = path.join(root, '.cache/stations', `${REVISION}.csv`);
  const output = path.join(root, 'src/generated/stationCodes.json');
  let stations;
  let source = 'cache';
  try {
    stations = decodeSource(await fs.readFile(cache));
  } catch {
    if (!offline) {
      try {
        const response = await fetchImpl(URL, {
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) throw Error(`HTTP ${response.status}`);
        const bytes = Buffer.from(await response.arrayBuffer());
        stations = decodeSource(bytes);
        source = 'download';
        await atomicWrite(cache, bytes);
      } catch (error) {
        log(`[stations] Full lookup unavailable: ${error.message}`);
      }
    }
  }
  if (!stations) {
    stations = fallback;
    source = 'fallback';
  }
  const json = JSON.stringify(stations) + '\n';
  // Avoid touching the generated file and triggering Metro reloads unnecessarily.
  if ((await fs.readFile(output, 'utf8').catch(() => '')) !== json) {
    await atomicWrite(output, json);
  }
  log(`[stations] ${Object.keys(stations).length} entries (${source}).`);
  return { source, count: Object.keys(stations).length };
}

module.exports = { prepareStations, decodeSource, REVISION };
if (require.main === module) {
  prepareStations({ offline: process.argv.includes('--offline') }).catch(
    error => {
      console.error(error);
      process.exitCode = 1;
    },
  );
}
