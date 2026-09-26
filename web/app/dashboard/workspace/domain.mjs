export const yen = (n) => '¥' + Math.round(n).toLocaleString('en-US');
export const short = (s) => (s ? s.slice(0, 8) + '…' + s.slice(-6) : 'Not recorded');
export const dateLabel = (s) =>
    new Date(s).toLocaleString('en-GB', {
        timeZone: 'Asia/Tokyo',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
const amounts = [
    1000, 575, 1500, 245, 757, 2000, 123, 1200, 500, 1800, 1000, 575, 1500, 757, 245,
    2000, 123, 1250,
];
const minutes = [
    0, 23, 64, 129, 221, 385, 547, 632, 748, 851, 964, 1102, 1249, 1397, 1512, 1706,
    1935, 2118,
];
export const sandbox = amounts.map((amount, i) => {
    const eth = i === 4 || i === 11,
        asset = eth ? 'ETH' : 'SUI',
        rate = eth ? 0.000002 : 0.0001,
        sequence = String(i + 1).padStart(4, '0');
    return {
        id: 'UNS-' + sequence,
        source: 'sandbox',
        date: new Date(
            Date.parse('2026-09-25T21:00+09:00') + minutes[i] * 60000,
        ).toISOString(),
        jpy: amount,
        merchantJpy: amount,
        merchantRef: 'SAMPLE-' + (1001 + i),
        settlement: i >= 15 ? 'pending' : 'settled',
        payout: 'confirmed',
        asset,
        crypto: amount * rate,
        recipient: '0x' + (i + 40).toString(16).padStart(eth ? 40 : 64, '0'),
        digest: 'SANDBOX-TX-' + sequence,
        receipt: 'SANDBOX-RECEIPT-' + sequence,
        network: 'sandbox',
        feeJpy: 0,
    };
});
export function fromPhone(r) {
    return {
        id: r.id,
        source: 'in-app',
        date: r.date,
        jpy: r.amount,
        merchantJpy: null,
        merchantRef: null,
        settlement: 'unmatched',
        payout: r.payout === 'Recorded' ? 'confirmed' : 'queued',
        asset: r.asset || 'SUI',
        crypto: r.cryptoAmount,
        recipient: r.recipient || null,
        digest: r.digest || null,
        receipt: r.receiptId || r.reference,
        network:
            r.chain === 'mizuhiki'
                ? r.mode === 'demo'
                    ? 'Awaji (demo)'
                    : 'Awaji Testnet'
                : r.mode || 'demo',
        feeJpy: r.feeJpy || 0,
    };
}
export function reconcile(r) {
    return !r.merchantRef
        ? 'unmatched'
        : r.merchantJpy !== r.jpy
          ? 'mismatch'
          : r.payout === 'queued'
            ? 'pending'
            : 'matched';
}
export function summarize(rows) {
    return {
        gross: rows.reduce((n, r) => n + r.jpy, 0),
        settled: rows
            .filter((r) => r.settlement === 'settled')
            .reduce((n, r) => n + (r.merchantJpy || 0), 0),
        pending: rows
            .filter((r) => r.settlement === 'pending')
            .reduce((n, r) => n + (r.merchantJpy || 0), 0),
        fees: rows.reduce((n, r) => n + r.feeJpy, 0),
        issues: rows.filter((r) => ['mismatch', 'unmatched'].includes(reconcile(r)))
            .length,
        paid: rows.filter((r) => r.payout === 'confirmed').length,
    };
}
export function treasury(rows, asset, opening) {
    const paid = rows
            .filter((r) => r.asset === asset && r.payout === 'confirmed')
            .reduce((n, r) => n + r.crypto, 0),
        queued = rows
            .filter((r) => r.asset === asset && r.payout === 'queued')
            .reduce((n, r) => n + r.crypto, 0);
    return { paid, queued, remaining: opening - paid };
}
export function project({
    balance,
    queued,
    dailyOrders,
    averageJpy,
    rate,
    feeBps,
    days,
}) {
    const perOrder = averageJpy * rate * (1 - feeBps / 10000),
        daily = dailyOrders * perOrder,
        available = balance - queued;
    return {
        daily,
        perOrder,
        ending: available - daily * days,
        runway: daily ? Math.max(0, available / daily) : null,
        feesJpy: dailyOrders * averageJpy * (feeBps / 10000) * days,
    };
}
export function csv(rows) {
    const esc = (x) => '"' + String(x ?? '').replaceAll('"', '""') + '"';
    return [
        [
            'order',
            'source',
            'date',
            'purchase_jpy',
            'merchant_ref',
            'recipient',
            'asset',
            'payout_amount',
            'network',
            'digest',
            'reconciliation',
        ],
        ...rows.map((r) => [
            r.id,
            r.source,
            r.date,
            r.jpy,
            r.merchantRef,
            r.recipient,
            r.asset,
            r.crypto,
            r.network,
            r.digest,
            reconcile(r),
        ]),
    ]
        .map((r) => r.map(esc).join(','))
        .join('\r\n');
}
