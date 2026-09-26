import process from 'node:process';
process.loadEnvFile(new URL('../.env', import.meta.url));
import fs from 'node:fs';
import { privateKeyToAccount } from 'viem/accounts';
import { keccak256, parseTransaction, recoverTransactionAddress } from 'viem';
import { multibaasClient, requireAwaji, sdkResult } from '../multibaas.mjs';
import { deploymentSpec, prepareDeployment, validatePrepared, signingTransaction, finalizeDeployment } from '../multibaas-deploy.mjs';

const command=process.argv[2]||'status';
const journal=new URL('../data/deployment.awaji.multibaas.local.json',import.meta.url);
const lock=new URL('../data/deployment.awaji.multibaas.local.lock',import.meta.url);
fs.mkdirSync(new URL('../data/',import.meta.url),{recursive:true});
let locked=false;
function save(value){fs.writeFileSync(new URL(journal.href+'.tmp'),JSON.stringify(value,null,2),{mode:0o600});fs.renameSync(new URL(journal.href+'.tmp'),journal);}
try {
  if(!['status','prepare','broadcast','finalize'].includes(command))throw Error('Use status, prepare, broadcast or finalize');
  const api=multibaasClient(process.env.MULTIBAAS_DEPLOYMENT_URL,process.env.MULTIBAAS_API_KEY);
  const chain=await requireAwaji(api);
  if(command==='status') {
    console.log(JSON.stringify({provider:'MultiBaas SDK',chainId:chain.chainID,blockNumber:chain.blockNumber},null,2));
  } else {
    fs.closeSync(fs.openSync(lock,'wx',0o600));locked=true;
    const artifact=JSON.parse(fs.readFileSync(new URL('../../contracts/evm/out/UnSuiPayouts.sol/UnSuiPayouts.json',import.meta.url),'utf8'));
    const spec=deploymentSpec(artifact,{from:process.env.AWAJI_DEPLOYER_ADDRESS,admin:process.env.AWAJI_ADMIN_ADDRESS,
      operator:process.env.AWAJI_OPERATOR_ADDRESS,rate:process.env.AWAJI_RATE_ATOMIC_PER_JPY});
    if(command==='prepare') {
      if(fs.existsSync(journal))throw Error('Deployment journal already exists; inspect it and resume instead of preparing another deployment');
      const plan=await prepareDeployment(api,artifact,spec);save(plan);
      console.log(JSON.stringify({status:plan.status,chainId:6497,deployAt:plan.deployAt,admin:plan.admin,
        operator:plan.operator,rateAtomicPerJpy:plan.rate,gas:plan.tx.gas,label:plan.label},null,2));
    } else {
      let plan=JSON.parse(fs.readFileSync(journal,'utf8'));
      validatePrepared(plan,spec);
      if(command==='broadcast') {
        if(plan.status==='deployed-and-linked')throw Error('Already deployed and linked');
        // Signing stays local. Only the signed transaction goes to MultiBaas.
        const tx=signingTransaction(plan,process.env.MAX_DEPLOY_FEE_ATOMIC);
        if(!plan.signedTx) {
          const key=process.env.EVM_DEPLOYER_PRIVATE_KEY;
          if(!/^0x[0-9a-fA-F]{64}$/.test(key||''))throw Error('Set EVM_DEPLOYER_PRIVATE_KEY locally');
          const account=privateKeyToAccount(key);
          if(account.address.toLowerCase()!==spec.from.toLowerCase())throw Error('Signing wallet differs from reviewed deployer');
          plan.signedTx=await account.signTransaction(tx);
          plan.transactionHash=keccak256(plan.signedTx);plan.status='signed';save(plan);
        }
        if(keccak256(plan.signedTx)!==plan.transactionHash)throw Error('Signed transaction journal is inconsistent');
        const signed=parseTransaction(plan.signedTx);
        const signer=await recoverTransactionAddress({serializedTransaction:plan.signedTx});
        if(signer.toLowerCase()!==spec.from.toLowerCase()||signed.chainId!==6497||signed.to||
          signed.data?.toLowerCase()!==spec.data.toLowerCase()||signed.nonce!==tx.nonce||
          signed.gas!==tx.gas||BigInt(signed.value||0)!==0n||
          (signed.maxFeePerGas??signed.gasPrice)!==(tx.maxFeePerGas??tx.gasPrice)||
          signed.maxPriorityFeePerGas!==tx.maxPriorityFeePerGas)throw Error('Signed transaction differs from reviewed deployment');
        // Retry resubmits exactly the same signed bytes/nonce; never creates a new deployment.
        sdkResult(await api.chains.submitSignedTransaction({signedTx:plan.signedTx}));
        plan.status='submitted';save(plan);
        console.log(JSON.stringify({status:plan.status,transactionHash:plan.transactionHash,
          next:'Run finalize after the deployment is mined'},null,2));
      } else {
        if(!plan.transactionHash)throw Error('Broadcast the prepared deployment first');
        plan=await finalizeDeployment(api,plan);save(plan);
        console.log(JSON.stringify({status:plan.status,contract:plan.deployAt,transactionHash:plan.transactionHash,
          explorerUrl:plan.explorerUrl,next:'Set AWAJI_PAYOUT_CONTRACT to the verified address and restart the server'},null,2));
      }
    }
  }
} catch(error) {
  // Axios error objects may contain API keys. Never print the object, headers or response body.
  console.error(error.response?`MultiBaas request failed (HTTP ${error.response.status}); check access and deployment configuration`:error.message);
  process.exitCode=1;
} finally {if(locked)fs.unlinkSync(lock);}
