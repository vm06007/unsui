import { createDemoLedger } from './demoLedger';
import { listBackend, recordBackend } from './backendLedger';
import { loadLedgerSettings } from './preferences';
// All balances and receipts come from the backend. No offline refund store.
export const demoLedger = {
  async list() {
    const settings = await loadLedgerSettings();
    return listBackend(settings.url);
  },
  async record(
    input: Parameters<ReturnType<typeof createDemoLedger>['record']>[0],
  ) {
    const settings = await loadLedgerSettings();
    return recordBackend(settings.url, input);
  },
};
