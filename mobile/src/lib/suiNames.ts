import { BACKEND_URL } from '../config';
import { recipientError } from './refundQuote';
export const SUI_NAMES_ENDPOINT = `${BACKEND_URL}/sui/resolve-name`;
export const OPERATOR_SUI_ADDRESS = '0x8e305ff1ca0058eb7462fe56011a78774966577b09f4f32e96d0d7fa589c1f4a';
export const DEVELOPER_SUI_NAME = 'kartik.sui';
export type ResolvedSuiName = {
  name: string;
  address: string;
  network: 'mainnet';
};
export async function resolveSuiName(
  input: string,
  signal?: AbortSignal,
): Promise<ResolvedSuiName> {
  const name = input.trim().toLowerCase();
  if (
    name.length > 235 ||
    !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.sui$/.test(
      name,
    )
  )
    throw Error('Enter a valid .sui name.');
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener('abort', abort);
  const timer = setTimeout(abort, 10000);
  try {
    const response = await fetch(SUI_NAMES_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        query:
          'query ResolveName($name: String!) { nameRecord(name: $name) { domain target { address } } }',
        variables: { name },
      }),
    });
    if (!response.ok)
      throw Error('SuiNS is unavailable. Check your connection and retry.');
    const result = await response.json();
    if (result.errors?.length)
      throw Error('SuiNS could not resolve this name. Please retry.');
    const record = result.data?.nameRecord;
    if (!record) throw Error(`${name} was not found on Sui mainnet.`);
    if (
      typeof record.target?.address !== 'string' ||
      recipientError(record.target.address, 'sui')
    )
      throw Error('This name has no usable destination address.');
    return { name, address: record.target.address, network: 'mainnet' };
  } catch (error) {
    if (controller.signal.aborted)
      throw Error(
        signal?.aborted
          ? 'Name lookup cancelled.'
          : 'Name lookup timed out. Please retry.',
      );
    throw error instanceof Error
      ? error
      : Error('Could not resolve the name. Check your connection.');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
