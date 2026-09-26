const {createHash,randomUUID}=require('node:crypto');
const syncFs=require('node:fs');
const {createLivePayouts}=require('./live-payouts.cjs');
const {createWorldId}=require('./world-id.cjs');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const {createDemoLedger} = require('./build/demoLedger');

function createServer({file = path.join(__dirname, 'data/ledger.json'), allowReset = process.env.NODE_ENV !== 'production', worldId = createWorldId(), liveClient = null, allowLiveReset = false} = {}) {
  const baseFile=file;
  let round=null,payoutBusy=0,resetBusy=false;
  if(liveClient && syncFs.existsSync(baseFile+'.round')){round=JSON.parse(syncFs.readFileSync(baseFile+'.round','utf8')).round;if(!/^[0-9a-f-]{36}$/.test(round))throw Error('Invalid round state');file=baseFile+'.round-'+round;}
  function makeLedger(){
  const roundFile=file, roundId=round;
  const livePayout=liveClient?createLivePayouts({file:roundFile+'.orders',pay:input=>liveClient.pay({...input,demoRound:roundId}),authorize:input=>worldId.allows({...binding(input),worldVerificationId:input.worldVerificationId})}):undefined;
  return createDemoLedger({
    async getItem() {
      try {return await fs.readFile(roundFile, 'utf8');}
      catch (e) {if(e.code === 'ENOENT') return null; throw e;}
    },
    async setItem(_key, value) {
      await fs.mkdir(path.dirname(roundFile), {recursive:true});
      const temp = roundFile + '.tmp';
      const handle = await fs.open(temp, 'w', 0o600);
      try {await handle.writeFile(value); await handle.sync();} finally {await handle.close();}
      await fs.rename(temp, roundFile);
    }
  },livePayout);
  }
  let ledger=makeLedger();
  return http.createServer(async(req,res)=>{
    res.setHeader('Content-Type','application/json');
    res.setHeader('Cache-Control','no-store');
    const origin = req.headers.origin;
    // Trusted local operator service: do not expose payout endpoints publicly.
    if(origin && origin !== process.env.WORLD_PUBLIC_BASE_URL && !/^http:\/\/(localhost|127\.0\.0\.1):(3010|3012)$/.test(origin)) {
      res.writeHead(403); res.end(JSON.stringify({error:'Origin not allowed'})); return;
    }
    if(origin) res.setHeader('Access-Control-Allow-Origin',origin);
    const reply=(status,data)=>{res.writeHead(status);res.end(JSON.stringify(data));};
    try {
      if(req.url.startsWith('/world/')) {
        res.setHeader('Referrer-Policy','no-referrer');
        const assets={
          '/world/verify':['world-ui/index.html','text/html'],
          '/world/sdk/qrcode.js':['node_modules/qrcode-generator/dist/qrcode.js','text/javascript'],
          '/world/assets/app.js':['world-ui/app.js','text/javascript'],
          '/world/assets/style.css':['world-ui/style.css','text/css'],
          '/world/sdk/idkit.global.js':['node_modules/@worldcoin/idkit-core/dist/idkit.global.js','text/javascript'],
          '/world/sdk/idkit_wasm_bg.wasm':['node_modules/@worldcoin/idkit-core/dist/idkit_wasm_bg.wasm','application/wasm'],
        };
        if(req.method==='GET' && assets[req.url]) {
          const [file,type]=assets[req.url];const data=await fs.readFile(path.join(__dirname,file));
          res.setHeader('Content-Type',type);res.writeHead(200);res.end(data);return;
        }
        if(req.method==='POST') {
          let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>65536)return reply(413,{error:'Request too large'});}
          const input=JSON.parse(body);
          if(req.url==='/world/start')return reply(200,worldId.start(binding(input)));
          if(req.url==='/world/status')return reply(200,worldId.status(input.verificationId));
          if(req.url==='/world/cancel'||req.url==='/world/public/cancel'){worldId.cancel(input.verificationId);return reply(200,{ok:true});}
          if(req.url==='/world/public/request')return reply(200,worldId.getRequest(input.verificationId));
          if(req.url==='/world/public/bypass')return reply(200,worldId.bypass(input.verificationId));
          if(req.url==='/world/public/complete')return reply(200,await worldId.complete(input.verificationId,input.proof));
        }
      }
      if(req.method==='POST' && req.url==='/ens/resolve-name') {
        let body='';
        for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>2048)return reply(413,{error:'Request too large'});}
        const {resolveEnsName}=require('./ens.cjs');
        return reply(200,await resolveEnsName(JSON.parse(body).name));
      }
      if(req.method==='POST' && req.url==='/sui/resolve-name') {
        let body='';
        for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>2048)return reply(413,{error:'Request too large'});}
        const name=JSON.parse(body).variables?.name;
        if(typeof name!=='string'||name.length>235||!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.sui$/.test(name))return reply(400,{error:'Enter a valid .sui name.'});
        try {
          const upstream=await fetch('https://graphql.mainnet.sui.io/graphql',{
            method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(8000),
            body:JSON.stringify({query:'query ResolveName($name: String!) { nameRecord(name: $name) { domain target { address } } }',variables:{name}})
          });
          if(!upstream.ok)return reply(502,{error:'SuiNS is unavailable. Please retry.'});
          return reply(200,await upstream.json());
        } catch {return reply(502,{error:'SuiNS is unavailable. Please retry.'});}
      }
      if(req.method==='GET' && req.url==='/health') return reply(200,{service:'unsui-dev-ledger',version:1,mode:liveClient?'sui-mainnet':'demo',canReset:allowReset&&(!liveClient||allowLiveReset)});
      if(req.method==='GET' && req.url==='/ledger') return reply(200,{version:1,receipts:await ledger.list()});
      if(req.method==='GET' && req.url==='/merchant-feed') {
        const records=(await ledger.list()).map(r=>({
          id:r.id,date:r.createdAt,amount:r.amountJpy,card:'Transit card',service:'transit',method:'transit',
          state:'settled',status:'settled',payout:r.status==='confirmed'?'Confirmed':'Simulated',customer:r.cardId==='ffffffffffffffff'?'Sample card':'Phone scan',
          returning:false,flagged:false,source:'mobile-ledger',chain:r.network,
          asset:r.network==='ethereum'?'ETH':r.network==='mizuhiki'?'MIZU':'SUI',cryptoAmount:Number(r.estimatedCrypto),
          feeJpy:r.feeJpy,reference:r.id,digest:r.transactionDigest||null,mode:r.status==='confirmed'?'mainnet':'demo',receiptId:r.id
        })).reverse();
        return reply(200,{source:'mobile-ledger',processorConnected:false,feeBps:200,updatedAt:Date.now(),records});
      }
      if(req.method==='POST' && req.url==='/ledger/reset') {
        if(!allowReset || (liveClient && !allowLiveReset)) return reply(403,{error:'Reset is disabled'});
        let body='';
        for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>1024)return reply(413,{error:'Request too large'});}
        if(JSON.parse(body).confirm!=='reset-demo-ledger') return reply(400,{error:'Reset confirmation required'});
        if(payoutBusy||resetBusy)return reply(409,{error:'Wait for the current refund before starting a new round.'});
        resetBusy=true;
        try {
          if(liveClient){
            let orders={};try{orders=JSON.parse(await fs.readFile(file+'.orders','utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
            if(Object.values(orders).some(order=>!order.result))throw Error('Resolve the pending payout before starting a new round.');
            const next=randomUUID();
            await fs.mkdir(path.dirname(baseFile),{recursive:true});
            const handle=await fs.open(baseFile+'.round.tmp','w',0o600);
            try{await handle.writeFile(JSON.stringify({round:next,previousRound:round,createdAt:new Date().toISOString()}));await handle.sync();}finally{await handle.close();}
            await fs.rename(baseFile+'.round.tmp',baseFile+'.round');
            round=next;file=baseFile+'.round-'+round;ledger=makeLedger();
          }else await ledger.reset();
        }finally{resetBusy=false;}
        return reply(200,{reset:true});
      }
      if(req.method==='POST' && req.url==='/refunds') {
        if(resetBusy)return reply(409,{error:'A new round is starting. Retry shortly.'});
        payoutBusy++;
        try {
        let body='';
        for await(const chunk of req) {body+=chunk; if(Buffer.byteLength(body)>16384) return reply(413,{error:'Request too large'});}
        let input; try {input=JSON.parse(body);} catch {return reply(400,{error:'Invalid JSON'});}
        if(!input || typeof input.requestId!=='string' || input.requestId.length>180 ||
          typeof input.cardId!=='string' || typeof input.confirmedCardId!=='string' || !input.quote ||
          !['sui','ethereum','mizuhiki'].includes(input.quote.network) || typeof input.quote.recipient!=='string')
          return reply(400,{error:'Invalid refund request'});
        const existing=(await ledger.list()).find(receipt=>receipt.requestId===input.requestId);
        const checkStatus=worldId.status(input.worldVerificationId).status;
        if(!liveClient && !existing && !worldId.allows({...binding(input),worldVerificationId:input.worldVerificationId}))
          return reply(403,{error:'Refunds above ¥1,000 require a completed World ID check.',code:'WORLD_ID_REQUIRED'});
        return reply(200,{receipt:await ledger.record({...input,humanCheck:input.quote.amountJpy<=1000?'not_required':checkStatus==='bypassed'?'bypassed':'verified'})});
        }finally{payoutBusy--;}
      }
      reply(404,{error:'Not found'});
    }catch(e) {reply(400,{error:e.message || 'Ledger unavailable'});}
  });
}
function binding(input) {
 if(typeof input.requestId!=='string'||!input.requestId||input.requestId.length>180)throw Error('Invalid request reference');
 return {idm:input.cardId,address:input.quote?.recipient,amountJpy:input.quote?.amountJpy,realBalanceJpy:input.scannedBalanceJpy,chain:input.quote?.network,requestId:createHash('sha256').update(input.requestId).digest('hex')};
}
module.exports={createServer};
if(require.main===module) {
  try { process.loadEnvFile(path.join(__dirname,'.env')); } catch(error) {if(error.code!=='ENOENT')throw error;}
  const host=process.env.HOST || '127.0.0.1';
  const port=Number(process.env.PORT || 4100);
  const live=process.env.SUI_LIVE_PAYOUTS==='true';
  if(live && host!=='127.0.0.1')throw Error('Live development payouts must bind to loopback only');
  const setup=async()=>{
  let liveClient=null;
  if(live){const {createSuiPayoutClient}=await import('./sui/client.mjs');liveClient=createSuiPayoutClient({deployment:require('../contracts/deployments/sui-mainnet.json'),secret:process.env.CARD_COMMITMENT_SECRET,binary:process.env.SUI_BINARY});}
  const server=createServer({file:process.env.LEDGER_FILE,liveClient,allowLiveReset:process.env.ALLOW_LIVE_DEMO_RESET==='true'&&process.env.NODE_ENV!=='production'});
  server.listen(port,host,()=>console.log(`UnSui ledger: http://${host}:${port} (${live?'SUI MAINNET PAYOUTS':'record only'})`));
  server.on('error',e=>{console.error(e.message);process.exitCode=1;});
  };setup().catch(e=>{console.error(e.message);process.exitCode=1;});
}
