import stations from '../generated/stationCodes.json';
type Station = { c: string; l: string; s: string };
const lookup = stations as Record<string, Station>;
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
export function decodeHistory(blocks: number[][]): HistoryRecord[] {
  return blocks
    .map((block, index) => {
      if (
        block.length !== 16 ||
        !block.every(n => Number.isInteger(n) && n >= 0 && n <= 255)
      )
        throw Error('Invalid history record');
      const packed = block[4] * 256 + block[5];
      const year = 2000 + Math.floor(packed / 512);
      const month = Math.floor(packed / 32) % 16;
      const day = packed % 32;
      const parsed = new Date(Date.UTC(year, month - 1, day));
      const date =
        month >= 1 &&
        month <= 12 &&
        day >= 1 &&
        parsed.getUTCMonth() === month - 1 &&
        parsed.getUTCDate() === day
          ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(
              2,
              '0',
            )}`
          : null;
      // Station bytes are only interpreted for known rail terminal/process combinations.
      const rail = block[1] === 1 && [0x09, 0xc8].includes(block[0]);
      const entry = rail ? lookup[`${block[6]}_${block[7]}`] : undefined;
      const exit = rail ? lookup[`${block[8]}_${block[9]}`] : undefined;
      const activity = rail
        ? 'Rail travel'
        : block[1] === 2
        ? 'Top-up'
        : block[1] === 0x46
        ? 'Purchase'
        : 'Other activity';
      return {
        index,
        date,
        activity,
        balanceJpy: block[10] + block[11] * 256,
        changeJpy: null,
        entry: entry ? `${entry.s} · ${entry.l}` : null,
        exit: exit ? `${exit.s} · ${exit.l}` : null,
        terminal: block[0],
        process: block[1],
      };
    })
    .filter((_, i) => !blocks[i].every(byte => byte === 0))
    .map((record, i, records) => ({
      ...record,
      // The oldest retained record has no preceding balance to compare against.
      changeJpy: records[i + 1]
        ? record.balanceJpy - records[i + 1].balanceJpy
        : null,
    }));
}
