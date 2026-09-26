import { ArrowLeft, Check, CircleDashed } from 'lucide-react';

export function ArchitectureHero() {
    return (
        <section className="arch-hero">
            <a href="/" className="back-site">
                <ArrowLeft size={15} /> Back to the project
            </a>
            <span className="eyebrow">HOW UNSUI WORKS</span>
            <h1>
                Yen takes its time.
                <br />
                <em>Your next step shouldn’t.</em>
            </h1>
            <p className="arch-lead">
                A prefunded crypto buffer separates the user’s payout from the
                merchant’s settlement schedule. Sui records the payout. Yen
                replenishes the buffer later.
            </p>
            <div className="architecture-status">
                <span>
                    <Check size={16} /> Sui ledger: devnet prototype
                </span>
                <span>
                    <CircleDashed size={16} /> SB Payment + conversion: proposed
                    integration
                </span>
            </div>
            <p className="arch-scope">
                Follow the payment architecture from merchant purchase to yen
                settlement, treasury replenishment and a verifiable Sui payout.
            </p>
            <div className="arch-nav">
                <a href="#money-flow">01 Money flow</a>
                <a href="#merchant">02 Merchant identity</a>
                <a href="#buffer">03 Liquidity</a>
                <a href="#contract">04 Contract</a>
                <a href="#transparency">05 Proof & transparency</a>
            </div>
        </section>
    );
}
