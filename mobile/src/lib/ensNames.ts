import { BACKEND_URL } from '../config';
import { recipientError } from './refundQuote';
import type { ResolvedSuiName } from './suiNames';
export async function resolveEnsName(
  input: string,
  signal?: AbortSignal,
): Promise<ResolvedSuiName> {
  const name = input.trim();
  if (!name.toLowerCase().endsWith('.eth') || name.length > 255)
    throw Error('Enter a valid .eth name.');
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener('abort', abort);
  const timer = setTimeout(abort, 12000);
  try {
    const response = await fetch(`${BACKEND_URL}/ens/resolve-name`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
      signal: controller.signal,
    });
    const result = await response.json();
    if (!response.ok)
      throw Error(result.error || 'ENS is unavailable. Please retry.');
    if (
      typeof result.name !== 'string' ||
      typeof result.address !== 'string' ||
      recipientError(result.address, 'ethereum')
    )
      throw Error('This name has no usable destination address.');
    return { name: result.name, address: result.address, network: 'mainnet' };
  } catch (error) {
    if (controller.signal.aborted)
      throw Error(
        signal?.aborted
          ? 'Name lookup cancelled.'
          : 'Name lookup timed out. Please retry.',
      );
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
