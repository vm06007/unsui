const {createPublicClient,http,isAddress,zeroAddress}=require('viem');
const {mainnet}=require('viem/chains');
const {normalize}=require('viem/ens');
async function resolveEnsName(input, client) {
  if(typeof input!=='string'||input.length>255)throw Error('Enter a valid .eth name.');
  let name;
  try {name=normalize(input.trim());} catch {throw Error('Enter a valid .eth name.');}
  if(!name.endsWith('.eth'))throw Error('Enter a valid .eth name.');
  client ||= createPublicClient({chain:mainnet,transport:http(process.env.ETHEREUM_RPC_URL||'https://ethereum-rpc.publicnode.com',{timeout:8000,retryCount:0})});
  let address;
  try {address=await client.getEnsAddress({name});} catch {throw Error('ENS is unavailable. Please retry.');}
  if(!address||!isAddress(address)||address.toLowerCase()===zeroAddress)throw Error('This ENS name has no usable Ethereum address.');
  return {name,address,network:'mainnet'};
}
module.exports={resolveEnsName};
