import { AppState, Linking } from 'react-native';
import { backendRequest } from './backendLedger';
import { BACKEND_URL } from '../config';
import type { RefundQuote } from './refundQuote';
export async function verifyRefundHuman(
  input: {
    requestId: string;
    cardId: string;
    scannedBalanceJpy: number;
    quote: RefundQuote;
  },
  signal: AbortSignal,
): Promise<string | undefined> {
  if (input.quote.amountJpy <= 1000) return undefined;
  const session = await backendRequest(BACKEND_URL, '/world/start', input);
  const cancel = () => {
    backendRequest(BACKEND_URL, '/world/cancel', {
      verificationId: session.verificationId,
    }).catch(() => {});
  };
  signal.addEventListener('abort', cancel);
  try {
    if (signal.aborted) throw Error('Human check cancelled.');
    await Linking.openURL(session.url);
    const deadline = Date.now() + 300000;
    while (Date.now() < deadline && !signal.aborted) {
      const result = await backendRequest(BACKEND_URL, '/world/status', {
        verificationId: session.verificationId,
      });
      if (signal.aborted) throw Error('Human check cancelled.');
      if (
        ['verified', 'bypassed'].includes(result.status) &&
        AppState.currentState === 'active'
      )
        return session.verificationId;
      if (['denied', 'expired', 'used'].includes(result.status))
        throw Error(
          'Human check was cancelled, rejected or expired. Please try again.',
        );
      await new Promise<void>(resolve => setTimeout(resolve, 1000));
    }
    throw Error('Human check cancelled or expired.');
  } catch (error) {
    cancel();
    throw error;
  } finally {
    signal.removeEventListener('abort', cancel);
  }
}
