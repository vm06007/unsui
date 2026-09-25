import { createAsyncStorage } from '@react-native-async-storage/async-storage';
import { createDemoLedger } from './demoLedger';

// Local demo bookkeeping only; never use this device-controlled store to authorize real payouts.
export const demoLedger = createDemoLedger(createAsyncStorage('unsui-demo'));
