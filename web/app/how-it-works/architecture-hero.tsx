import { ArrowLeft, Check, CircleDashed } from 'lucide-react';

export function ArchitectureHero() {
  return (
    <section className="arch-hero">
      <a href="/" className="back-site">
        <ArrowLeft size={15} /> Back to the project
      </a>
      <div className="arch-hero-layout">
        <div className="arch-hero-copy">
          <span className="eyebrow">HOW UNSUI WORKS</span>
          <h1>
            Yen takes its time.
            <br />
            <em>Your next step shouldn’t.</em>
          </h1>
          <p className="arch-lead">
            Scan a transit card, choose a destination, and confirm an on-chain
            payout from a prefunded treasury. The hosted backend keeps the
            receipt ready for your phone and the operations dashboard.
          </p>
          <div className="architecture-status">
            <span>
              <Check size={16} /> Sui + Ethereum: mainnet payouts
            </span>
            <span>
              <CircleDashed size={16} /> Mizuhiki Awaji: MJPY testnet payouts
            </span>
          </div>
          <p className="arch-scope">
            Live payouts work today. Merchant settlement and automatic treasury
            replenishment are the next integration step.
          </p>
        </div>
        <nav className="arch-nav" aria-label="On this page">
          <a href="#money-flow">01 Money flow</a>
          <a href="#merchant">02 Merchant identity</a>
          <a href="#buffer">03 Liquidity</a>
          <a href="#contract">04 Contract</a>
          <a href="#transparency">05 Proof & transparency</a>
        </nav>
      </div>
    </section>
  );
}
