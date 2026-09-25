import { createAsyncStorage } from '@react-native-async-storage/async-storage';
import {
  createDemoLedger,
  decodeDemoReceipts,
  DemoReceipt,
} from './demoLedger';
import { normalizeBackendUrl } from './preferences';
type RecordInput = Parameters<ReturnType<typeof createDemoLedger>['record']>[0];
const requests = createAsyncStorage('unsui-backend-requests');
export async function backendRequest(
  url: string,
  path: string,
  body?: unknown,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(normalizeBackendUrl(url) + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await response.json();
    if (!response.ok)
      throw Error(data.error || 'The backend could not complete this request.');
    return data;
  } catch (error) {
    if (controller.signal.aborted)
      throw Error(
        'Backend timed out. Retry with the same card and quote to check the saved request.',
      );
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
export async function checkBackend(url: string) {
  const result = await backendRequest(url, '/health');
  if (
    result.service !== 'unsui-dev-ledger' ||
    result.version !== 1 ||
    result.mode !== 'demo'
  )
    throw Error('This is not a compatible UnSui demo ledger.');
  await listBackend(url);
}
export async function listBackend(url: string): Promise<DemoReceipt[]> {
  return decodeDemoReceipts(
    JSON.stringify(await backendRequest(url, '/ledger')),
  );
}
export async function recordBackend(
  url: string,
  input: RecordInput,
): Promise<DemoReceipt> {
  // Keep the same request after a lost response or app restart. Never fall back locally.
  const fingerprint = JSON.stringify([
    normalizeBackendUrl(url),
    input.cardId.toLowerCase(),
    input.scannedBalanceJpy,
    input.quote,
  ]);
  const key = 'pending:' + fingerprint;
  const saved = await requests.getItem(key);
  const requestId = saved || input.requestId;
  if (!saved) await requests.setItem(key, requestId);
  const result = await backendRequest(url, '/refunds', { ...input, requestId });
  const receipts = await listBackend(url);
  const receipt = receipts.find(r => r.requestId === requestId);
  if (
    !receipt ||
    result.receipt?.id !== receipt.id ||
    receipt.cardId !== input.cardId.toLowerCase() ||
    receipt.network !== input.quote.network ||
    receipt.recipient !== input.quote.recipient ||
    receipt.amountJpy !== input.quote.amountJpy
  )
    throw Error(
      'Could not verify the saved backend receipt. Retry this request.',
    );
  await requests.removeItem(key);
  return receipt;
}

export async function resetBackend(url: string) {
  await backendRequest(url, '/ledger/reset', { confirm: 'reset-demo-ledger' });
  await requests.clear();
}
