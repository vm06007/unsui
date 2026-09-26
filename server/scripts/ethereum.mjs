import fs from 'node:fs';
import {createPublicClient, encodeDeployData, getContractAddress, http, keccak256} from 'viem';
import {privateKeyToAccount} from 'viem/accounts';
import {mainnet} from 'viem/chains';
process.loadEnvFile(new URL('../.env', import.meta.url));
const command=process.argv[2]||'prepare';
const dir=new URL('../data/',import.meta.url);
fs.mkdirSync(dir,{recursive:true});
const journal=new URL('deployment.ethereum.json',dir),lock=new URL('deployment.ethereum.lock',dir);
let locked=false;
const save=p=>{fs.writeFileSync(new URL(journal.href+'.tmp'),JSON.stringify(p,null,2),{mode:0o600});fs.renameSync(new URL(journal.href+'.tmp'),journal);};
try {
 if(!['prepare','broadcast','finalize'].includes(command))throw Error('Use prepare, broadcast or finalize');
 if(!process.env.ETHEREUM_RPC_URL)throw Error('Set ETHEREUM_RPC_URL');
 const client=createPublicClient({chain:mainnet,transport:http(process.env.ETHEREUM_RPC_URL)});
 if(await client.getChainId()!==1)throw Error('RPC is not Ethereum mainnet');
 fs.closeSync(fs.openSync(lock,'wx',0o600));locked=true;
 const artifact=JSON.parse(fs.readFileSync(new URL('../../contracts/evm/out/UnSuiPayouts.sol/UnSuiPayouts.json',import.meta.url)));
 const from=process.env.EVM_DEPLOYER_ADDRESS;
 if(!/^0x[0-9a-fA-F]{40}$/.test(from||'')||/^0x0+$/.test(from))throw Error('Set EVM_DEPLOYER_ADDRESS');
 const data=encodeDeployData({abi:artifact.abi,bytecode:artifact.bytecode.object,args:[from,from,2000000000000n]});
 let plan;
 if(command==='prepare') {
  if(fs.existsSync(journal))throw Error('Existing deployment journal: resume it instead of deploying again');
  const nonce=await client.getTransactionCount({address:from,blockTag:'pending'});
  const estimate=await client.estimateGas({account:from,data,value:0n});
  const fees=await client.estimateFeesPerGas();
  plan={chainId:1,from,data,nonce,gas:String(estimate*120n/100n),maxFeePerGas:String(fees.maxFeePerGas),maxPriorityFeePerGas:String(fees.maxPriorityFeePerGas),contract:getContractAddress({from,nonce:BigInt(nonce)}),rateWeiPerJpy:'2000000000000',feeBps:200,status:'prepared'};
  save(plan);console.log(JSON.stringify({status:plan.status,from,contract:plan.contract,maximumGasWei:String(BigInt(plan.gas)*BigInt(plan.maxFeePerGas)),balanceWei:String(await client.getBalance({address:from}))},null,2));
 } else {
  plan=JSON.parse(fs.readFileSync(journal));
  if(plan.chainId!==1||plan.from.toLowerCase()!==from.toLowerCase()||plan.data!==data||plan.contract.toLowerCase()!==getContractAddress({from,nonce:BigInt(plan.nonce)}).toLowerCase())throw Error('Deployment plan differs from current artifact or wallet');
  if(command==='broadcast') {
   if(plan.status==='confirmed')throw Error('Already deployed');
   const cap=BigInt(process.env.MAX_ETH_DEPLOY_FEE_WEI||'0');
   if(BigInt(plan.gas)*BigInt(plan.maxFeePerGas)>cap)throw Error('Set MAX_ETH_DEPLOY_FEE_WEI to cover the reviewed gas budget');
   if(!plan.signedTx){
    const account=privateKeyToAccount(process.env.EVM_DEPLOYER_PRIVATE_KEY);
    if(account.address.toLowerCase()!==from.toLowerCase())throw Error('Signer differs from deployer');
    plan.signedTx=await account.signTransaction({chainId:1,type:'eip1559',nonce:plan.nonce,gas:BigInt(plan.gas),maxFeePerGas:BigInt(plan.maxFeePerGas),maxPriorityFeePerGas:BigInt(plan.maxPriorityFeePerGas),data,value:0n});
    plan.hash=keccak256(plan.signedTx);plan.status='signed';save(plan);
   }
   if(keccak256(plan.signedTx)!==plan.hash)throw Error('Signed transaction journal mismatch');
   await client.sendRawTransaction({serializedTransaction:plan.signedTx});
   plan.status='submitted';save(plan);console.log(JSON.stringify({status:plan.status,hash:plan.hash}));
  } else {
   const receipt=await client.waitForTransactionReceipt({hash:plan.hash,confirmations:2,timeout:180000});
   if(receipt.status!=='success'||receipt.contractAddress?.toLowerCase()!==plan.contract.toLowerCase())throw Error('Deployment receipt mismatch or failed deployment');
   if(!await client.getCode({address:receipt.contractAddress}))throw Error('No deployed code');
   plan.status='confirmed';plan.blockNumber=String(receipt.blockNumber);save(plan);
   console.log(JSON.stringify({status:plan.status,contract:plan.contract,hash:plan.hash,blockNumber:plan.blockNumber}));
  }
 }
} catch(e){console.error(e.shortMessage||e.message);process.exitCode=1;}finally{if(locked)fs.unlinkSync(lock);}
