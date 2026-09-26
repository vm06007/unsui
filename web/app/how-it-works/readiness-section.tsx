import { ArrowRight, ArrowUpRight } from 'lucide-react';

export function ReadinessSection() {
    return (
        <section className="arch-section readiness">
            <div className="arch-section-heading">
                <span className="arch-kicker">06 / TODAY & THE NEXT STOP</span>
                <h2>
                    A working proof.
                    <br />A defined path to payments.
                </h2>
            </div>
            <div className="readiness-grid">
                <article>
                    <span className="implemented-badge">BUILT</span>
                    <h3>Explore it today</h3>
                    <ul>
                        <li>Native FeliCa balance and history reading</li>
                        <li>Devnet Move treasury and refund ledger</li>
                        <li>Request replay and sequence protection</li>
                        <li>Immutable, linked receipts and Merkle commitments</li>
                        <li>Standalone browser walkthrough</li>
                    </ul>
                </article>
                <article>
                    <span className="planned-badge">PROPOSED</span>
                    <h3>Connect the merchant rail</h3>
                    <ul>
                        <li>Provider acceptance of this specific use case</li>
                        <li>Contracted merchant ID and supported acceptance channel</li>
                        <li>Authenticated payment verification and binding</li>
                        <li>Bank settlement and conversion reconciliation</li>
                        <li>Liquidity policy, reversal handling and security review</li>
                    </ul>
                </article>
            </div>
            <div className="arch-actions">
                <a className="button dark" href="/demo">
                    Try the experience <ArrowUpRight size={18} />
                </a>
                <a className="text-link" href="/">
                    Back to UnSui <ArrowRight size={17} />
                </a>
            </div>
        </section>
    );
}
