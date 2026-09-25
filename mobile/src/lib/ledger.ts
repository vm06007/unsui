import { createDemoLedger } from './demoLedger';
import { listBackend, recordBackend, resetBackend } from './backendLedger';
import { BACKEND_URL } from '../config';
// All balances and receipts come from the backend. No offline refund store.
export const demoLedger = {
  async reset() {
    if (!__DEV__)
      throw Error('Ledger reset is available in development builds only.');
    await resetBackend(BACKEND_URL);
  },
  async list() {
    return listBackend(BACKEND_URL);
  },
  async record(
    input: Parameters<ReturnType<typeof createDemoLedger>['record']>[0],
  ) {
    return recordBackend(BACKEND_URL, input);
  },
};
