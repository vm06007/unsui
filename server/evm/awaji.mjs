import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, createHmac } from 'node:crypto';
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  encodeFunctionData,
  encodeAbiParameters,
  parseAbiParameters,
  keccak256,
  stringToHex,
  parseEventLogs,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mizuhikiTestnetAwaji as awaji } from 'viem/chains';
import { multibaasClient, requireAwaji, sdkResult } from '../multibaas.mjs';
export const MJPY = '0x78f5f0Ac4EF201618b97638ded959b155c4f4B04';
const tokenAbi = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
]);

export const abi = parseAbi([
  'function token() view returns (address)',
  'function operator() view returns (address)',
  'function paused() view returns (bool)',
  'function atomicPerJpy() view returns (uint256)',
  'function FEE_BPS() view returns (uint256)',
  'function cards(bytes32) view returns (uint256 redeemedJpy, uint256 sequence, bytes32 head)',
  'function getReceipt(bytes32) view returns ((bytes32 card, address recipient, uint256 amountJpy, uint256 amountAtomic, uint256 observedJpy, uint256 redeemedJpy, uint256 sequence, bytes32 previousHash, uint256 timestamp, bytes32 hash))',
  'function refund((bytes32 card, bytes32 request, address recipient, uint256 amountJpy, uint256 observedJpy, uint256 expectedSequence, uint256 expiresAt) claim) returns (bytes32)',
  'event Refunded(bytes32 indexed request, bytes32 indexed card, address indexed recipient, uint256 amountJpy, uint256 amountAtomic, uint256 sequence, bytes32 receiptHash)',
]);
const equal = (
  a,
  b
) => String(a).toLowerCase() === String(b).toLowerCase();

export function receiptHash(
  address,
  request,
  r
) {
  return keccak256(
    encodeAbiParameters(
      parseAbiParameters(
        'bytes32,uint256,address,address,bytes32,bytes32,address,uint256,uint256,uint256,uint256,uint256,bytes32,uint256',
      ),
      [
        keccak256(stringToHex('UNSUI_MJPY_RECEIPT_V1')),
        6497n,
        address,
        MJPY,
        request,
        r.card,
        r.recipient,
        r.amountJpy,
        r.amountAtomic,
        r.observedJpy,
        r.redeemedJpy,
        r.sequence,
        r.previousHash,
        r.timestamp,
      ],
    ),
  );
}

export function createAwajiPayoutClient({
  deployment,
  secret,
  privateKey,
  rpcUrl,
  journalDir,
  journal,
  publicClient,
  walletClient,
  multiBaas,
}) {
  if (
    deployment.chainId !== 6497 ||
    !secret ||
    secret.length < 32 ||
    (!journalDir && !journal)
  )
    throw Error('Missing Awaji testnet configuration');
  const account = privateKeyToAccount(privateKey);
  if (!equal(account.address, deployment.operator))
    throw Error('Awaji operator key mismatch');
  const client =
    publicClient ||
    createPublicClient({
      chain: awaji,
      transport: http(rpcUrl || awaji.rpcUrls.default.http[0], {
        timeout: 12000,
        retryCount: 1,
      }),
    });
  const wallet =
    walletClient ||
    createWalletClient({
      account,
      chain: awaji,
      transport: http(rpcUrl || awaji.rpcUrls.default.http[0], {
        timeout: 12000,
        retryCount: 0,
      }),
    });
  const api =
    multiBaas ||
    multibaasClient(
      process.env.MULTIBAAS_DEPLOYMENT_URL,
      process.env.MULTIBAAS_API_KEY,
    );
  const address = deployment.contract;
  const treasuryBalance = () =>
    client.readContract({
      address: MJPY,
      abi: tokenAbi,
      functionName: 'balanceOf',
      args: [address],
    });
  const read = (
    functionName,
    args = []
  ) =>
    client.readContract({ address, abi, functionName, args });

  async function check() {
    if ((await client.getChainId()) !== 6497)
      throw Error('Awaji RPC is not testnet 6497');
    const [operator, paused, rate, fee, token, decimals] = await Promise.all([
      read('operator'),
      read('paused'),
      read('atomicPerJpy'),
      read('FEE_BPS'),
      read('token'),
      client.readContract({
        address: MJPY,
        abi: tokenAbi,
        functionName: 'decimals',
      }),
    ]);
    if (
      !equal(operator, account.address) ||
      paused ||
      rate !== 1000000n ||
      fee !== 200n ||
      !equal(token, MJPY) ||
      decimals !== 6
    )
      throw Error('Awaji treasury configuration mismatch or paused');
    return {
      contract: address,
      operator: account.address,
      treasuryAtomic: String(await treasuryBalance()),
    };
  }
  let queue = Promise.resolve();

  function pay(input) {
    const run = queue.then(() => execute(input));
    queue = run.catch(() => {});
    return run;
  }

  async function execute(input) {
    if (
      input.quote.network !== 'mizuhiki' ||
      input.quote.payoutAsset !== 'MJPY' ||
      !/^[0-9a-f]{16}$/i.test(input.cardId) ||
      input.cardId.toLowerCase() === 'ffffffffffffffff'
    )
      throw Error('Awaji requires a physical card');
    await check();
    const scoped = value =>
      input.demoRound ? `${input.demoRound}:${value}` : value;
    const card =
      '0x' +
      createHmac('sha256', secret)
        .update('UNSUI_CARD_V1:')
        .update(scoped(input.cardId).toLowerCase())
        .digest('hex');
    const request =
      '0x' + createHash('sha256').update(scoped(input.requestId)).digest('hex');
    const journalKey = request.slice(2);
    const file = journalDir ? path.join(journalDir, journalKey + '.json') : null;
    const binding = createHash('sha256')
      .update(JSON.stringify([card, input.scannedBalanceJpy, input.quote]))
      .digest('hex');
    let saved;
    try {
      saved = journal
        ? await journal.get(journalKey)
        : JSON.parse(await fs.readFile(file, 'utf8'));
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
    if (saved && saved.binding !== binding)
      throw Error('Awaji request belongs to another payout');
    const amount = BigInt(input.quote.amountJpy),
      expectedAtomic = amount * 980000n;
    const prior = await read('getReceipt', [request]);
    if (!saved) {
      if (prior.sequence !== 0n)
        throw Error(
          'Existing Awaji receipt requires its original transaction journal',
        );
      const [redeemed, sequence] = await read('cards', [card]);
      if (redeemed + amount > BigInt(input.scannedBalanceJpy))
        throw Error('This card balance has already been refunded on chain');
      if ((await treasuryBalance()) < expectedAtomic)
        throw Error('Treasury needs more MJPY. No payout was submitted.');
      const block = await client.getBlock();
      const claim = {
        card,
        request,
        recipient: input.quote.recipient,
        amountJpy: amount,
        observedJpy: BigInt(input.scannedBalanceJpy),
        expectedSequence: sequence,
        expiresAt: block.timestamp + 240n,
      };
      await client.simulateContract({
        account,
        address,
        abi,
        functionName: 'refund',
        args: [claim],
      });
      const data = encodeFunctionData({
        abi,
        functionName: 'refund',
        args: [claim],
      });
      const prepared = await wallet.prepareTransactionRequest({
        account,
        to: address,
        data,
        value: 0n,
      });
      const maxCost =
        prepared.gas * (prepared.maxFeePerGas ?? prepared.gasPrice);
      if (maxCost > 20000000000000000n)
        throw Error(
          'Awaji gas exceeds the configured 0.02 MIZU limit. Retry later.',
        );
      if ((await client.getBalance({ address: account.address })) < maxCost)
        throw Error('Operator needs MIZU for gas. No payout was submitted.');
      const raw = await wallet.signTransaction(prepared);
      saved = { binding, raw, hash: keccak256(raw) };
      if (journal) {
        await journal.put(journalKey, saved);
      } else {
        await fs.mkdir(journalDir, { recursive: true });
        const h = await fs.open(file + '.tmp', 'w', 0o600);
        try {
          await h.writeFile(JSON.stringify(saved));
          await h.sync();
        } finally {
          await h.close();
        }
        await fs.rename(file + '.tmp', file);
      }
    }
    // Persist signed bytes before broadcasting. Every retry uses the identical nonce and hash.
    let tx;
    try {
      tx = await client.getTransactionReceipt({ hash: saved.hash });
    } catch (e) {
      if (e.name !== 'TransactionReceiptNotFoundError')
        throw Error('Cannot check Awaji transaction. Retry the same request.');
    }
    if (!tx) {
      try {
        await requireAwaji(api);
        sdkResult(
          await api.chains.submitSignedTransaction({ signedTx: saved.raw }),
        );
      } catch {
        /* Already known, or uncertain transport: reconcile the saved hash below. */
      }
    }
    try {
      tx = await client.waitForTransactionReceipt({
        hash: saved.hash,
        confirmations: 2,
        timeout: 90000,
      });
    } catch {
      throw Error(
        'Awaji confirmation is pending. Retry the same request to check its transaction.',
      );
    }
    if (
      tx.status !== 'success' ||
      !equal(tx.transactionHash, saved.hash) ||
      !equal(tx.to, address)
    )
      throw Error(
        'Awaji payout failed; keep this request reference for review.',
      );
    const r = await read('getReceipt', [request]);
    const hash = receiptHash(address, request, r);
    const events = parseEventLogs({
      abi,
      logs: tx.logs,
      eventName: 'Refunded',
    });
    if (
      r.sequence === 0n ||
      !equal(r.card, card) ||
      !equal(r.recipient, input.quote.recipient) ||
      r.amountJpy !== amount ||
      r.observedJpy !== BigInt(input.scannedBalanceJpy) ||
      r.amountAtomic !== expectedAtomic ||
      !equal(r.hash, hash) ||
      !events.some(
        e =>
          equal(e.address, address) &&
          equal(e.args.request, request) &&
          equal(e.args.receiptHash, hash) &&
          equal(e.args.card, card) &&
          equal(e.args.recipient, input.quote.recipient) &&
          e.args.amountAtomic === expectedAtomic &&
          e.args.amountJpy === amount &&
          e.args.sequence === r.sequence,
      )
    )
      throw Error('Awaji receipt does not match this payout');
    return {
      status: 'confirmed',
      transactionDigest: saved.hash,
      chainReceiptId: r.hash,
      chainNetwork: 'awaji',
      tokenAddress: MJPY,
      payoutAsset: 'MJPY',
      amountAtomic: String(r.amountAtomic),
    };
  }
  return { pay, check };
}
