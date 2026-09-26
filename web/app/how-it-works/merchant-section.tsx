import { ExternalLink, Repeat2 } from 'lucide-react';

export function MerchantSection() {
    return (
        <section className="arch-section" id="merchant">
            <div className="arch-section-heading">
                <span className="arch-kicker">02 / THE MERCHANT RECORD</span>
                <h2>
                    The merchant ID identifies us.
                    <br />
                    The payment record identifies the money.
                </h2>
                <p>
                    Our proposed SBPS integration uses the identifiers supplied for
                    the contracted service, with a backend that verifies payment
                    results. The browser cannot authorize payouts by reporting
                    “payment successful.”
                </p>
            </div>
            <div className="merchant-grid">
                <div className="merchant-ticket">
                    <span className="arch-kicker">
                        ILLUSTRATIVE RECORD · NO LIVE ACCOUNT
                    </span>
                    <h3>Merchant purchase</h3>
                    <dl>
                        <div>
                            <dt>merchant_id</dt>
                            <dd>Assigned by SBPS</dd>
                        </div>
                        <div>
                            <dt>service_id</dt>
                            <dd>Contracted service</dd>
                        </div>
                        <div>
                            <dt>Order reference</dt>
                            <dd>UNSUI-ORDER-0042</dd>
                        </div>
                        <div>
                            <dt>Processor reference</dt>
                            <dd>Tracking / transaction ID</dd>
                        </div>
                        <div>
                            <dt>Purchase amount</dt>
                            <dd>¥1,500</dd>
                        </div>
                        <div>
                            <dt>Payment state</dt>
                            <dd>Verified completion</dd>
                        </div>
                        <div>
                            <dt>Settlement state</dt>
                            <dd>Awaiting bank settlement</dd>
                        </div>
                    </dl>
                    <p>
                        Field availability and naming depend on the selected SBPS
                        integration. The sample values are not credentials.
                    </p>
                </div>
                <div className="merchant-explanation">
                    <article>
                        <span>1</span>
                        <div>
                            <h3>Accept through the right channel</h3>
                            <p>
                                Physical Suica acceptance needs a supported merchant
                                terminal or certified payment integration. The dGen1’s
                                current NFC reader only reads card data. An online Mobile
                                Suica payment flow is a separate integration.
                            </p>
                        </div>
                    </article>
                    <article>
                        <span>2</span>
                        <div>
                            <h3>Confirm from an authoritative source</h3>
                            <p>
                                Validate the service-specific server notification and/or
                                processor status query, match the expected merchant and
                                order, and reconcile the amount. Do not trust a redirect
                                page or a screenshot as proof of payment.
                            </p>
                        </div>
                    </article>
                    <article>
                        <span>3</span>
                        <div>
                            <h3>Map the payment to an entitlement</h3>
                            <p>
                                Store the unique processor payment reference, amount,
                                destination wallet and quote. Retries must reuse the same
                                entitlement. Partial payouts must never exceed its
                                authorized total.
                            </p>
                        </div>
                    </article>
                    <a
                        className="source-link"
                        href="https://developer.sbpayment.jp/system-specifications/link-type/2517/"
                        target="_blank"
                        rel="noreferrer"
                    >
                        SBPS merchant_id / service_id definitions{' '}
                        <ExternalLink size={14} />
                    </a>
                    <a
                        className="source-link"
                        href="https://developer.sbpayment.jp/payment-service/emoney-payment/mobile-suica/4829/"
                        target="_blank"
                        rel="noreferrer"
                    >
                        SBPS Mobile Suica service overview <ExternalLink size={14} />
                    </a>
                </div>
            </div>
            <div className="arch-callout neutral">
                <Repeat2 />
                <p>
                    <b>Crypto payout and processor refund are separate operations.</b>{' '}
                    This proposal pays from UnSui’s treasury. It does not describe
                    SBPS issuing a crypto refund. Cancellations and refunds must be
                    reconciled with the original payment flow; an already completed
                    on-chain transfer does not reverse automatically.{' '}
                    <a
                        href="https://developer.sbpayment.jp/billing-method/6745/"
                        target="_blank"
                        rel="noreferrer"
                    >
                        SBPS payment/refund functions ↗
                    </a>
                </p>
            </div>
        </section>
    );
}
