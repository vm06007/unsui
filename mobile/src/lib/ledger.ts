import { createDemoLedger } from './demoLedger';
import {
  listBackend,
  recordBackend,
  resetBackend,
  prepareBackendRecord,
} from './backendLedger';
import { BACKEND_URL } from '../config';
// All balances and receipts come from the backend. No offline refund store.
export const demoLedger = {
  prepare: (input: Parameters<typeof prepareBackendRecord>[1]) =>
    prepareBackendRecord(BACKEND_URL, input),
  async reset() {
    return resetBackend(BACKEND_URL);
  },
  async list() {
    return listBackend(BACKEND_URL);
  },
  async record(
    input: Parameters<ReturnType<typeof createDemoLedger>['record']>[0] & {
      worldVerificationId?: string;
    },
  ) {
    return recordBackend(BACKEND_URL, input);
  },
};
