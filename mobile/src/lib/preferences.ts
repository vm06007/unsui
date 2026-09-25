import { createAsyncStorage } from '@react-native-async-storage/async-storage';
import type { DisplayLanguage } from './stationTranslations';
const storage = createAsyncStorage('unsui-preferences');
export type LedgerSettings = { url: string };
export const DEFAULT_LEDGER: LedgerSettings = {
  url: 'http://localhost:4100',
};
export function normalizeBackendUrl(value: string) {
  const url = new URL(value.trim());
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.pathname !== '/' && url.pathname !== '')
  )
    throw Error('Enter a backend origin, for example http://localhost:4100.');
  return url.origin;
}
export async function loadLedgerSettings(): Promise<LedgerSettings> {
  const raw = await storage.getItem('ledger');
  if (!raw) return DEFAULT_LEDGER;
  const value = JSON.parse(raw);
  return { url: normalizeBackendUrl(value.url) };
}
export async function saveLedgerSettings(value: LedgerSettings) {
  await storage.setItem('ledger', JSON.stringify(value));
}
export async function getStoredLanguage(): Promise<DisplayLanguage> {
  return (await storage.getItem('history-language')) === 'en' ? 'en' : 'ja';
}
export async function storeLanguage(value: DisplayLanguage) {
  await storage.setItem('history-language', value);
}
