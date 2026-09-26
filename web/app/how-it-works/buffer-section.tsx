import { Coins, Repeat2, ShieldCheck } from 'lucide-react';
import BufferChart from './buffer-chart';

export function BufferSection() {
    return (
        <section className="arch-section" id="buffer">
            <div className="arch-section-heading">
                <span className="arch-kicker">03 / LIQUIDITY BEFORE SPEED</span>
                <h2>The buffer buys time.</h2>
                <p>
                    UnSui prefunds a crypto treasury using operator capital. User
                    payouts reduce it; operators currently replenish it directly.
                    The sandbox merchant integration would replenish it after bank
                    settlement and conversion. Pending yen is not spendable crypto.
                </p>
            </div>
            <BufferChart />
            <div className="buffer-notes">
                <article>
                    <Coins />
                    <h3>Size for the gap</h3>
                    <p>
                        Plan for payout demand across the entire
                        settlement-and-conversion window, plus gas, market moves and a
                        safety margin. A bank holiday or delayed conversion can extend
                        that window.
                    </p>
                    <code>Working buffer ≈ daily crypto demand × lag + reserve</code>
                </article>
                <article>
                    <ShieldCheck />
                    <h3>Stop before empty</h3>
                    <p>
                        The sandbox service queues or pauses new authorizations below
                        its reserve threshold. The current Move contract aborts if its
                        SUI pool cannot cover a payout; it does not implement this
                        model’s 3 SUI floor or queue.
                    </p>
                </article>
                <article>
                    <Repeat2 />
                    <h3>Reconcile before refill</h3>
                    <p>
                        Match settled net yen against processor reports, fees and
                        reversals. Record the conversion execution and on-chain deposit.
                        FX changes, fees and losses need capital or an explicit pricing
                        policy.
                    </p>
                </article>
            </div>
        </section>
    );
}
