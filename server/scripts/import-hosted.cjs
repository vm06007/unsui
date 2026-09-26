const fs = require('node:fs/promises');
const path = require('node:path');
const { createPostgresStore } = require('../storage/postgres.cjs');
const { decodeDemoReceipts } = require('../build/demoLedger.js');
async function optional(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch (e) { if (e.code === 'ENOENT') return fallback; throw e; }
}
(async () => {
  process.loadEnvFile(path.resolve(__dirname, '../.env'));
  process.loadEnvFile(path.resolve(__dirname, '../.env.database.local'));
  const base = process.env.LEDGER_FILE;
  if (!base) throw Error('Explicit LEDGER_FILE required');
  const round = (await optional(base + '.round', {})).round || null;
  const file = round ? base + '.round-' + round : base;
  const orders = await optional(file + '.orders', {});
  if (Object.values(orders).some(order => !order.result)) throw Error('Resolve local pending payouts before importing');
  const ledger = await optional(file, { version: 1, receipts: [] });
  decodeDemoReceipts(JSON.stringify(ledger));
  const store = createPostgresStore();
  try {
    await store.migrate();
    for (const dir of ['ethereum-transactions', 'awaji-transactions']) {
      const folder = path.join(path.dirname(base), dir);
      let files;
      try { files = await fs.readdir(folder); } catch (e) { if (e.code === 'ENOENT') continue; throw e; }
      for (const name of files.filter(name => /^[a-f0-9]{64}\.json$/.test(name)))
        await store.journal(dir).put(name.slice(0, -5), await optional(path.join(folder, name)));
    }
    await store.coordinate(async state => {
      if (await state.get('ledger')) throw Error('Hosted ledger already initialized; refusing to overwrite');
      await state.set('round', round);
      await state.set('ledger', ledger);
    });
    console.log(`Imported ${ledger.receipts.length} receipts and the existing round; transaction journals copied.`);
  } finally { await store.close(); }
})().catch(error => { console.error(error.code || error.message); process.exitCode = 1; });
