import { Transaction } from '@mysten/sui/transactions';

export function marketRefundTransaction({ deployment, input, card, request, sequence }) {
  const tx = new Transaction();
  tx.setSender(deployment.publisher);
  tx.setGasBudget(50000000);
  tx.moveCall({
    target: `${deployment.packageId}::refunds::refund_market`,
    arguments: [
      tx.object(deployment.marketPolicyId),
      tx.object(deployment.ledgerId),
      tx.pure.u64(input.quote.pricing.amountMist),
      tx.pure.vector('u8', card),
      tx.pure.vector('u8', request),
      tx.pure.address(input.quote.recipient),
      tx.pure.u64(input.quote.amountJpy),
      tx.pure.u64(input.scannedBalanceJpy),
      tx.pure.u64(sequence),
      tx.pure.u64(input.quote.pricing.expiresAt),
      tx.object('0x6'),
    ],
  });
  return tx;
}

export async function executeStoredTransaction({ client, signer, journal, key, binding, build }) {
  let saved = await journal.get(key);
  if (saved && saved.binding !== binding) throw Error('Sui transaction journal conflict');
  if (!saved) {
    const tx = await build();
    const bytes = await tx.build({ client });
    const signed = await signer.signTransaction(bytes);
    saved = { binding, bytes: signed.bytes, signature: signed.signature, digest: await tx.getDigest() };
    // A failed database write must prevent broadcast. Retries reuse these exact bytes.
    await journal.put(key, saved);
  }
  try {
    await client.executeTransaction({
      transaction: Buffer.from(saved.bytes, 'base64'),
      signatures: [saved.signature],
    });
  } catch {
    // The request may have reached the chain. Reconcile the saved digest.
  }
  const result = await client.waitForTransaction({ digest: saved.digest });
  if (result.$kind !== 'Transaction') throw Error('Sui rejected the saved payout transaction');
  return saved.digest;
}
