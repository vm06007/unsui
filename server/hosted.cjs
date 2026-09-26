const { Readable } = require('node:stream');
const { createHash } = require('node:crypto');
const { createServer, binding, operationRecord } = require('./server.cjs');
const { createDemoLedger } = require('./build/demoLedger.js');
const { createWorldId } = require('./world-id.cjs');
const { createPostgresStore } = require('./storage/postgres.cjs');

let runtime;
async function setup() {
  const store = createPostgresStore();
  const clients = {};
  const secret = process.env.CARD_COMMITMENT_SECRET;
  const marketQuotes = require('./market-quotes.cjs').createMarketQuotes({ secret });
  if (process.env.SUI_LIVE_PAYOUTS === 'true') {
    const { Ed25519Keypair } = await import('@mysten/sui/keypairs/ed25519');
    const { createSuiPayoutClient } = await import('./sui/client.mjs');
    clients.sui = createSuiPayoutClient({
      deployment: require('../contracts/deployments/sui-mainnet.json'),
      secret, marketQuotes,
      signer: Ed25519Keypair.fromSecretKey(process.env.SUI_OPERATOR_PRIVATE_KEY),
      journal: store.journal('sui-transactions'),
    });
  }
  if (process.env.ETHEREUM_LIVE_PAYOUTS === 'true') {
    const { createEthereumPayoutClient } = await import('./evm/client.mjs');
    clients.ethereum = createEthereumPayoutClient({
      deployment: require('../contracts/deployments/ethereum-mainnet.json'),
      secret, privateKey: process.env.EVM_DEPLOYER_PRIVATE_KEY,
      rpcUrl: process.env.ETHEREUM_RPC_URL, journal: store.journal('ethereum-transactions'),
    });
  }
  if (process.env.AWAJI_LIVE_PAYOUTS === 'true') {
    const { createAwajiPayoutClient } = await import('./evm/awaji.mjs');
    clients.mizuhiki = createAwajiPayoutClient({
      deployment: require('../contracts/deployments/awaji-mjpy.json'),
      secret, privateKey: process.env.EVM_DEPLOYER_PRIVATE_KEY,
      journal: store.journal('awaji-transactions'),
    });
  }
  return { store, clients, marketQuotes };
}

// Adapt the existing local HTTP contract; send the response only after DB commit.
async function invoke(server, method, url, headers, body) {
  const req = Readable.from(body ? [body] : []);
  Object.assign(req, { method, url, headers });
  const responseHeaders = {};
  return new Promise((resolve, reject) => {
    const res = {
      setHeader(name, value) { responseHeaders[name] = value; },
      writeHead(status) { this.status = status; },
      end(value) { resolve({ status: this.status || 200, headers: responseHeaders, body: value }); },
    };
    Promise.resolve(server.listeners('request')[0](req, res)).catch(reject);
  });
}

async function handle({ method, url, headers, body }, dependencies) {
  const { store, clients, marketQuotes } = dependencies;
  const path = new URL(url, 'https://unsui.ca').pathname;
  const allowed = /^\/(health|ledger|merchant-feed|dashboard-feed|refunds|quotes\/sui|sui\/resolve-name|ens\/resolve-name|world\/(start|status|cancel|public\/(request|complete|cancel|bypass)))$/;
  if (!allowed.test(path)) return { status: 404, body: JSON.stringify({ error: 'Not found' }) };
  return store.coordinate(async state => {
    const sessions = new Map(await state.get('world-sessions') || []);
    const worldId = createWorldId(process.env, { sessions });
    const round = await state.get('round');
    const ledger = createDemoLedger({
      async getItem() { const value = await state.get('ledger'); return value ? JSON.stringify(value) : null; },
      async setItem(_key, value) { await state.set('ledger', JSON.parse(value)); },
    }, async input => {
      const client = clients[input.quote.network];
      if (!client || input.cardId.toLowerCase() === 'ffffffffffffffff') throw Error('Select an enabled network and scan a physical card.');
      const id = round ? `${round}:${input.requestId}` : input.requestId;
      const pending = await store.pending();
      if (pending && pending !== id) throw Error('An earlier payout needs confirmation. Retry its original request first.');
      const fingerprint = createHash('sha256').update(JSON.stringify([input.cardId.toLowerCase(), input.scannedBalanceJpy, input.quote])).digest('hex');
      // Preserve the local card commitment and round when importing the ledger.
      const existing = await store.read('authorizations', id);
      if (!existing) {
        if (!worldId.allows({ ...binding(input), worldVerificationId: input.worldVerificationId }))
          throw Error('Refunds above ¥1,000 require a completed World ID check.');
        await client.preflight?.({ ...input, demoRound: round });
        await store.write('authorizations', id, { fingerprint });
      } else if (existing.value.fingerprint !== fingerprint) throw Error('Request belongs to a different payout');
      const reservation = await store.reserve({ requestId: id, cardScope: `${round || 'initial'}:${input.cardId.toLowerCase()}`, binding: fingerprint, input });
      if (reservation.result) return reservation.result;
      const result = await client.pay({ ...input, demoRound: round });
      if (result.status !== 'confirmed' || !result.transactionDigest) throw Error('Payout is not confirmed yet. Retry the same request.');
      return store.complete(id, fingerprint, result);
    });
    if (method === 'GET' && path === '/dashboard-feed') {
      return { status: 200, body: JSON.stringify({ records: (await ledger.list()).map(operationRecord).reverse() }) };
    }
    const server = createServer({
      ledger, worldId, marketQuotes, allowReset: false,
      liveClient: { networks: Object.keys(clients) },
    });
    const result = await invoke(server, method, path, headers, body);
    await state.set('world-sessions', [...sessions]);
    return result;
  });
}

async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  try {
    let raw = '';
    for await (const chunk of req) {
      raw += chunk;
      if (Buffer.byteLength(raw) > 65536) { res.statusCode = 413; res.end(JSON.stringify({ error: 'Request too large' })); return; }
    }
    runtime ||= setup().catch(error => { runtime = null; throw error; });
    const result = await handle({ method: req.method, url: req.url.replace(/^\/api\/mobile/, ''), headers: req.headers, body: raw }, await runtime);
    res.statusCode = result.status;
    for (const [name, value] of Object.entries(result.headers || {})) res.setHeader(name, value);
    res.end(result.body);
  } catch (error) {
    res.statusCode = 503;
    // Never include connection errors, provider credentials, or signed bytes.
    res.end(JSON.stringify({ error: 'The payout service is busy or unavailable. Retry the same request shortly.' }));
  }
}
module.exports = handler;
module.exports.handle = handle;
