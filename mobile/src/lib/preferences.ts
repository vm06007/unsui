import { createAsyncStorage } from '@react-native-async-storage/async-storage';
import type { DisplayLanguage } from './stationTranslations';
const storage = createAsyncStorage('unsui-preferences');
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
export async function getStoredLanguage(): Promise<DisplayLanguage> {
  return (await storage.getItem('history-language')) === 'en' ? 'en' : 'ja';
}
export async function storeLanguage(value: DisplayLanguage) {
  await storage.setItem('history-language', value);
}
