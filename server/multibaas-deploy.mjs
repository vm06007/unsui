import { encodeDeployData, getContractAddress, isAddress, keccak256 } from 'viem';
import { requireAwaji, sdkResult } from './multibaas.mjs';

export function deploymentSpec(artifact,{from,admin,operator,rate}) {
  for(const address of [from,admin,operator])
    if(!isAddress(address||'') || /^0x0{40}$/i.test(address))throw Error('Set valid deployer, admin and operator addresses');
  if(!/^\d+$/.test(rate||'')||BigInt(rate)<=0n||BigInt(rate)>10n**18n)throw Error('Set an explicit atomic MIZU-per-JPY rate');
  const bytecode=artifact.bytecode?.object;
  if(!/^0x[0-9a-f]+$/i.test(bytecode||'')||!Array.isArray(artifact.abi))throw Error('Build the Foundry UnSuiPayouts artifact first');
  const args=[admin,operator,BigInt(rate)];
  return {from,admin,operator,rate,chainId:6497,label:'unsuipayouts'+keccak256(bytecode).slice(2,10),version:'1.0.0',
    artifactHash:keccak256(bytecode),data:encodeDeployData({abi:artifact.abi,bytecode,args})};
}

export function validatePrepared(plan,spec) {
  const tx=plan.tx;
  if(plan.chainId!==6497 || tx.from?.toLowerCase()!==spec.from.toLowerCase() ||
    tx.to || BigInt(tx.value||0)!==0n || tx.data?.toLowerCase()!==spec.data.toLowerCase() ||
    !Number.isSafeInteger(tx.nonce)||tx.nonce<0||!Number.isSafeInteger(tx.gas)||tx.gas<=0)
    throw Error('MultiBaas deployment transaction does not match the reviewed contract and constructor');
  const predicted=getContractAddress({from:spec.from,nonce:BigInt(tx.nonce)});
  if(plan.deployAt&&plan.deployAt.toLowerCase()!==predicted.toLowerCase())throw Error('Deployment address mismatch');
  return predicted;
}

export async function prepareDeployment(api,artifact,spec) {
  await requireAwaji(api);
  let existing;
  try {existing=sdkResult(await api.contracts.getContractVersion(spec.label,spec.version));}
  catch(error){if(error.response?.status!==404)throw error;}
  if(existing) {
    if(existing.bin?.replace(/^0x/,'').toLowerCase()!==artifact.bytecode.object.slice(2).toLowerCase() ||
      JSON.stringify(JSON.parse(existing.rawAbi))!==JSON.stringify(artifact.abi))throw Error('Existing MultiBaas artifact differs');
  } else {
    sdkResult(await api.contracts.createContract(spec.label,{label:spec.label,contractName:'UnSuiPayouts',version:spec.version,
      rawAbi:JSON.stringify(artifact.abi),bin:artifact.bytecode.object.slice(2),
      metadata:typeof artifact.metadata==='string'?artifact.metadata:JSON.stringify(artifact.metadata||{})}));
  }
  const result=sdkResult(await api.contracts.deployContractVersion(spec.label,spec.version,{
    from:spec.from,args:[spec.admin,spec.operator,spec.rate],value:'0',signAndSubmit:false,nonceManagement:false,
  }));
  if(result.submitted)throw Error('Unexpected automatic submission; inspect MultiBaas before retrying');
  const plan={...spec,tx:result.tx,deployAt:result.deployAt,createdAt:new Date().toISOString(),
    integration:'@curvegrid/multibaas-sdk',status:'prepared'};
  plan.deployAt=validatePrepared(plan,spec);
  return plan;
}

export function signingTransaction(plan,maxFeeAtomic) {
  validatePrepared(plan,plan);
  const tx=plan.tx,fee=BigInt(tx.gasFeeCap??tx.gasPrice??0);
  if(!maxFeeAtomic||fee<=0n||BigInt(tx.gas)*fee>BigInt(maxFeeAtomic))throw Error('Deployment gas exceeds the explicit MAX_DEPLOY_FEE_ATOMIC budget');
  return {chainId:6497,nonce:tx.nonce,gas:BigInt(tx.gas),value:0n,data:tx.data,
    ...(tx.type===2?{type:'eip1559',maxFeePerGas:fee,maxPriorityFeePerGas:BigInt(tx.gasTipCap||0)}:
      tx.type===0?{type:'legacy',gasPrice:fee}:(()=>{throw Error('Unsupported transaction type');})())};
}

export async function finalizeDeployment(api,plan) {
  await requireAwaji(api);
  const receipt=sdkResult(await api.chains.getTransactionReceipt(plan.transactionHash)).data;
  if(BigInt(receipt.status)!==1n)throw Error('Deployment reverted');
  if(receipt.transactionHash.toLowerCase()!==plan.transactionHash.toLowerCase()||
    receipt.contractAddress.toLowerCase()!==plan.deployAt.toLowerCase())throw Error('Deployment receipt mismatch');
  sdkResult(await api.addresses.setAddress({address:receipt.contractAddress,alias:plan.label+'awaji'}));
  const address=sdkResult(await api.addresses.getAddress(receipt.contractAddress,['code']));
  if(!address.codeAt||address.codeAt==='0x')throw Error('Deployed bytecode not found');
  // Start from the actual deployment block so constructor-time and subsequent events are retained.
  sdkResult(await api.contracts.linkAddressContract(receipt.contractAddress,{
    label:plan.label,version:plan.version,startingBlock:BigInt(receipt.blockNumber).toString(),
  }));
  return {...plan,status:'deployed-and-linked',blockNumber:BigInt(receipt.blockNumber).toString(),
    explorerUrl:`https://awaji.blockscout.com/address/${receipt.contractAddress}`};
}
