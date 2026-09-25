import { Platform } from 'react-native';
import NfcManager from 'react-native-nfc-manager';
import { parseBalance, readCard, readCommand } from '../src/lib/suica';
jest.mock('react-native-nfc-manager', () => ({
  __esModule: true,
  default: {
    isSupported: jest.fn(),
    start: jest.fn(),
    isEnabled: jest.fn(),
    requestTechnology: jest.fn(),
    getTag: jest.fn(),
    transceive: jest.fn(),
    sendFelicaCommandIOS: jest.fn(),
    cancelTechnologyRequest: jest.fn().mockResolvedValue(undefined),
  },
  NfcTech: { NfcF: 'NfcF', FelicaIOS: 'felica' },
}));
const idm = '0123456789abcdef';
function response(balance: number) {
  const block = Array(16).fill(0);
  block[10] = balance % 256;
  block[11] = Math.floor(balance / 256);
  return [29, 7, ...[1, 35, 69, 103, 137, 171, 205, 239], 0, 0, 1, ...block];
}
test('reads zero, odd amounts and maximum balance, with either frame format', () => {
  for (const yen of [0, 575, 757, 20000]) {
    expect(parseBalance(response(yen), idm)).toBe(yen);
    expect(parseBalance(response(yen).slice(1), idm)).toBe(yen);
  }
});
test('rejects short packets, wrong card, status errors and implausible balance', () => {
  expect(() => parseBalance([29, 7], idm)).toThrow();
  expect(() => parseBalance(response(500), '1111111111111111')).toThrow();
  for (const index of [10, 11, 12]) {
    const bad = response(500);
    bad[index] = 2;
    expect(() => parseBalance(bad, idm)).toThrow();
  }
  expect(() => parseBalance(response(20001), idm)).toThrow();
});
test('read-only command defaults to the newest history block', () => {
  expect(readCommand(idm)).toEqual([
    16, 6, 1, 35, 69, 103, 137, 171, 205, 239, 1, 15, 9, 1, 128, 0,
  ]);
  expect(readCommand(idm, false)).toEqual(readCommand(idm).slice(1));
  expect(() => readCommand('invalid')).toThrow();
});
test('unsupported NFC fails clearly and cleans up', async () => {
  (NfcManager.isSupported as jest.Mock).mockResolvedValue(false);
  await expect(readCard(() => false)).rejects.toThrow('does not support NFC');
  expect(NfcManager.cancelTechnologyRequest).toHaveBeenCalled();
});
test('cancel before technology acquisition does not start scanning', async () => {
  (NfcManager.isSupported as jest.Mock).mockResolvedValue(true);
  await expect(readCard(() => true)).rejects.toThrow('cancelled');
  expect(NfcManager.requestTechnology).not.toHaveBeenCalled();
});

beforeEach(() => jest.clearAllMocks());
function ready() {
  Object.defineProperty(Platform, 'OS', {
    value: 'android',
    configurable: true,
  });
  (NfcManager.isSupported as jest.Mock).mockResolvedValue(true);
  (NfcManager.isEnabled as jest.Mock).mockResolvedValue(true);
  (NfcManager.getTag as jest.Mock).mockResolvedValue({ id: idm });
}
test('retains balance and marks partial history if a later read fails', async () => {
  ready();
  (NfcManager.transceive as jest.Mock)
    .mockResolvedValueOnce(response(575))
    .mockRejectedValueOnce(Error('removed'));
  const card = await readCard(() => false);
  expect(card.balanceJpy).toBe(575);
  expect(card.history).toHaveLength(1);
  expect(card.historyLimited).toBe(true);
  expect(NfcManager.cancelTechnologyRequest).toHaveBeenCalled();
});
test('stops at an empty history block and never requests beyond block 19', async () => {
  ready();
  (NfcManager.transceive as jest.Mock)
    .mockResolvedValueOnce(response(575))
    .mockResolvedValueOnce(response(0));
  expect((await readCard(() => false)).historyLimited).toBe(false);
  expect(NfcManager.transceive).toHaveBeenCalledTimes(2);
  jest.clearAllMocks();
  (NfcManager.transceive as jest.Mock).mockResolvedValue(response(575));
  expect((await readCard(() => false)).history).toHaveLength(20);
  expect(NfcManager.transceive).toHaveBeenCalledTimes(20);
  expect(readCommand(idm, true, 19).at(-1)).toBe(19);
  expect(() => readCommand(idm, true, 20)).toThrow();
});
