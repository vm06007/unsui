import { ArrowRight, Check, ExternalLink } from 'lucide-react';
import { ledger, objectLink, pkg, receipt, tx } from './devnet-records';

export function ContractSection() {
    return (
        <section className="arch-section contract-section" id="contract">
            <div className="arch-section-heading">
                <span className="arch-kicker">04 / ONE CLAIM, ONE PAYOUT</span>
                <h2>
                    Sui makes the payout
                    <br />
                    and the record inseparable.
                </h2>
                <p>
                    The deployed prototype uses a shared Move ledger. Every successful
                    refund updates the card’s total and sequence, consumes a request
                    ID, creates an immutable receipt and transfers SUI in one
                    transaction.
                </p>
            </div>
            <div className="contract-flow">
                <div>
                    <small>INPUT</small>
                    <h3>Authorized request</h3>
                    <p>
                        Card commitment
                        <br />
                        Request ID + recipient
                        <br />
                        Amount + observed balance
                        <br />
                        Expected sequence + expiry
                    </p>
                </div>
                <ArrowRight />
                <div className="contract-checks">
                    <small>CONTRACT GATES</small>
                    <h3>Check every condition</h3>
                    <ul>
                        <li>
                            <Check />
                            Authorized operator; not paused
                        </li>
                        <li>
                            <Check />
                            Request ID not already consumed
                        </li>
                        <li>
                            <Check />
                            Expected card sequence matches
                        </li>
                        <li>
                            <Check />
                            Within attested balance + expiry
                        </li>
                        <li>
                            <Check />
                            Enough SUI in the pool
                        </li>
                    </ul>
                </div>
                <ArrowRight />
                <div>
                    <small>ATOMIC RESULT</small>
                    <h3>Record + transfer</h3>
                    <p>
                        Advance total and sequence
                        <br />
                        Link and freeze receipt
                        <br />
                        Emit refund event
                        <br />
                        Pay the destination wallet
                    </p>
                </div>
            </div>
            <div className="failure-strip">
                <span>Any check fails</span>
                <ArrowRight size={18} />
                <b>Transaction aborts</b>
                <span>
                    No partial payout or partial ledger update. Transaction gas may
                    still be charged.
                </span>
            </div>
            <div className="double-spend-grid">
                <article>
                    <span className="implemented-badge">IN THE PROTOTYPE</span>
                    <h3>Prevent replay inside this ledger.</h3>
                    <p>
                        Submitting the same request ID twice cannot pay twice. A stale
                        sequence rejects racing updates. Cumulative refunds cannot
                        exceed the operator-attested balance for that card commitment.
                        These checks do not authenticate the physical card balance.
                    </p>
                </article>
                <article>
                    <span className="planned-badge">
                        REQUIRED FOR THE PAYMENT INTEGRATION
                    </span>
                    <h3>Consume the payment—not just a request.</h3>
                    <p>
                        Add a unique payment commitment derived from the verified
                        processor reference and merchant context. Enforce its payout cap
                        on-chain so a second request ID cannot redeem the same purchase
                        again. This merchant-payment binding is not in the current
                        contract.
                    </p>
                </article>
            </div>
            <p className="arch-footnote">
                Ethereum is a browser preview only. Production payouts on multiple
                chains need a shared entitlement authority and reservation/finality
                handling; two independent “used payment” lists would not prevent the
                same purchase being claimed on both chains.
            </p>
            <div className="contract-links">
                <h3>
                    Inspect the deployed prototype <span>DEVNET</span>
                </h3>
                {[
                    { name: 'Move package', id: pkg },
                    { name: 'Shared treasury & ledger', id: ledger },
                    { name: 'Immutable example receipt', id: receipt },
                ].map((item) => (
                    <a
                        key={item.id}
                        href={objectLink(item.id)}
                        target="_blank"
                        rel="noreferrer"
                    >
                        <div>
                            <span>{item.name}</span>
                            <code>{item.id}</code>
                        </div>
                        <ExternalLink size={18} />
                    </a>
                ))}
                <a
                    href={`https://suiexplorer.com/txblock/${tx}?network=devnet`}
                    target="_blank"
                    rel="noreferrer"
                >
                    <div>
                        <span>Example payout transaction</span>
                        <code>{tx}</code>
                    </div>
                    <ExternalLink size={18} />
                </a>
                <p>
                    Deployment recorded on 22 September 2026. These are published
                    test-network records, not live balance readings. Devnet resets can
                    remove them. The publisher retains upgrade and administration
                    capabilities.
                </p>
            </div>
        </section>
    );
}
