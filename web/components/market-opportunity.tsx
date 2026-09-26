import { ArrowRight, Wallet } from 'lucide-react';

export function MarketOpportunity() {
  return (
    <section className="market-opportunity" id="opportunity">
      <span className="eyebrow">SMALL BALANCES. A LARGE OPPORTUNITY.</span>
      <h2>
        Millions of journeys.
        <br />
        Value left at the last stop.
      </h2>
      <p className="market-intro">
        For a visitor with no return trip planned, a few hundred yen on a
        transit card can remain unused for years. UnSui’s target is simple: help
        departing travellers put that leftover value back to use.
      </p>
      <div className="market-stats">
        <article>
          <strong>42.7m</strong>
          <span>International visitor arrivals in 2025</span>
        </article>
        <article>
          <strong>≈117,000</strong>
          <span>Arrivals per day, averaged over the year</span>
        </article>
        <article>
          <strong>¥213m</strong>
          <span>Illustrative annual leftover-balance scenario</span>
        </article>
      </div>
      <p className="market-source">
        Source:{' '}
        <a
          href="https://www.jnto.go.jp/news/press/20260121_monthly.html"
          target="_blank"
          rel="noreferrer"
        >
          Japan National Tourism Organization (JNTO), January 2026 estimate
        </a>
        : 42,683,600 arrivals. Counts are visits, not unique people,
        transit-card users or measured departures.
      </p>
      <div className="market-scenario">
        <span className="eyebrow">JR EAST FACT BOOK 2026</span>
        <p>
          <b>Suica kept growing through the year to March 2026.</b>
        </p>
        <div className="market-stats">
          <article>
            <strong>124.35m</strong>
            <span>Suica cards issued by 31 March 2026</span>
          </article>
          <article>
            <strong>+10.98m</strong>
            <span>More cards issued in that fiscal year alone</span>
          </article>
          <article>
            <strong>42.14m</strong>
            <span>Mobile Suica, including 7.92 million added that year</span>
          </article>
        </div>
        <p className="market-source">
          Source:{' '}
          <a
            href="https://www.jreast.co.jp/company/ir/library/factbook/pdf/data.pdf"
            target="_blank"
            rel="noreferrer"
          >
            JR East Fact Book 2026
          </a>
          , published 17 September 2026, IT &amp; Suica. Cumulative cards issued
          (万枚): Suica 12,435, up from 11,337 a year earlier; Mobile Suica 4,214,
          up from 3,422. Figures are as of the fiscal year ended 31 March 2026.
        </p>
      </div>
      <div className="market-scenario">
        <span className="eyebrow">A SCENARIO, NOT A MEASURED MARKET TOTAL</span>
        <p>
          <b>
            42.7m visits × 10% with unused card value × ¥500 left over ≈ ¥213m
            per year.
          </b>
        </p>
        <p>
          The 10% share and ¥500 balance are assumptions to test with
          travellers. This is potential leftover value, not UnSui revenue,
          confirmed recoverable funds or a count of existing stranded balances.
          Card eligibility and adoption would narrow the opportunity.
        </p>
      </div>
      <div className="market-wallet">
        <Wallet size={30} strokeWidth={1.5} />
        <div>
          <h3>A first balance for a wallet you control.</h3>
          <p>
            The proposed experience lets a traveller direct an eligible payout
            to a self-custody wallet, turning a small leftover balance into a
            way to try on-chain apps. The product goal is fewer steps and less
            unnecessary data collection.
          </p>
          <p className="market-source">
            The browser demo needs no identity documents and moves no funds.
            Live funding is not promised as “KYC-free”: identity checks depend
            on the payment and conversion providers and applicable requirements.
          </p>
          <a href="/how-it-works" className="ideology-text-link">
            Explore the payment architecture <ArrowRight size={17} />
          </a>
        </div>
      </div>
    </section>
  );
}
