import { NativeModules, Platform } from 'react-native';
import { PayoutNetwork, recipientError } from './refundQuote';
export const WALLET_CHAINS = { ethereum: 1, mizuhiki: 6497 } as const;
export type EvmNetwork = keyof typeof WALLET_CHAINS;
export type WalletConnection = { address: string; chainId: number };
export type WalletSignature = WalletConnection & {
  message: string;
  signature: string;
  nonce: string;
  issuedAt: string;
};
const bridge = () => {
  const native = NativeModules.DeviceWallet;
  if (Platform.OS !== 'android' || !native)
    throw Error(
      'The dGen1 wallet is unavailable here. Enter your recipient address manually.',
    );
  return native;
};
export const isEvmNetwork = (network: PayoutNetwork): network is EvmNetwork =>
  network !== 'sui';
export async function isDeviceWalletAvailable(): Promise<boolean> {
  try {
    return !!(await bridge().isAvailable());
  } catch {
    return false;
  }
}
export async function cancelDeviceWallet(): Promise<void> {
  if (Platform.OS === 'android') await NativeModules.DeviceWallet?.cancel();
}
export function validateConnection(value: WalletConnection): WalletConnection {
  if (
    !value ||
    typeof value.address !== 'string' ||
    recipientError(value.address, 'ethereum') ||
    !Number.isSafeInteger(value.chainId) ||
    value.chainId < 1
  )
    throw Error(
      'The wallet returned an invalid address or network. Try manual entry.',
    );
  return { address: value.address, chainId: value.chainId };
}
export const connectDeviceWallet = async () =>
  validateConnection(await bridge().connect());
export async function switchDeviceWallet(network: EvmNetwork) {
  const result = validateConnection(
    await bridge().switchNetwork(WALLET_CHAINS[network]),
  );
  if (result.chainId !== WALLET_CHAINS[network])
    throw Error(
      'The wallet did not switch to the selected payout network. Use manual entry if it is unsupported.',
    );
  return result;
}
export function destinationMessage(
  address: string,
  chainId: number,
  nonce: string,
  issuedAt: string,
) {
  const network =
    chainId === 1 ? 'Ethereum (1)' : 'Mizuhiki Awaji Testnet (6497)';
  return `UnSui demo refund destination\n\nAddress: ${address}\nNetwork: ${network}\nRequest: ${nonce}\nIssued at: ${issuedAt}\n\nI choose this wallet as my demo refund destination. This message does not authorize a transaction, token approval or transfer. No funds will be sent.`;
}
export function validateWalletSignature(
  result: WalletSignature,
  network: EvmNetwork,
  address: string,
): WalletSignature {
  validateConnection(result);
  if (
    result.address.toLowerCase() !== address.toLowerCase() ||
    result.chainId !== WALLET_CHAINS[network]
  )
    throw Error(
      'The signing address or network changed. Reconnect your wallet.',
    );
  if (
    typeof result.signature !== 'string' ||
    !/^0x(?:[0-9a-fA-F]{2}){65,4096}$/.test(result.signature) ||
    typeof result.nonce !== 'string' ||
    !/^[0-9a-f-]{36}$/i.test(result.nonce) ||
    typeof result.issuedAt !== 'string' ||
    !Number.isFinite(Date.parse(result.issuedAt)) ||
    Math.abs(Date.now() - Date.parse(result.issuedAt)) > 5 * 60 * 1000 ||
    result.message !==
      destinationMessage(
        result.address,
        result.chainId,
        result.nonce,
        result.issuedAt,
      )
  )
    throw Error(
      'The wallet returned an invalid or stale signing response. Try again.',
    );
  // This validates the native response, not cryptographic EOA/ERC-1271 ownership.
  return result;
}
export async function signDeviceWallet(network: EvmNetwork, address: string) {
  return validateWalletSignature(
    await bridge().signAddress(WALLET_CHAINS[network], address),
    network,
    address,
  );
}
