import {
    ArrowRight,
    Clock3,
    FileCheck,
    Landmark,
    LockKeyhole,
    Store,
    Wallet,
} from 'lucide-react';
import { ChargeSequence, MoneyCycle } from './money-cycle';

export function MoneyFlow() {
    return (
        <>
            <section className="arch-section" id="money-flow">
                <div className="arch-section-heading">
                    <span className="arch-kicker">
                        01 / TWO PATHS, ONE RECONCILED RECORD
                    </span>
                    <h2>
                        A purchase now.
                        <br />
                        Settlement later.
                    </h2>
                    <p>
                        In the proposed flow, a supported merchant purchase creates a yen
                        receivable. After authoritative payment confirmation and
                        eligibility checks, UnSui authorizes a crypto payout from funds
                        already in its treasury.
                    </p>
                </div>
                <MoneyCycle />
                <div className="flow-board">
                    <div className="flow-board-title">
                        <span className="planned-badge">
                            PROPOSED PAYMENT INTEGRATION
                        </span>
                        <span>
                            Arrows show value movement or authorization—not elapsed time.
                        </span>
                    </div>
                    <ol className="money-nodes">
                        <li>
                            <Store />
                            <small>01 · PAYMENT</small>
                            <h3>Eligible purchase</h3>
                            <p>Customer pays through an approved payment channel.</p>
                        </li>
                        <li>
                            <FileCheck />
                            <small>02 · CONFIRMATION</small>
                            <h3>SB Payment record</h3>
                            <p>
                                Verify merchant, order, amount and completed payment status.
                            </p>
                        </li>
                        <li>
                            <LockKeyhole />
                            <small>03 · AUTHORIZATION</small>
                            <h3>UnSui authorizer</h3>
                            <p>
                                Bind the eligible payment to one recipient and payout
                                entitlement.
                            </p>
                        </li>
                    </ol>
                    <div className="split-connector">
                        <span>Payment confirmed</span>
                        <div />
                        <span>Two independent paths</span>
                    </div>
                    <div className="payment-lanes">
                        <article className="payout-lane">
                            <div className="lane-heading">
                                <Wallet />
                                <span>THE USER PATH</span>
                                <b>Prefunded payout</b>
                            </div>
                            <div className="lane-steps">
                                <div>
                                    <strong>Crypto reserve</strong>
                                    <small>Capital funded in advance</small>
                                </div>
                                <ArrowRight />
                                <div>
                                    <strong>Sui contract</strong>
                                    <small>Check → record → pay</small>
                                </div>
                                <ArrowRight />
                                <div>
                                    <strong>User wallet</strong>
                                    <small>Receipt + crypto</small>
                                </div>
                            </div>
                            <p>
                                Subject to approval, available liquidity and chain
                                confirmation. No need to wait for that purchase’s yen
                                settlement.
                            </p>
                        </article>
                        <article className="settlement-lane">
                            <div className="lane-heading">
                                <Landmark />
                                <span>THE TREASURY PATH</span>
                                <b>Replenishment later</b>
                            </div>
                            <div className="lane-steps">
                                <div>
                                    <strong>Yen settlement</strong>
                                    <small>Merchant bank account</small>
                                </div>
                                <ArrowRight />
                                <div>
                                    <strong>Conversion</strong>
                                    <small>Separate provider / venue</small>
                                </div>
                                <ArrowRight />
                                <div>
                                    <strong>Crypto reserve</strong>
                                    <small>Reconcile + replenish</small>
                                </div>
                            </div>
                            <p>
                                Net settled yen is converted through a separately arranged,
                                suitable provider. SBPS is not shown as performing crypto
                                conversion.
                            </p>
                        </article>
                    </div>
                </div>
                <div className="arch-callout">
                    <Clock3 />
                    <p>
                        <b>Confirmed does not mean settled.</b> A payment result, a
                        merchant receivable, cleared bank cash and available crypto are
                        different balances. Only crypto already available in the pool can
                        fund an immediate on-chain payout.{' '}
                        <a
                            href="https://support.sbpayment.jp/first-guide/5031/"
                            target="_blank"
                            rel="noreferrer"
                        >
                            SBPS settlement reference ↗
                        </a>
                    </p>
                </div>
                <p className="arch-footnote">
                    The proposed crypto-linked use case and the exact payment channel
                    must be accepted by the relevant providers before launch. A merchant
                    ID alone does not authorize cash-out or crypto purchases. A phone
                    reading a Suica balance is not a merchant payment or card debit.
                </p>
            </section>
            <section className="arch-section" id="card-transaction">
                <ChargeSequence />
            </section>
        </>
    );
}
