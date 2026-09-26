import {
  Configuration,
  ChainsApi,
  ContractsApi,
  AddressesApi,
  EventsApi,
} from '@curvegrid/multibaas-sdk';
import {
  decodeEventLog,
  formatUnits,
  isAddress,
  parseAbi,
  createPublicClient,
  http,
} from 'viem';
import { mizuhikiTestnetAwaji } from 'viem/chains';

export const AWAJI_CHAIN_ID = 6497;
export const REFUNDED =
  'Refunded(bytes32,bytes32,address,uint256,uint256,uint256,bytes32)';
export const refundedAbi = parseAbi([
  'event Refunded(bytes32 indexed request, bytes32 indexed card, address indexed recipient, uint256 amountJpy, uint256 amountWei, uint256 sequence, bytes32 receiptHash)',
]);

export function multibaasClient(
  url,
  apiKey
) {
  const endpoint = new URL(url);
  if (
    endpoint.protocol !== 'https:' ||
    !endpoint.hostname.endsWith('.multibaas.com') ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash ||
    !['/', '/api/v0', '/api/v0/'].includes(endpoint.pathname)
  ) {
    throw Error(
      'Use the HTTPS MultiBaas deployment URL, without credentials or query parameters',
    );
  }
  if (!apiKey) throw Error('MULTIBAAS_API_KEY is not configured');
  const config = new Configuration({
    basePath: endpoint.origin + '/api/v0',
    accessToken: apiKey,
    baseOptions: { timeout: 5000, maxRedirects: 0 },
  });
  return {
    chains: new ChainsApi(config),
    contracts: new ContractsApi(config),
    addresses: new AddressesApi(config),
    events: new EventsApi(config),
  };
}

export function sdkResult(response) {
  if (
    !response?.data ||
    response.data.status >= 400 ||
    response.data.result === undefined
  )
    throw Error('Unexpected MultiBaas response');
  return response.data.result;
}

export async function requireAwaji(api) {
  const status = sdkResult(await api.chains.getChainStatus());
  if (Number(status.chainID) !== AWAJI_CHAIN_ID)
    throw Error('MultiBaas deployment is not connected to Awaji (6497)');
  return status;
}

// Decode atomic amounts from raw logs, not MultiBaas display conversions.
// Never return the card commitment to dashboard clients.
export function indexedPayout(
  record,
  contract,
  mjpy = false
) {
  const raw = JSON.parse(record.event.rawFields || '{}');
  if (raw.removed || raw.address?.toLowerCase() !== contract.toLowerCase())
    return null;
  const { args } = decodeEventLog({
    abi: refundedAbi,
    data: raw.data,
    topics: raw.topics,
    strict: true,
  });
  const digest = record.transaction.txHash;
  const timestamp = Date.parse(record.triggeredAt);
  if (
    !/^0x[0-9a-fA-F]{64}$/.test(digest) ||
    raw.transactionHash?.toLowerCase() !== digest.toLowerCase() ||
    !Number.isFinite(timestamp) ||
    args.amountJpy <= 0n ||
    args.amountJpy > 20000n
  )
    throw Error('Invalid indexed payout');
  return {
    id: `MB-${AWAJI_CHAIN_ID}-${digest}-${record.event.indexInLog}`,
    requestId: args.request,
    receiptHash: args.receiptHash,
    recipient: args.recipient,
    amountJpy: Number(args.amountJpy),
    amountAtomic: args.amountWei.toString(),
    amount: Number(formatUnits(args.amountWei, mjpy ? 6 : 18)),
    asset: mjpy ? 'MJPY' : 'MIZU',
    chain: 'mizuhiki',
    network: 'Awaji Testnet',
    chainId: AWAJI_CHAIN_ID,
    digest,
    date: new Date(timestamp).toISOString(),
    contract,
    blockNumber: record.transaction.blockNumber,
    source: 'multibaas',
    status: 'indexed',
  };
}

export function createMultiBaasFeed(
  env = process.env,
  injectedApi
) {
  let cache = null,
    expires = 0,
    pending = null;

  async function read() {
    const base = {
      network: 'Awaji Testnet',
      chainId: AWAJI_CHAIN_ID,
      records: [],
      treasury: null,
    };
    if (!env.MULTIBAAS_API_KEY)
      return {
        ...base,
        status: 'not-configured',
        message: 'Add the server-side MultiBaas API key',
      };
    try {
      const api =
        injectedApi ||
        multibaasClient(env.MULTIBAAS_DEPLOYMENT_URL, env.MULTIBAAS_API_KEY);
      const chain = await requireAwaji(api);
      const contract = env.AWAJI_PAYOUT_CONTRACT;
      if (!contract)
        return {
          ...base,
          status: 'awaiting-contract',
          message: 'Connected; link an UnSui payout contract',
          blockNumber: chain.blockNumber,
        };
      if (!isAddress(contract)) throw Error('Invalid contract address');
      const address = sdkResult(
        await api.addresses.getAddress(contract, ['balance']),
      );
      const linked = address.contracts?.find(c =>
        ['UnSuiPayouts', 'UnSuiMJPY'].includes(c.name || c.contractName),
      );
      const mjpy = (linked?.name || linked?.contractName) === 'UnSuiMJPY';
      if (!linked)
        return {
          ...base,
          status: 'awaiting-link',
          message: 'Link the payout ABI and enable event indexing',
        };
      const indexing = sdkResult(
        await api.contracts.getEventIndexingStatus(contract, linked.label),
      );
      const records = new Map();
      let offset = 0,
        truncated = false;
      // Bounded demo history. Explicitly indicate the limit instead of claiming full history.
      for (let page = 0; page < 10; page++) {
        const batch = sdkResult(
          await api.events.listEvents(
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            false,
            contract.toLowerCase(),
            undefined,
            REFUNDED,
            10,
            offset,
          ),
        );
        for (const event of batch) {
          const row = indexedPayout(event, contract, mjpy);
          if (row) records.set(row.id, row);
        }
        if (batch.length < 10) break;
        offset += 10;
        if (page === 9) truncated = true;
      }
      const tokenBalance = mjpy
        ? await createPublicClient({
            chain: mizuhikiTestnetAwaji,
            transport: http(undefined, { timeout: 5000, retryCount: 0 }),
          }).readContract({
            address: '0x78f5f0Ac4EF201618b97638ded959b155c4f4B04',
            abi: parseAbi([
              'function balanceOf(address) view returns (uint256)',
            ]),
            functionName: 'balanceOf',
            args: [contract],
          })
        : null;
      return {
        ...base,
        status: 'connected',
        message: indexing.isProcessingPastLogs
          ? 'Indexing historical payout events…'
          : 'Payout events indexed by MultiBaas',
        contract,
        indexedBlock: indexing.latestBlockNumber,
        blockNumber: chain.blockNumber,
        observedAt: Date.now(),
        truncated,
        records: [...records.values()].sort((
          a,
          b
        ) =>
          b.date.localeCompare(a.date),
        ),
        treasury:
          address.balance === undefined
            ? null
            : {
                asset: mjpy ? 'MJPY' : 'MIZU',
                network: 'Awaji Testnet',
                balance: Number(
                  formatUnits(
                    tokenBalance ?? BigInt(address.balance),
                    mjpy ? 6 : 18,
                  ),
                ),
                observedAt: Date.now(),
              },
      };
    } catch (error) {
      // Axios errors contain Authorization headers; never serialize them.
      return {
        ...base,
        status: 'unavailable',
        message:
          error.response?.status === 401 || error.response?.status === 403
            ? 'MultiBaas access denied; check the API key permissions'
            : 'Could not verify Awaji indexing; check network, contract and event sync',
      };
    }
  }
  return {
    async snapshot() {
      if (cache && Date.now() < expires) return cache;
      if (!pending)
        pending = read()
          .then(value => {
            cache = value;
            expires = Date.now() + 5000;
            return value;
          })
          .finally(() => {
            pending = null;
          });
      return pending;
    },
  };
}
