import type { CardBalance } from './suica';
export const SAMPLE_CARD_ID = 'ffffffffffffffff';
export function sampleCard(): CardBalance {
  return {
    idm: SAMPLE_CARD_ID,
    balanceJpy: 1500,
    historyLimited: false,
    history: [
      {
        index: 0,
        date: '2026-08-20',
        activity: 'Ticket gate',
        balanceJpy: 1500,
        changeJpy: -320,
        entry: '渋谷 · 3号線銀座',
        exit: '虎ノ門 · 3号線銀座',
        terminal: 9,
        process: 1,
      },
      {
        index: 1,
        date: '2026-08-18',
        activity: 'Top-up (vending machine)',
        balanceJpy: 1820,
        changeJpy: 500,
        entry: null,
        exit: null,
        terminal: 0x07,
        process: 0x46,
      },
      {
        index: 2,
        date: '2026-08-18',
        activity: 'Shop / POS',
        balanceJpy: 1320,
        changeJpy: null,
        entry: null,
        exit: null,
        terminal: 0x15,
        process: 2,
      },
    ],
  };
}
