import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    sandbox,
    fromPhone,
    reconcile,
    summarize,
    project,
    treasury,
} from './domain.mjs';
test('shared scenario agrees with merchant totals', () => {
    assert.equal(sandbox.length, 18);
    assert.equal(summarize(sandbox).gross, 17150);
    assert.equal(summarize(sandbox).issues, 0);
    assert.equal(summarize(sandbox).settled, 17150);
    assert.equal(summarize(sandbox).pending, 0);
    assert.equal(reconcile({ ...sandbox[0], merchantJpy: 1050 }), 'mismatch');
    assert(sandbox.every((r) => r.jpy <= 2000));
});
test('a recorded app payout is reconciled and keeps the recipient', () => {
    const r = fromPhone({
        id: 'GM-000001',
        amount: 280,
        cryptoAmount: 0.28,
        payout: 'Recorded',
        asset: 'SUI',
        mode: 'devnet',
        recipient: '0x' + 'ab'.repeat(32),
        reference: 'GM-000001',
    });
    assert.equal(reconcile(r), 'matched');
    assert.equal(r.recipient, '0x' + 'ab'.repeat(32));
    assert.equal(r.merchantJpy, 280);
    assert.equal(r.crypto, 0.28);
    const queued = fromPhone({
        id: 'GM-000003',
        amount: 100,
        cryptoAmount: 0.01,
        payout: 'Queued',
    });
    assert.equal(reconcile(queued), 'pending');
    assert.equal(queued.recipient, null);
});
test('treasury accounts separately for paid and queued, preserving asset units', () => {
    const s = treasury(sandbox, 'SUI', 50);
    assert(s.remaining < 50);
    assert.equal(s.queued, 0);
    const queued = treasury([{ ...sandbox[0], payout: 'queued' }], 'SUI', 50);
    assert.equal(queued.queued, sandbox[0].crypto);
    assert.equal(queued.remaining, 50);
});
test('projection reserves queue and applies hypothetical fee only to future demand', () => {
    const p = project({
        balance: 2,
        queued: 0.5,
        dailyOrders: 10,
        averageJpy: 1000,
        rate: 0.0001,
        feeBps: 100,
        days: 2,
    });
    assert.equal(p.daily, 0.99);
    assert.equal(p.ending, -0.48);
    assert.equal(p.feesJpy, 200);
});

test('sample payouts are completed inside the demo window', () => {
    assert.equal(sandbox.filter((r) => r.settlement === 'pending').length, 0);
    assert(
        sandbox.every(
            (r) => r.payout === 'confirmed' && r.digest && reconcile(r) === 'matched',
        ),
    );
    const start = Date.parse('2026-09-25T23:00+09:00');
    const end = Date.parse('2026-09-26T23:00+09:00');
    assert(sandbox.every((r) => Date.parse(r.date) >= start && Date.parse(r.date) <= end));
    assert.equal(summarize(sandbox).paid, 18);
    assert.equal(summarize(sandbox).pending, 0);
});

test('Awaji receipts preserve network and native MIZU units', () => {
    const row = fromPhone({
        id: 'awaji',
        amount: 575,
        cryptoAmount: 0.0575,
        payout: 'Recorded',
        asset: 'MIZU',
        chain: 'mizuhiki',
        mode: 'demo',
    });
    assert.equal(row.network, 'Awaji (demo)');
    assert.equal(row.asset, 'MIZU');
    assert.equal(treasury([row], 'ETH', 1).paid, 0);
    assert.equal(treasury([row], 'MIZU', 1).paid, 0.0575);
});
