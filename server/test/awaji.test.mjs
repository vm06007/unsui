import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  encodeEventTopics,
  encodeAbiParameters,
  parseAbiParameters,
  keccak256,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { createAwajiPayoutClient, abi, receiptHash } from '../evm/awaji.mjs';
const privateKey = '0x' + '1'.repeat(64),
  account = privateKeyToAccount(privateKey);
const address = '0x' + '2'.repeat(40),
  recipient = '0x' + '3'.repeat(40),
  zero = '0x' + '0'.repeat(64);
const input = {
  requestId: 'test-eth',
  cardId: '0123456789abcdef',
  scannedBalanceJpy: 1000,
  quote: {
    network: 'mizuhiki',
    payoutAsset: 'MJPY',
    recipient,
    amountJpy: 1000,
  },
};

async function fixture(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'unsui-eth-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const state = {
    chain: 6497,
    treasury: 4500000000000000n,
    signs: 0,
    sends: 0,
    pending: false,
    corrupt: false,
  };
  let claim;
  const raw = '0x1234',
    hash = keccak256(raw);
  const record = () => {
    const r = {
      card: claim.card,
      recipient,
      amountJpy: 1000n,
      amountAtomic: 980000000n,
      observedJpy: 1000n,
      redeemedJpy: 1000n,
      sequence: 1n,
      previousHash: zero,
      timestamp: 100n,
    };
    r.hash = receiptHash(address, claim.request, r);
    return r;
  };
  const transaction = () => {
    const r = record();
    return {
      status: 'success',
      transactionHash: hash,
      to: address,
      logs: [
        {
          address,
          topics: encodeEventTopics({
            abi,
            eventName: 'Refunded',
            args: { request: claim.request, card: claim.card, recipient },
          }),
          data: encodeAbiParameters(
            parseAbiParameters('uint256,uint256,uint256,bytes32'),
            [1000n, r.amountAtomic, 1n, r.hash],
          ),
        },
      ],
    };
  };
  const publicClient = {
    getChainId: async () => state.chain,
    getBalance: async ({ address: a }) =>
      a === address ? state.treasury : 1000000000000000n,
    getBlock: async () => ({ timestamp: 100n }),
    readContract: async ({ functionName }) =>
      ({
        operator: account.address,
        paused: false,
        atomicPerJpy: 1000000n,
        token: '0x78f5f0Ac4EF201618b97638ded959b155c4f4B04',
        decimals: 6,
        balanceOf: state.treasury,
        FEE_BPS: 200n,
        cards: [0n, 0n, zero],
        getReceipt: state.sends
          ? { ...record(), ...(state.corrupt ? { amountAtomic: 1n } : {}) }
          : { sequence: 0n },
      }[functionName]),
    simulateContract: async ({ args }) => {
      claim = args[0];
    },
    getTransactionReceipt: async () => {
      if (!state.sends) {
        const e = Error();
        e.name = 'TransactionReceiptNotFoundError';
        throw e;
      }
      return transaction();
    },
    sendRawTransaction: async () => {
      state.sends++;
      return hash;
    },
    waitForTransactionReceipt: async () => {
      if (state.pending) throw Error('timeout');
      return transaction();
    },
  };
  const walletClient = {
    prepareTransactionRequest: async () => ({
      gas: 100000n,
      maxFeePerGas: 10000000n,
    }),
    signTransaction: async () => {
      state.signs++;
      return raw;
    },
  };
  const config = {
    deployment: { chainId: 6497, contract: address, operator: account.address },
    secret: 's'.repeat(32),
    privateKey,
    journalDir: dir,
    publicClient,
    walletClient,
    multiBaas: {
      chains: {
        getChainStatus: async () => ({
          data: { status: 200, result: { chainID: 6497 } },
        }),
        submitSignedTransaction: async () => {
          state.sends++;
          return { data: { status: 200, result: {} } };
        },
      },
    },
  };
  return { state, config, client: createAwajiPayoutClient(config) };
}
test('Awaji verifies payout receipt and restart reuses signed transaction', async t => {
  const { state, config, client } = await fixture(t);
  const r = await client.pay(input);
  assert.equal(r.amountAtomic, '980000000');
  assert.equal(r.status, 'confirmed');
  assert.deepEqual(await createAwajiPayoutClient(config).pay(input), r);
  assert.equal(state.signs, 1);
  assert.equal(state.sends, 1);
  await assert.rejects(
    () => client.pay({ ...input, quote: { ...input.quote, amountJpy: 999 } }),
    /another payout/,
  );
});
test('uncertain Awaji confirmation retries the same hash without another signature', async t => {
  const { state, config, client } = await fixture(t);
  state.pending = true;
  await assert.rejects(() => client.pay(input), /pending/);
  state.pending = false;
  await createAwajiPayoutClient(config).pay(input);
  assert.equal(state.signs, 1);
  assert.equal(state.sends, 1);
});
test('Awaji fails closed for wrong chain, low treasury and mismatched receipt', async t => {
  const { state, client } = await fixture(t);
  state.chain = 1;
  await assert.rejects(() => client.pay(input), /not testnet/);
  state.chain = 6497;
  state.treasury = 0n;
  await assert.rejects(() => client.pay(input), /more MJPY/);
  assert.equal(state.signs, 0);
  state.treasury = 4500000000000000n;
  state.corrupt = true;
  await assert.rejects(() => client.pay(input), /does not match/);
});
