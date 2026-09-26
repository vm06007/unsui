const {test}=require('node:test');
const assert=require('node:assert/strict');
const {resolveEnsName}=require('../ens.cjs');
test('ENS normalizes names and returns a valid Ethereum recipient',async()=>{
  const address='0x'+'1'.repeat(40);
  const result=await resolveEnsName(' TEST.ETH ',{getEnsAddress:async({name})=>{assert.equal(name,'test.eth');return address;}});
  assert.deepEqual(result,{name:'test.eth',address,network:'mainnet'});
});
test('ENS rejects invalid names and missing or zero-address records',async()=>{
  for(const name of ['bad name.eth','kartik.sui','',null]) await assert.rejects(resolveEnsName(name),/valid/);
  for(const address of [null,'0x'+'0'.repeat(40),'bad']) await assert.rejects(resolveEnsName('test.eth',{getEnsAddress:async()=>address}),/no usable/);
});
