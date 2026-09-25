import { decodeHistory } from '../src/lib/history';
function block(balance: number, process = 1, packed = 26 * 512 + 9 * 32 + 25) {
  const data = Array(16).fill(0);
  data[0] = 9;
  data[1] = process;
  data[4] = Math.floor(packed / 256);
  data[5] = packed % 256;
  data[6] = 227;
  data[7] = 62;
  data[8] = 227;
  data[9] = 56;
  data[10] = balance % 256;
  data[11] = Math.floor(balance / 256);
  return data;
}
test('decodes dates and routes with signed adjacent balance changes', () => {
  const records = decodeHistory([block(575), block(1000, 2), block(500)]);
  expect(records[0].date).toBe('2026-09-25');
  expect(records[0].entry).toContain('渋谷');
  expect(records[0].exit).toContain('虎ノ門');
  expect(records.map(r => r.changeJpy)).toEqual([-425, 500, null]);
  expect(records[1].activity).toBe('Ticket gate');
  expect(records[1].entry).toContain('渋谷');
});
test('does not invent dates, stations or amounts for unavailable information', () => {
  const unknown = block(575, 1, 26 * 512);
  unknown[6] = 255;
  unknown[7] = 255;
  const [record] = decodeHistory([unknown, Array(16).fill(0)]);
  expect(record.date).toBeNull();
  expect(record.entry).toBeNull();
  expect(record.changeJpy).toBeNull();
  expect(decodeHistory([block(575, 0x46)])[0].entry).toContain('渋谷');
  expect(decodeHistory([Array(16).fill(0)])).toEqual([]);
  expect(() => decodeHistory([[1]])).toThrow();
});

test('original terminal labels distinguish card issue, POS, top-up, and expense', () => {
  const purchase = block(1000);
  purchase[0] = 0x15;
  const topup = block(1500);
  topup[0] = 0x07;
  const issue = block(500);
  issue[0] = 0x08;
  const records = decodeHistory([purchase, topup, issue]);
  expect(records.map(r => r.activity)).toEqual([
    'Shop / POS',
    'Top-up (vending machine)',
    'New card issue',
  ]);
  expect(records.map(r => r.changeJpy)).toEqual([-500, 1000, null]);
});
test('original display filtering removes empty slots before calculating expenses', () => {
  const empty = Array(16).fill(0);
  empty[0] = 9;
  const records = decodeHistory([block(500), empty, block(1000)]);
  expect(records.map(r => r.changeJpy)).toEqual([-500, null]);
  expect(decodeHistory([block(0)])[0].balanceJpy).toBe(0);
});
