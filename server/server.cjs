const { createHash, randomUUID } = require('node:crypto');
const syncFs = require('node:fs');
const { createLivePayouts } = require('./live-payouts.cjs');
const { createWorldId } = require('./world-id.cjs');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createDemoLedger } = require('./build/demoLedger');
const {
  createOperationsAuth,
  readAuthBody,
} = require('./operations-auth.cjs');

function createServer({
  ledger: suppliedLedger = null,
  file = path.join(__dirname, 'data/ledger.json'),
  allowReset = process.env.NODE_ENV !== 'production',
  worldId = createWorldId(),
  liveClient = null,
  multibaasFeed = null,
  allowLiveReset = false,
  marketQuotes = null,
  dashboardAgent = require("./dashboard-agent.cjs").createDashboardAgent(),
} = {}) {
  const baseFile = file;
  let round = null,
    payoutBusy = 0,
    resetBusy = false;
  if (liveClient && syncFs.existsSync(baseFile + '.round')) {
    round = JSON.parse(syncFs.readFileSync(baseFile + '.round', 'utf8')).round;
    if (!/^[0-9a-f-]{36}$/.test(round)) throw Error('Invalid round state');
    file = baseFile + '.round-' + round;
  }

  function makeLedger() {
    const roundFile = file,
      roundId = round;
    const livePayout = liveClient
      ? createLivePayouts({
          file: roundFile + '.orders',
          networks: liveClient.networks || ['sui'],
          validate: input => liveClient.preflight?.({ ...input, demoRound: roundId }),
          pay: input => liveClient.pay({ ...input, demoRound: roundId }),
          authorize: input =>
            worldId.allows({
              ...binding(input),
              worldVerificationId: input.worldVerificationId,
            }),
        })
      : undefined;
    return createDemoLedger(
      {
        async getItem() {
          try {
            return await fs.readFile(roundFile, 'utf8');
          } catch (e) {
            if (e.code === 'ENOENT') return null;
            throw e;
          }
        },
        async setItem(
          _key,
          value
        ) {
          await fs.mkdir(path.dirname(roundFile), { recursive: true });
          const temp = roundFile + '.tmp';
          const handle = await fs.open(temp, 'w', 0o600);
          try {
            await handle.writeFile(value);
            await handle.sync();
          } finally {
            await handle.close();
          }
          await fs.rename(temp, roundFile);
        },
      },
      livePayout,
    );
  }
  let ledger = suppliedLedger || makeLedger();
  const operationsAuth = createOperationsAuth();
  const agentChat = dashboardAgent;
  let agentBusy = false;
  return http.createServer(async (
    req,
    res
  ) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    const origin = req.headers.origin;
    const merchantProjection =
      req.method === 'GET' &&
      (req.url === '/merchant-feed' || req.url === '/operations');
    // Trusted local operator service: do not expose payout endpoints publicly.
    // The unpacked merchant extension may read the public projection only.
    if (
      origin &&
      origin !== process.env.WORLD_PUBLIC_BASE_URL &&
      !/^http:\/\/(localhost|127\.0\.0\.1):(3000|3001|3010|3012|3201)$/.test(origin) &&
      !(
        merchantProjection &&
        /^chrome-extension:\/\/[a-p]{32}$/.test(origin)
      )
    ) {
      res.writeHead(403);
      res.end(JSON.stringify({ error: 'Origin not allowed' }));
      return;
    }
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
    const reply = (
      status,
      data
    ) => {
      res.writeHead(status);
      res.end(JSON.stringify(data));
    };
    try {
      const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
      if (pathname.startsWith('/auth/')) {
        const action = pathname.slice('/auth/'.length);
        const token = String(req.headers.authorization || '').replace(
          /^Bearer /,
          '',
        );
        try {
          if (req.method === 'GET' && action === 'session') {
            const user = operationsAuth.session(token);
            if (!user) return reply(401, { error: 'Please sign in again.' });
            return reply(200, {
              user: {
                email: user.email,
                address: user.address,
                role: user.role,
                method: user.method,
              },
            });
          }
          if (req.method === 'POST' && action === 'logout') {
            operationsAuth.logout(token);
            return reply(200, { ok: true });
          }
          if (req.method !== 'POST')
            return reply(404, { error: 'Not found' });
          const body = await readAuthBody(req);
          const requestOrigin = req.headers.origin || '';
          if (action === 'password')
            return reply(200, operationsAuth.password(body.email, body.password));
          if (action === 'challenge')
            return reply(
              200,
              operationsAuth.challenge(body.address, requestOrigin),
            );
          if (action === 'verify')
            return reply(
              200,
              await operationsAuth.verify(
                body.nonce,
                body.signature,
                requestOrigin,
              ),
            );
          return reply(404, { error: 'Not found' });
        } catch (error) {
          return reply(401, {
            error: error.message || 'Please sign in again.',
          });
        }
      }
      if (req.method === 'POST' && pathname === '/operations/agent') {
        if (!operationsAuth.session(String(req.headers.authorization || '').replace(/^Bearer /, '')))
          return reply(401, { error: 'Please sign in again.' });
        if (agentBusy) return reply(429, { error: 'An assistant request is already running. Please wait.' });
        agentBusy = true;
        try {
          let raw = '';
          for await (const chunk of req) {
            raw += chunk;
            if (Buffer.byteLength(raw) > 24000) throw Error('Assistant request too large.');
          }
          return reply(200, await agentChat(JSON.parse(raw || '{}')));
        } catch (error) {
          return reply(400, { error: error.name === 'TimeoutError' ? 'The free model timed out. Please retry.' : error.message });
        } finally { agentBusy = false; }
      }
      if (req.method === 'GET' && pathname === '/operations') {
        if (!operationsAuth.session(
          String(req.headers.authorization || '').replace(/^Bearer /, ''),
        ))
          return reply(401, { error: 'Please sign in again.' });
        const records = (await ledger.list()).map(operationRecord).reverse();
        return reply(200, {
          records,
          treasury: null,
          multibaas: multibaasFeed ? await multibaasFeed.snapshot() : null,
        });
      }
      if (req.url.startsWith('/world/')) {
        res.setHeader('Referrer-Policy', 'no-referrer');
        const assets = {
          '/world/verify': ['world-ui/index.html', 'text/html'],
          '/world/sdk/qrcode.js': [
            'node_modules/qrcode-generator/dist/qrcode.js',
            'text/javascript',
          ],
          '/world/assets/app.js': ['world-ui/app.js', 'text/javascript'],
          '/world/assets/style.css': ['world-ui/style.css', 'text/css'],
          '/world/sdk/idkit.global.js': [
            'node_modules/@worldcoin/idkit-core/dist/idkit.global.js',
            'text/javascript',
          ],
          '/world/sdk/idkit_wasm_bg.wasm': [
            'node_modules/@worldcoin/idkit-core/dist/idkit_wasm_bg.wasm',
            'application/wasm',
          ],
        };
        if (req.method === 'GET' && assets[req.url]) {
          const [file, type] = assets[req.url];
          const data = await fs.readFile(path.join(__dirname, file));
          res.setHeader('Content-Type', type);
          res.writeHead(200);
          res.end(data);
          return;
        }
        if (req.method === 'POST') {
          let body = '';
          for await (const chunk of req) {
            body += chunk;
            if (Buffer.byteLength(body) > 65536)
              return reply(413, { error: 'Request too large' });
          }
          const input = JSON.parse(body);
          if (req.url === '/world/start')
            return reply(200, worldId.start(binding(input)));
          if (req.url === '/world/status')
            return reply(200, worldId.status(input.verificationId));
          if (
            req.url === '/world/cancel' ||
            req.url === '/world/public/cancel'
          ) {
            worldId.cancel(input.verificationId);
            return reply(200, { ok: true });
          }
          if (req.url === '/world/public/request')
            return reply(200, worldId.getRequest(input.verificationId));
          if (req.url === '/world/public/bypass')
            return reply(200, worldId.bypass(input.verificationId));
          if (req.url === '/world/public/complete')
            return reply(
              200,
              await worldId.complete(input.verificationId, input.proof),
            );
        }
      }
      if (req.method === 'POST' && req.url === '/ens/resolve-name') {
        let body = '';
        for await (const chunk of req) {
          body += chunk;
          if (Buffer.byteLength(body) > 2048)
            return reply(413, { error: 'Request too large' });
        }
        const { resolveEnsName } = require('./ens.cjs');
        return reply(200, await resolveEnsName(JSON.parse(body).name));
      }
      if (req.method === 'POST' && req.url === '/sui/resolve-name') {
        let body = '';
        for await (const chunk of req) {
          body += chunk;
          if (Buffer.byteLength(body) > 2048)
            return reply(413, { error: 'Request too large' });
        }
        const name = JSON.parse(body).variables?.name;
        if (
          typeof name !== 'string' ||
          name.length > 235 ||
          !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.sui$/.test(
            name,
          )
        )
          return reply(400, { error: 'Enter a valid .sui name.' });
        try {
          const upstream = await fetch(
            'https://graphql.mainnet.sui.io/graphql',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: AbortSignal.timeout(8000),
              body: JSON.stringify({
                query:
                  'query ResolveName($name: String!) { nameRecord(name: $name) { domain target { address } } }',
                variables: { name },
              }),
            },
          );
          if (!upstream.ok)
            return reply(502, { error: 'SuiNS is unavailable. Please retry.' });
          return reply(200, await upstream.json());
        } catch {
          return reply(502, { error: 'SuiNS is unavailable. Please retry.' });
        }
      }
      if (req.method === 'GET' && req.url === '/multibaas-feed') {
        if (!multibaasFeed)
          return reply(200, { status: 'not-configured', records: [] });
        return reply(200, await multibaasFeed.snapshot());
      }

      if (req.method === 'GET' && req.url === '/health')
        return reply(200, {
          service: 'unsui-dev-ledger',
          version: 1,
          mode: liveClient
            ? liveClient.networks?.includes('ethereum')
              ? 'mainnet'
              : 'sui-mainnet'
            : 'demo',
          networks: liveClient?.networks || (liveClient ? ['sui'] : []),
          canReset: allowReset && (!liveClient || allowLiveReset),
        });
      if (req.method === 'GET' && req.url === '/ledger')
        return reply(200, { version: 1, receipts: await ledger.list() });
      if (
        req.method === 'GET' &&
        (req.url === '/merchant-feed' || req.url === '/operations')
      ) {
        const records = (await ledger.list())
          .map(r => ({
            id: r.id,
            date: r.createdAt,
            amount: r.amountJpy,
            card: 'Transit card',
            service: 'transit',
            method: 'transit',
            state: 'settled',
            status: 'settled',
            payout: r.status === 'confirmed' ? 'Confirmed' : 'Simulated',
            customer:
              r.cardId === 'ffffffffffffffff' ? 'Sample card' : 'Phone scan',
            returning: false,
            flagged: false,
            source: 'mobile-ledger',
            chain: r.network,
            asset:
              r.network === 'ethereum'
                ? 'ETH'
                : r.network === 'mizuhiki'
                ? r.payoutAsset || 'MIZU'
                : 'SUI',
            cryptoAmount: Number(r.estimatedCrypto),
            feeJpy: r.feeJpy,
            reference: r.id,
            digest: r.transactionDigest || null,
            mode: r.status === 'confirmed' ? r.chainNetwork : 'demo',
            receiptId: r.id,
          }))
          .reverse();
        return reply(200, {
          source: 'mobile-ledger',
          processorConnected: false,
          feeBps: 200,
          updatedAt: Date.now(),
          records,
        });
      }
      if (req.method === 'POST' && req.url === '/ledger/reset') {
        if (!allowReset || (liveClient && !allowLiveReset))
          return reply(403, { error: 'Reset is disabled' });
        let body = '';
        for await (const chunk of req) {
          body += chunk;
          if (Buffer.byteLength(body) > 1024)
            return reply(413, { error: 'Request too large' });
        }
        if (JSON.parse(body).confirm !== 'reset-demo-ledger')
          return reply(400, { error: 'Reset confirmation required' });
        if (payoutBusy || resetBusy)
          return reply(409, {
            error: 'Wait for the current refund before starting a new round.',
          });
        resetBusy = true;
        try {
          if (liveClient) {
            let orders = {};
            try {
              orders = JSON.parse(await fs.readFile(file + '.orders', 'utf8'));
            } catch (e) {
              if (e.code !== 'ENOENT') throw e;
            }
            if (Object.values(orders).some(order => !order.result))
              throw Error(
                'Resolve the pending payout before starting a new round.',
              );
            const next = randomUUID();
            await fs.mkdir(path.dirname(baseFile), { recursive: true });
            const handle = await fs.open(baseFile + '.round.tmp', 'w', 0o600);
            try {
              await handle.writeFile(
                JSON.stringify({
                  round: next,
                  previousRound: round,
                  createdAt: new Date().toISOString(),
                }),
              );
              await handle.sync();
            } finally {
              await handle.close();
            }
            await fs.rename(baseFile + '.round.tmp', baseFile + '.round');
            round = next;
            file = baseFile + '.round-' + round;
            ledger = makeLedger();
          } else await ledger.reset();
        } finally {
          resetBusy = false;
        }
        return reply(200, { reset: true });
      }
      if (req.method === 'POST' && req.url === '/quotes/sui') {
        if (!marketQuotes) return reply(503, { error: 'Market quotes are unavailable.' });
        let body = '';
        for await (const chunk of req) {
          body += chunk;
          if (Buffer.byteLength(body) > 4096) return reply(413, { error: 'Request too large' });
        }
        return reply(200, { quote: await marketQuotes.issue(JSON.parse(body)) });
      }
      if (req.method === 'POST' && req.url === '/refunds') {
        if (resetBusy)
          return reply(409, {
            error: 'A new round is starting. Retry shortly.',
          });
        payoutBusy++;
        try {
          let body = '';
          for await (const chunk of req) {
            body += chunk;
            if (Buffer.byteLength(body) > 16384)
              return reply(413, { error: 'Request too large' });
          }
          let input;
          try {
            input = JSON.parse(body);
          } catch {
            return reply(400, { error: 'Invalid JSON' });
          }
          if (
            !input ||
            typeof input.requestId !== 'string' ||
            input.requestId.length > 180 ||
            typeof input.cardId !== 'string' ||
            typeof input.confirmedCardId !== 'string' ||
            !input.quote ||
            !['sui', 'ethereum', 'mizuhiki'].includes(input.quote.network) ||
            typeof input.quote.recipient !== 'string'
          )
            return reply(400, { error: 'Invalid refund request' });
          const existing = (await ledger.list()).find(
            receipt => receipt.requestId === input.requestId,
          );
          const checkStatus = worldId.status(input.worldVerificationId).status;
          if (
            !liveClient &&
            !existing &&
            !worldId.allows({
              ...binding(input),
              worldVerificationId: input.worldVerificationId,
            })
          )
            return reply(403, {
              error: 'Refunds above ¥1,000 require a completed World ID check.',
              code: 'WORLD_ID_REQUIRED',
            });
          return reply(200, {
            receipt: await ledger.record({
              ...input,
              humanCheck:
                input.quote.amountJpy <= 1000
                  ? 'not_required'
                  : checkStatus === 'bypassed'
                  ? 'bypassed'
                  : 'verified',
            }),
          });
        } finally {
          payoutBusy--;
        }
      }
      reply(404, { error: 'Not found' });
    } catch (e) {
      reply(400, { error: e.message || 'Ledger unavailable' });
    }
  });
}

function operationRecord(receipt) {
  return {
    id: receipt.id,
    date: receipt.createdAt,
    amount: receipt.amountJpy,
    payout: receipt.status === 'pending' ? 'Queued' : 'Recorded',
    asset:
      receipt.network === 'ethereum'
        ? 'ETH'
        : receipt.network === 'mizuhiki'
        ? receipt.payoutAsset || 'MIZU'
        : 'SUI',
    cryptoAmount: Number(receipt.estimatedCrypto),
    recipient: receipt.recipient || null,
    digest: receipt.transactionDigest || null,
    receiptId: receipt.id,
    reference: receipt.id,
    chain: receipt.network,
    mode: receipt.status === 'confirmed' ? receipt.chainNetwork : 'demo',
    feeJpy: receipt.feeJpy || 0,
  };
}

function binding(input) {
  if (
    typeof input.requestId !== 'string' ||
    !input.requestId ||
    input.requestId.length > 180
  )
    throw Error('Invalid request reference');
  return {
    idm: input.cardId,
    address: input.quote?.recipient,
    amountJpy: input.quote?.amountJpy,
    realBalanceJpy: input.scannedBalanceJpy,
    chain: input.quote?.network,
    requestId: createHash('sha256').update(input.requestId).digest('hex'),
  };
}
module.exports = { createServer, operationRecord, binding };
if (require.main === module) {
  try {
    process.loadEnvFile(path.join(__dirname, '.env'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const host = process.env.HOST || '127.0.0.1';
  const port = Number(process.env.PORT || 4100);
  const suiLive = process.env.SUI_LIVE_PAYOUTS === 'true';
  const ethereumLive = process.env.ETHEREUM_LIVE_PAYOUTS === 'true';
  const awajiLive = process.env.AWAJI_LIVE_PAYOUTS === 'true';
  const live = suiLive || ethereumLive || awajiLive;
  if (live && host !== '127.0.0.1')
    throw Error('Live development payouts must bind to loopback only');
  const setup = async () => {
    const clients = {};
    const marketQuotes = suiLive ? require('./market-quotes.cjs').createMarketQuotes({ secret: process.env.CARD_COMMITMENT_SECRET }) : null;
    if (suiLive) {
      const { createSuiPayoutClient } = await import('./sui/client.mjs');
      clients.sui = createSuiPayoutClient({
        deployment: require('../contracts/deployments/sui-mainnet.json'),
        secret: process.env.CARD_COMMITMENT_SECRET,
        binary: process.env.SUI_BINARY,
        marketQuotes,
      });
    }
    if (ethereumLive) {
      const { createEthereumPayoutClient } = await import('./evm/client.mjs');
      clients.ethereum = createEthereumPayoutClient({
        deployment: require('../contracts/deployments/ethereum-mainnet.json'),
        secret: process.env.CARD_COMMITMENT_SECRET,
        privateKey: process.env.EVM_DEPLOYER_PRIVATE_KEY,
        rpcUrl: process.env.ETHEREUM_RPC_URL,
        journalDir: path.join(
          path.dirname(
            process.env.LEDGER_FILE || path.join(__dirname, 'data/ledger.json'),
          ),
          'ethereum-transactions',
        ),
      });
      await clients.ethereum.check();
    }
    if (awajiLive) {
      const { createAwajiPayoutClient } = await import('./evm/awaji.mjs');
      clients.mizuhiki = createAwajiPayoutClient({
        deployment: require('../contracts/deployments/awaji-mjpy.json'),
        secret: process.env.CARD_COMMITMENT_SECRET,
        privateKey: process.env.EVM_DEPLOYER_PRIVATE_KEY,
        journalDir: path.join(
          path.dirname(
            process.env.LEDGER_FILE || path.join(__dirname, 'data/ledger.json'),
          ),
          'awaji-transactions',
        ),
      });
      await clients.mizuhiki.check();
    }
    const liveClient = live
      ? {
          networks: Object.keys(clients),
          preflight(input) { return clients[input.quote.network]?.preflight?.(input); },
          pay(input) {
            const client = clients[input.quote.network];
            if (!client)
              throw Error('Payouts are not enabled for this network.');
            return client.pay(input);
          },
        }
      : null;
    const { createMultiBaasFeed } = await import('./multibaas.mjs');
    const server = createServer({
      multibaasFeed: createMultiBaasFeed(),
      marketQuotes,
      file: process.env.LEDGER_FILE,
      liveClient,
      allowLiveReset:
        process.env.ALLOW_LIVE_DEMO_RESET === 'true' &&
        process.env.NODE_ENV !== 'production',
    });
    server.listen(port, host, () =>
      console.log(
        `UnSui ledger: http://${host}:${port} (${
          live ? Object.keys(clients).join(', ') + ' PAYOUTS' : 'record only'
        })`,
      ),
    );
    server.on('error', e => {
      console.error(e.message);
      process.exitCode = 1;
    });
  };
  setup().catch(e => {
    console.error(e.message);
    process.exitCode = 1;
  });
}
