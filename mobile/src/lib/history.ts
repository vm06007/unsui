import { parseHistoryBlock } from './felicaHistory';
export type HistoryRecord = {
  index: number;
  date: string | null;
  activity: string;
  balanceJpy: number;
  changeJpy: number | null;
  entry: string | null;
  exit: string | null;
  terminal: number;
  process: number;
};
// Adapt the original FeliCa parser to the app's record shape. Preserve card order.
export function decodeHistory(blocks: number[][]): HistoryRecord[] {
  return blocks
    .map((block, index) => {
      if (
        block.length !== 16 ||
        !block.every(n => Number.isInteger(n) && n >= 0 && n <= 255)
      )
        throw Error('Invalid history record');
      const record = parseHistoryBlock(block);
      return {
        index,
        date: record.date
          ? `${record.date.year}-${String(record.date.month).padStart(
              2,
              '0',
            )}-${String(record.date.day).padStart(2, '0')}`
          : null,
        activity: record.label,
        balanceJpy: record.balanceJpy,
        changeJpy: null,
        entry: record.entryStation
          ? [record.entryStation, record.line].filter(Boolean).join(' · ')
          : null,
        exit: record.exitStation
          ? [record.exitStation, record.line].filter(Boolean).join(' · ')
          : null,
        terminal: record.consoleType,
        process: record.processType,
      };
    })
    .filter(record => record.date || record.balanceJpy !== 0)
    .map((record, index, records) => ({
      ...record,
      changeJpy: records[index + 1]
        ? record.balanceJpy - records[index + 1].balanceJpy
        : null,
    }));
}
