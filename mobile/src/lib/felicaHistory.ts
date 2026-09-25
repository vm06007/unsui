/* eslint-disable no-bitwise -- FeliCa history uses packed byte fields. */
import stationCodes from '../generated/stationCodes.json';
type StationEntry = { c: string; l: string; s: string };
const STATION_CODES = stationCodes as Record<string, StationEntry>;
export type HistoryRecord = {
  balanceJpy: number;
  date: { year: number; month: number; day: number } | null;
  consoleType: number;
  processType: number;
  label: string;
  entryStation: string | null;
  exitStation: string | null;
  line: string | null;
};
const CONSOLE_TYPE_LABELS: Record<number, string> = {
  0x03: 'Fare adjustment',
  0x05: 'Bus',
  0x07: 'Top-up (vending machine)',
  0x08: 'New card issue',
  0x09: 'Ticket gate',
  0x0f: 'Balance inquiry',
  0x12: 'Vending machine',
  0x14: 'Shop / POS',
  0x15: 'Shop / POS',
  0x16: 'Shop / POS',
  0x1c: 'Ticket office',
  0x46: 'Bus',
  0xc7: 'Ticket machine',
  0xc8: 'Ticket gate',
};

function resolveStation(
  line: number,
  station: number,
): { name: string | null; line: string | null } {
  if (line === 0 && station === 0) return { name: null, line: null };
  const entry = STATION_CODES[`${line}_${station}`];
  return entry ? { name: entry.s, line: entry.l } : { name: null, line: null };
}

// Commonly reverse-engineered Suica history-block layout (16 bytes):
//   0: console/terminal type    1: process type
//   4-5: packed date            6-7: entry line/station   8-9: exit line/station
//   10-11: balance after (little-endian uint16)   12-14: sequence
// Byte offset for the date confirmed empirically against a real card's
// history (offset 2-3 gave an always-invalid month; 4-5 gives valid,
// monotonically-ordered dates matching the sequence numbers).
export function parseHistoryBlock(blockData: number[]): HistoryRecord {
  const consoleType = blockData[0];
  const processType = blockData[1];
  const packedDate = (blockData[4] << 8) | blockData[5];
  const year = 2000 + ((packedDate >> 9) & 0x7f);
  const month = (packedDate >> 5) & 0x0f;
  const day = packedDate & 0x1f;
  const date =
    month >= 1 && month <= 12 && day >= 1 && day <= 31
      ? { year, month, day }
      : null;
  const balanceJpy = blockData[10] | (blockData[11] << 8);

  const entry = resolveStation(blockData[6], blockData[7]);
  const exit = resolveStation(blockData[8], blockData[9]);

  return {
    balanceJpy,
    date,
    consoleType,
    processType,
    label:
      CONSOLE_TYPE_LABELS[consoleType] ??
      `Unknown (0x${consoleType.toString(16)})`,
    entryStation: entry.name,
    exitStation: exit.name,
    line: entry.line ?? exit.line,
  };
}
