import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    sandbox,
    fromPhone,
    reconcile,
    summarize,
    project,
    treasury,
} from '../src/domain.mjs';
test('shared scenario agrees with merchant totals', () => {
    assert.equal(sandbox.length, 18);
    assert.equal(summarize(sandbox).gross, 17150);
    assert.equal(summarize(sandbox).issues, 0);
    assert.equal(summarize(sandbox).settled, 13777);
    assert.equal(reconcile({ ...sandbox[0], merchantJpy: 1050 }), 'mismatch');
    assert(sandbox.every((r) => r.jpy <= 2000));
});
test('app receipt does not imply a matched merchant payment', () => {
    const r = fromPhone({
        id: 'x',
        amount: 757,
        cryptoAmount: 0.0757,
        payout: 'Recorded',
        asset: 'SUI',
        mode: 'devnet',
    });
    assert.equal(reconcile(r), 'unmatched');
    assert.equal(r.recipient, null);
    assert.equal(r.crypto, 0.0757);
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

test('sample payouts complete independently of pending merchant settlement', () => {
    const unsettled = sandbox.filter((r) => r.settlement === 'pending');
    assert.equal(unsettled.length, 3);
    assert(
        unsettled.every(
            (r) => r.payout === 'confirmed' && r.digest && reconcile(r) === 'matched',
        ),
    );
    assert.equal(summarize(sandbox).paid, 18);
    assert.equal(summarize(sandbox).pending, 3373);
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
