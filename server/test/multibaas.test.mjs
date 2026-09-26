import test from 'node:test';
import assert from 'node:assert/strict';
import {
  encodeAbiParameters,
  encodeEventTopics,
  parseAbiParameters,
} from 'viem';
import {
  createMultiBaasFeed,
  indexedPayout,
  multibaasClient,
  refundedAbi,
} from '../multibaas.mjs';
import {
  deploymentSpec,
  prepareDeployment,
  signingTransaction,
  finalizeDeployment,
} from '../multibaas-deploy.mjs';
const contract = '0x' + 'a'.repeat(40),
  wallet = '0x' + 'b'.repeat(40),
  hash = '0x' + 'c'.repeat(64),
  request = '0x' + 'd'.repeat(64);
const ok = result => ({ data: { status: 200, result } });

function event() {
  return {
    triggeredAt: '2026-09-25T12:00:00Z',
    transaction: { txHash: hash, blockNumber: 20 },
    event: {
      indexInLog: 0,
      rawFields: JSON.stringify({
        address: contract,
        transactionHash: hash,
        topics: encodeEventTopics({
          abi: refundedAbi,
          eventName: 'Refunded',
          args: { request, card: hash, recipient: wallet },
        }),
        data: encodeAbiParameters(
          parseAbiParameters('uint256,uint256,uint256,bytes32'),
          [575n, 57500000000000000n, 1n, hash],
        ),
      }),
      inputs: [{ name: 'amountWei', value: 'WRONG DISPLAY CONVERSION' }],
    },
  };
}
test('indexer decodes atomic logs, ignores display conversions and strips card identity', () => {
  const row = indexedPayout(event(), contract);
  assert.equal(row.amount, 0.0575);
  assert.equal(row.amountJpy, 575);
  assert.equal(row.requestId, request);
  assert.equal(row.card, undefined);
  assert.equal(indexedPayout(event(), wallet), null);
  const removed = event();
  const raw = JSON.parse(removed.event.rawFields);
  raw.removed = true;
  removed.event.rawFields = JSON.stringify(raw);
  assert.equal(indexedPayout(removed, contract), null);
});
test('missing credentials perform no calls and wrong chain fails closed', async () => {
  assert.equal(
    (await createMultiBaasFeed({}).snapshot()).status,
    'not-configured',
  );
  const feed = createMultiBaasFeed(
    { MULTIBAAS_API_KEY: 'test' },
    { chains: { getChainStatus: async () => ok({ chainID: 1 }) } },
  );
  assert.equal((await feed.snapshot()).status, 'unavailable');
  assert.throws(
    () => multibaasClient('https://evil.example', 'key'),
    /HTTPS MultiBaas/,
  );
});
test('indexing filters exact contract/event, deduplicates and observes MIZU balance', async () => {
  let reads = 0;
  const api = {
    chains: {
      getChainStatus: async () => ok({ chainID: 6497, blockNumber: 21 }),
    },
    contracts: {
      getEventIndexingStatus: async () => ok({ latestBlockNumber: 20 }),
    },
    addresses: {
      getAddress: async (
        a,
        include
      ) => {
        assert.equal(a, contract);
        assert.deepEqual(include, ['balance']);
        return ok({
          contracts: [{ name: 'UnSuiPayouts', label: 'unsui' }],
          balance: '1000000000000000000',
        });
      },
    },
    events: {
      listEvents: async (...args) => {
        assert.equal(args[9], 10);
        reads++;
        assert.equal(args[6], contract);
        assert.match(args[8], /^Refunded/);
        return ok([event(), event()]);
      },
    },
  };
  const feed = createMultiBaasFeed(
    { MULTIBAAS_API_KEY: 'test', AWAJI_PAYOUT_CONTRACT: contract },
    api,
  );
  const result = await feed.snapshot();
  assert.equal(result.status, 'connected');
  assert.equal(result.records.length, 1);
  assert.equal(result.treasury.balance, 1);
  await feed.snapshot();
  assert.equal(reads, 1);
});
test('upstream credentials never appear in dashboard failures', async () => {
  const error = Object.assign(Error('secret-key'), {
    response: { status: 401 },
    config: { headers: { Authorization: 'secret-key' } },
  });
  const result = await createMultiBaasFeed(
    { MULTIBAAS_API_KEY: 'secret-key' },
    {
      chains: {
        getChainStatus: async () => {
          throw error;
        },
      },
    },
  ).snapshot();
  assert(!JSON.stringify(result).includes('secret-key'));
  assert.equal(result.status, 'unavailable');
});
// Minimal artifact keeps these orchestration tests independent of Foundry build outputs.
const artifact = {
  abi: [
    {
      type: 'constructor',
      inputs: [
        { name: 'admin', type: 'address' },
        { name: 'operator', type: 'address' },
        { name: 'rate', type: 'uint256' },
      ],
      stateMutability: 'nonpayable',
    },
  ],
  bytecode: { object: '0x60006000f3' },
};
const spec = deploymentSpec(artifact, {
  from: wallet,
  admin: wallet,
  operator: wallet,
  rate: '100000000000000',
});

function deploymentApi(chain = 6497) {
  const calls = [];
  return {
    calls,
    chains: { getChainStatus: async () => ok({ chainID: chain }) },
    contracts: {
      getContractVersion: async () => {
        throw Object.assign(Error('missing'), { response: { status: 404 } });
      },
      createContract: async (
        label,
        body
      ) => {
        calls.push('upload');
        assert.equal(body.rawAbi, JSON.stringify(artifact.abi));
        assert.equal(body.bin, artifact.bytecode.object);
        return ok({});
      },
      deployContractVersion: async (
        label,
        version,
        args
      ) => {
        calls.push('compose');
        assert.equal(args.signAndSubmit, false);
        assert.equal(args.args[2], spec.rate);
        return ok({
          submitted: false,
          tx: {
            from: wallet,
            value: '0',
            data: spec.data,
            nonce: 0,
            gas: 100000,
            type: 2,
            gasFeeCap: '1000000',
            gasTipCap: '0',
          },
        });
      },
    },
  };
}
test('SDK deployment uploads ABI/bytecode and composes exact constructor without broadcasting', async () => {
  const api = deploymentApi();
  const plan = await prepareDeployment(api, artifact, spec);
  assert.deepEqual(api.calls, ['upload', 'compose']);
  assert.equal(plan.status, 'prepared');
  assert.equal(plan.chainId, 6497);
  assert.equal(signingTransaction(plan, '100000000000').chainId, 6497);
  assert.throws(() => signingTransaction(plan, '1'), /gas exceeds/);
  assert.throws(
    () =>
      signingTransaction(
        { ...plan, tx: { ...plan.tx, data: '0xdead' } },
        '100000000000',
      ),
    /does not match/,
  );
});
test('wrong MultiBaas chain blocks upload/deployment', async () => {
  const api = deploymentApi(1);
  await assert.rejects(prepareDeployment(api, artifact, spec), /not connected/);
  assert.deepEqual(api.calls, []);
});
test('finalization checks successful receipt and links indexing from deployment block', async () => {
  const calls = [];
  const api = {
    chains: {
      getChainStatus: async () => ok({ chainID: 6497 }),
      getTransactionReceipt: async () =>
        ok({
          data: {
            status: '0x1',
            transactionHash: hash,
            contractAddress: contract,
            blockNumber: '0x14',
          },
        }),
    },
    addresses: {
      setAddress: async () => ok({}),
      getAddress: async (
        a,
        include
      ) => {
        assert.deepEqual(include, ['code']);
        return ok({ codeAt: '0x6000' });
      },
    },
    contracts: {
      linkAddressContract: async (
        a,
        args
      ) => {
        calls.push(args);
        return ok({});
      },
    },
  };
  const plan = {
    transactionHash: hash,
    deployAt: contract,
    label: 'unsui',
    version: '1.0.0',
  };
  assert.equal(
    (await finalizeDeployment(api, plan)).status,
    'deployed-and-linked',
  );
  assert.equal(calls[0].startingBlock, '20');
  await assert.rejects(
    finalizeDeployment(api, { ...plan, deployAt: wallet }),
    /receipt mismatch/,
  );
});
