import { NativeModules, Platform } from 'react-native';
import {
  connectDeviceWallet,
  destinationMessage,
  isDeviceWalletAvailable,
  signDeviceWallet,
  switchDeviceWallet,
  validateWalletSignature,
} from '../src/lib/deviceWallet';
const address = `0x${'1'.repeat(40)}`;
const native = {
  isAvailable: jest.fn(),
  connect: jest.fn(),
  switchNetwork: jest.fn(),
  signAddress: jest.fn(),
};
beforeEach(() => {
  Object.defineProperty(Platform, 'OS', {
    value: 'android',
    configurable: true,
  });
  NativeModules.DeviceWallet = native;
  jest.clearAllMocks();
});
afterEach(() => {
  delete NativeModules.DeviceWallet;
});
function signed(chainId = 6497) {
  const nonce = '12345678-1234-1234-1234-123456789012';
  const issuedAt = new Date().toISOString();
  return {
    address,
    chainId,
    nonce,
    issuedAt,
    message: destinationMessage(address, chainId, nonce, issuedAt),
    signature: `0x${'a'.repeat(130)}`,
  };
}
test('handles unavailable wallets and invalid connection responses', async () => {
  native.isAvailable.mockRejectedValueOnce(Error('missing'));
  expect(await isDeviceWalletAvailable()).toBe(false);
  native.connect.mockResolvedValueOnce({ address: 'invalid', chainId: 1 });
  await expect(connectDeviceWallet()).rejects.toThrow('invalid address');
});
test('uses the selected chain for switch and signing instead of hard-coded Ethereum', async () => {
  native.switchNetwork.mockResolvedValueOnce({ address, chainId: 6497 });
  await expect(switchDeviceWallet('mizuhiki')).resolves.toEqual({
    address,
    chainId: 6497,
  });
  expect(native.switchNetwork).toHaveBeenCalledWith(6497);
  native.signAddress.mockResolvedValueOnce(signed());
  await signDeviceWallet('mizuhiki', address);
  expect(native.signAddress).toHaveBeenCalledWith(6497, address);
  native.signAddress.mockResolvedValueOnce(signed(1));
  await signDeviceWallet('ethereum', address);
  expect(native.signAddress).toHaveBeenLastCalledWith(1, address);
});
test('rejects account, network, message and freshness mismatches', () => {
  expect(() => validateWalletSignature(signed(1), 'mizuhiki', address)).toThrow(
    'changed',
  );
  expect(() =>
    validateWalletSignature(signed(), 'mizuhiki', `0x${'2'.repeat(40)}`),
  ).toThrow('changed');
  expect(() =>
    validateWalletSignature(
      { ...signed(), message: 'send money' },
      'mizuhiki',
      address,
    ),
  ).toThrow('invalid');
  expect(() =>
    validateWalletSignature(
      { ...signed(), issuedAt: '2020-01-01' },
      'mizuhiki',
      address,
    ),
  ).toThrow('stale');
  expect(() =>
    validateWalletSignature(
      { ...signed(), signature: '0x123' },
      'mizuhiki',
      address,
    ),
  ).toThrow('invalid');
});
