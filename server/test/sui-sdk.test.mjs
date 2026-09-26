import { test } from 'node:test';
import assert from 'node:assert/strict';
import { executeStoredTransaction } from '../sui/sdk-transaction.mjs';

test('Sui retry reuses saved signature after uncertain submission', async () => {
  let saved, signatures = 0, sends = 0, waits = 0;
  const options = {
    key: 'request', binding: 'binding',
    journal: { get: async () => saved, put: async (_, value) => { saved = value; } },
    signer: { signTransaction: async () => { signatures++; return { bytes: 'AQ==', signature: 'signature' }; } },
    build: async () => ({ build: async () => new Uint8Array([1]), getDigest: async () => 'digest' }),
    client: {
      executeTransaction: async () => { sends++; throw Error('lost response'); },
      waitForTransaction: async () => { if (++waits === 1) throw Error('timeout'); return { $kind: 'Transaction' }; },
    },
  };
  await assert.rejects(executeStoredTransaction(options), /timeout/);
  assert.equal(await executeStoredTransaction(options), 'digest');
  assert.equal(signatures, 1);
  assert.equal(sends, 2);
  await assert.rejects(executeStoredTransaction({ ...options, binding: 'changed' }), /conflict/);
});

test('Sui never broadcasts if signed transaction cannot be persisted', async () => {
  let sent = false;
  await assert.rejects(executeStoredTransaction({
    key: 'request', binding: 'binding',
    journal: { get: async () => null, put: async () => { throw Error('database unavailable'); } },
    signer: { signTransaction: async () => ({ bytes: 'AQ==', signature: 'signature' }) },
    build: async () => ({ build: async () => new Uint8Array([1]), getDigest: async () => 'digest' }),
    client: { executeTransaction: async () => { sent = true; } },
  }), /database unavailable/);
  assert.equal(sent, false);
});
