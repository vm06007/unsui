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
        date: '2026-09-25',
        activity: 'Rail travel',
        balanceJpy: 1500,
        changeJpy: -180,
        entry: '渋谷 · 3号線銀座',
        exit: '虎ノ門 · 3号線銀座',
        terminal: 9,
        process: 1,
      },
      {
        index: 1,
        date: '2026-09-25',
        activity: 'Purchase',
        balanceJpy: 1680,
        changeJpy: -320,
        entry: null,
        exit: null,
        terminal: 0xc7,
        process: 0x46,
      },
      {
        index: 2,
        date: '2026-09-25',
        activity: 'Top-up',
        balanceJpy: 2000,
        changeJpy: null,
        entry: null,
        exit: null,
        terminal: 7,
        process: 2,
      },
    ],
  };
}
