const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const {createDemoLedger} = require('./build/demoLedger');

function createServer({file = path.join(__dirname, 'data/ledger.json'), allowReset = process.env.NODE_ENV !== 'production'} = {}) {
  const ledger = createDemoLedger({
    async getItem() {
      try {return await fs.readFile(file, 'utf8');}
      catch (e) {if(e.code === 'ENOENT') return null; throw e;}
    },
    async setItem(_key, value) {
      await fs.mkdir(path.dirname(file), {recursive:true});
      const temp = file + '.tmp';
      const handle = await fs.open(temp, 'w', 0o600);
      try {await handle.writeFile(value); await handle.sync();} finally {await handle.close();}
      await fs.rename(temp, file);
    }
  });
  return http.createServer(async(req,res)=>{
    res.setHeader('Content-Type','application/json');
    res.setHeader('Cache-Control','no-store');
    const origin = req.headers.origin;
    // Development-only: no internet-facing deployment or real payouts.
    if(origin && !/^http:\/\/(localhost|127\.0\.0\.1):(3010|3012)$/.test(origin)) {
      res.writeHead(403); res.end(JSON.stringify({error:'Origin not allowed'})); return;
    }
    if(origin) res.setHeader('Access-Control-Allow-Origin',origin);
    const reply=(status,data)=>{res.writeHead(status);res.end(JSON.stringify(data));};
    try {
      if(req.method==='GET' && req.url==='/health') return reply(200,{service:'unsui-dev-ledger',version:1,mode:'demo'});
      if(req.method==='GET' && req.url==='/ledger') return reply(200,{version:1,receipts:await ledger.list()});
      if(req.method==='GET' && req.url==='/merchant-feed') {
        const records=(await ledger.list()).map(r=>({
          id:r.id,date:r.createdAt,amount:r.amountJpy,card:'Transit card',service:'transit',method:'transit',
          state:'settled',status:'settled',payout:'Simulated',customer:r.cardId==='ffffffffffffffff'?'Sample card':'Phone scan',
          returning:false,flagged:false,source:'mobile-ledger',chain:r.network,
          asset:r.network==='ethereum'?'ETH':r.network==='mizuhiki'?'MIZU':'SUI',cryptoAmount:Number(r.estimatedCrypto),
          feeJpy:r.feeJpy,reference:r.id,digest:null,mode:'demo',receiptId:r.id
        })).reverse();
        return reply(200,{source:'mobile-ledger',processorConnected:false,feeBps:200,updatedAt:Date.now(),records});
      }
      if(req.method==='POST' && req.url==='/ledger/reset') {
        if(!allowReset) return reply(403,{error:'Reset is disabled'});
        let body='';
        for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>1024)return reply(413,{error:'Request too large'});}
        if(JSON.parse(body).confirm!=='reset-demo-ledger') return reply(400,{error:'Reset confirmation required'});
        await ledger.reset();
        return reply(200,{reset:true});
      }
      if(req.method==='POST' && req.url==='/refunds') {
        let body='';
        for await(const chunk of req) {body+=chunk; if(Buffer.byteLength(body)>16384) return reply(413,{error:'Request too large'});}
        let input; try {input=JSON.parse(body);} catch {return reply(400,{error:'Invalid JSON'});}
        if(!input || typeof input.requestId!=='string' || input.requestId.length>180 ||
          typeof input.cardId!=='string' || typeof input.confirmedCardId!=='string' || !input.quote ||
          !['sui','ethereum','mizuhiki'].includes(input.quote.network) || typeof input.quote.recipient!=='string')
          return reply(400,{error:'Invalid refund request'});
        return reply(200,{receipt:await ledger.record(input)});
      }
      reply(404,{error:'Not found'});
    }catch(e) {reply(400,{error:e.message || 'Ledger unavailable'});}
  });
}
module.exports={createServer};
if(require.main===module) {
  const host=process.env.HOST || '127.0.0.1';
  const port=Number(process.env.PORT || 4100);
  const server=createServer({file:process.env.LEDGER_FILE});
  server.listen(port,host,()=>console.log(`UnSui demo ledger: http://${host}:${port} (no real payouts)`));
  server.on('error',e=>{console.error(e.message);process.exitCode=1;});
}
