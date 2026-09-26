/** Illustrative treasury model, not SBPS terms or a live exchange quote. */
export function modelBuffer(
  initialSui: number,
  settlementDays: number,
  dailyJpy: number,
) {
  const quote = 10000,
    fee = 0.02,
    floor = 3;
  let pool = initialSui,
    queuedBatches = 0,
    totalPaid = 0;
  const points = [
    { day: 0, pool, refilled: 0, paid: 0, queued: 0, pendingJpy: 0 },
  ];
  for (let day = 1; day <= 10; day++) {
    // One confirmed purchase batch per day. Net settlement precedes payouts.
    const refilled = day > settlementDays ? (dailyJpy * (1 - fee)) / quote : 0;
    pool += refilled;
    queuedBatches++;
    const batch = dailyJpy / quote;
    const payable = Math.min(
      queuedBatches,
      Math.max(0, Math.floor((pool - floor + 1e-9) / batch)),
    );
    const paid = payable * batch;
    pool -= paid;
    queuedBatches -= payable;
    totalPaid += paid;
    points.push({
      day,
      pool,
      refilled,
      paid,
      queued: queuedBatches * batch,
      pendingJpy: Math.min(day, settlementDays) * dailyJpy,
    });
  }
  return { points, quote, fee, floor, totalPaid };
}
