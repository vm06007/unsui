const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {createServer}=require('../server.cjs');
const {createDemoQuote}=require('../build/refundQuote');
async function fixture(t) {
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'unsui-ledger-'));const file=path.join(dir,'ledger.json');
 let server;
 const start=async()=>{server=createServer({file});await new Promise(r=>server.listen(0,'127.0.0.1',r));return `http://127.0.0.1:${server.address().port}`;};
 const stop=()=>new Promise(r=>server.close(r));
 t.after(async()=>{if(server.listening)await stop();await fs.rm(dir,{recursive:true,force:true});});
 return {url:await start(),start,stop,file};
}
const input=(requestId='test-1',amount=1000)=>({requestId,cardId:'0123456789abcdef',scannedBalanceJpy:1500,confirmedCardId:'0123456789abcdef',confirmedBalanceJpy:1500,quote:createDemoQuote(String(amount),1500,'sui',`0x${'1'.repeat(64)}`)});
const post=(url,body)=>fetch(url+'/refunds',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
test('receipts survive restart, retries are idempotent and merchant feed omits private fields',async t=>{
 const f=await fixture(t);const first=await (await post(f.url,input())).json();assert.equal(first.receipt.remainingDemoJpy,500);
 assert.deepEqual(await (await post(f.url,input())).json(),first);
 await f.stop();f.url=await f.start();assert.equal((await (await fetch(f.url+'/ledger')).json()).receipts.length,1);
 const feed=await(await fetch(f.url+'/merchant-feed')).json();assert.equal(feed.records[0].amount,1000);assert.equal(feed.records[0].feeJpy,20);assert.equal(feed.records[0].cryptoAmount,.098);assert.equal(feed.records[0].mode,'demo');assert.equal(feed.records[0].digest,null);
 assert.equal('recipient' in feed.records[0],false);assert.equal('cardId' in feed.records[0],false);
});
test('concurrent refunds cannot overspend and changed quotes/re-scan are rejected',async t=>{
 const f=await fixture(t);const results=await Promise.all([post(f.url,input('a')),post(f.url,input('b'))]);assert.deepEqual(results.map(r=>r.status).sort(),[200,400]);
 const records=(await(await fetch(f.url+'/ledger')).json()).receipts;assert.equal(records.length,1);
 const altered=input(records[0].requestId,500);assert.equal((await post(f.url,altered)).status,400);
 assert.equal((await post(f.url,{...input('c',500),confirmedCardId:'aaaaaaaaaaaaaaaa'})).status,400);
 assert.equal((await post(f.url,{...input('d',500),confirmedBalanceJpy:1000})).status,400);
 const quote=input('e',500);quote.quote.feeJpy=0;assert.equal((await post(f.url,quote)).status,400);
});
test('corrupt storage blocks new refunds and unknown origins cannot read records',async t=>{
 const f=await fixture(t);await fs.writeFile(f.file,'not json');assert.equal((await post(f.url,input())).status,400);
 assert.equal(await fs.readFile(f.file,'utf8'),'not json');
 assert.equal((await fetch(f.url+'/ledger',{headers:{Origin:'https://example.com'}})).status,403);
 assert.equal((await fetch(f.url+'/ledger',{headers:{Origin:'null'}})).status,403);
});
