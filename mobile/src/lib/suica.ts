import { Platform } from 'react-native';
import NfcManager, { NfcTech } from 'react-native-nfc-manager';

import { decodeHistory, HistoryRecord } from './history';
export type CardBalance = {
  idm: string;
  balanceJpy: number;
  history: HistoryRecord[];
  historyLimited: boolean;
};
export class ScanError extends Error {
  constructor(
    public code: 'unsupported' | 'disabled' | 'card',
    message: string,
  ) {
    super(message);
  }
}
export function readCommand(idm: string, framed = true, block = 0): number[] {
  if (!/^[\da-f]{16}$/i.test(idm))
    throw new ScanError('card', 'Unsupported card. Try a physical Suica card.');
  if (!Number.isInteger(block) || block < 0 || block >= 20)
    throw new Error('Invalid history block');
  const bytes = idm.match(/../g)!.map(byte => parseInt(byte, 16));
  const command = [0x06, ...bytes, 1, 0x0f, 0x09, 1, 0x80, block];
  return framed ? [command.length + 1, ...command] : command;
}
export function parseBlock(response: number[], idm: string): number[] {
  const invalid = () =>
    new ScanError(
      'card',
      'Could not read this card. Hold a physical Suica card still and try again.',
    );
  if (
    !response.every(byte => Number.isInteger(byte) && byte >= 0 && byte <= 255)
  )
    throw invalid();
  const bytes =
    response.length === 29 && response[0] === 29 ? response.slice(1) : response;
  if (
    bytes.length !== 28 ||
    bytes[0] !== 0x07 ||
    bytes[9] !== 0 ||
    bytes[10] !== 0 ||
    bytes[11] !== 1
  )
    throw invalid();
  const returnedId = bytes
    .slice(1, 9)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
  if (returnedId !== idm.toLowerCase()) throw invalid();
  const balance = bytes[22] + bytes[23] * 256;
  if (balance > 20000) throw invalid();
  return bytes.slice(12);
}
export function parseBalance(response: number[], idm: string): number {
  const block = parseBlock(response, idm);
  return block[10] + block[11] * 256;
}
export async function cancelScan() {
  await NfcManager.cancelTechnologyRequest().catch(() => {});
}
export async function readCard(
  cancelled: () => boolean,
  options: { history?: boolean } = {},
): Promise<CardBalance> {
  const check = () => {
    if (cancelled()) throw new Error('Scan cancelled.');
  };
  try {
    if (!(await NfcManager.isSupported()))
      throw new ScanError(
        'unsupported',
        'This device does not support NFC scanning. Use an NFC-capable phone.',
      );
    check();
    await NfcManager.start();
    check();
    if (Platform.OS === 'android' && !(await NfcManager.isEnabled()))
      throw new ScanError(
        'disabled',
        'Turn on NFC in your phone settings, then scan again.',
      );
    check();
    await NfcManager.requestTechnology(
      Platform.OS === 'ios' ? NfcTech.FelicaIOS : NfcTech.NfcF,
      { alertMessage: 'Hold your Suica card near the phone.' },
    );
    check();
    const tag = (await NfcManager.getTag()) as {
      id?: string;
      idm?: string;
    } | null;
    const idm = (tag?.idm || tag?.id || '').toLowerCase();
    const blocks: number[][] = [];
    let historyLimited = false;
    for (let block = 0; block < (options.history === false ? 1 : 20); block++) {
      check();
      try {
        const command = readCommand(idm, Platform.OS !== 'ios', block);
        const response =
          Platform.OS === 'ios'
            ? await NfcManager.sendFelicaCommandIOS(command)
            : await NfcManager.transceive(command);
        check();
        const data = parseBlock(response, idm);
        if (block > 0 && data.every(byte => byte === 0)) break;
        blocks.push(data);
      } catch (error) {
        check();
        if (block === 0) throw error;
        historyLimited = true;
        break;
      }
    }
    return {
      idm,
      balanceJpy: blocks[0][10] + blocks[0][11] * 256,
      history: decodeHistory(blocks),
      historyLimited,
    };
  } finally {
    await cancelScan();
  }
}
