import { Alert, Platform, ToastAndroid } from 'react-native';

export function showScanError(error: unknown): void {
  const raw =
    typeof error === 'string'
      ? error
      : error instanceof Error
      ? error.message
      : '';
  let detail = raw.trim() || 'Could not read your card.';
  if (/tag.*lost|tag.*disconnect/i.test(detail))
    detail = 'Card moved too soon. Hold it still against your phone.';
  else if (/nfc.*disabled|nfc.*not enabled/i.test(detail))
    detail = 'Turn on NFC to scan your card.';
  const message = `${detail.replace(/[.\s]+$/, '')}. Please try again.`;
  if (Platform.OS === 'android') ToastAndroid.show(message, ToastAndroid.LONG);
  else Alert.alert('Scan failed', message);
}
