import { DemoVideoLink } from '@/components/demo-video';
import { PresentationMode } from '@/components/presentation-mode';
import { MarketOpportunity } from '@/components/market-opportunity';
import { SiteHeader, SiteFooter } from '@/components/site-chrome';
import {
  ArrowUpRight,
  ArrowRight,
  ScanLine,
  TrainFront,
  ArrowDownLeft,
  ShieldCheck,
  Play,
  Layers,
  Smartphone,
  Check,
  ExternalLink,
  Download,
} from 'lucide-react';
import { transactionLink as tx } from './how-it-works/deployed-records';
export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="japan-mark" /> MADE FOR THE JOURNEY HOME
            </div>
            <h1>
              Your last stop.
              <br />A new <em>beginning.</em>
            </h1>
            <p>
              Japan stays with you.
              <br />
              Your leftover transit balance can, too.
            </p>
            <p className="hero-detail">
              Meet UnSui. Tap your transit card, discover what’s left, and
              choose where it goes next: Sui, Ethereum, or yen-denominated MJPY
              on Mizuhiki Awaji.
            </p>
            <div className="hero-actions">
              <PresentationMode />
              <a href="/demo" className="button dark">
                Take it for a spin <ArrowUpRight size={20} />
              </a>
              <a href="/how-it-works" className="text-link">
                Explore the project <ArrowRight size={17} />
              </a>
            </div>
            <div className="hero-foot">
              <span>No wallet connection required</span>
              <span>Name or wallet address</span>
              <span>Made for mobile</span>
            </div>
          </div>
          <div className="hero-product">
            <div className="floating-label">
              <span>東京 → WHEREVER’S NEXT</span>
              <ArrowUpRight size={18} />
            </div>
            <a
              className="wallet-preview"
              href="/demo"
              aria-label="Open the interactive UnSui wallet"
            >
              <div className="preview-heading">
                <div className="avatar">旅</div>
                <div>
                  <small>おかえりなさい</small>
                  <strong>Your Japan wallet</strong>
                </div>
                <ScanLine size={22} />
              </div>
              <div className="preview-balance">
                <span>A little left. A lot ahead.</span>
                <h2>
                  ¥1,500<span> JPY</span>
                </h2>
                <small>Ready for your next chapter</small>
              </div>
              <div className="wallet-card">
                <div>
                  <span>TRANSIT · JAPAN</span>
                  <strong>Suica</strong>
                </div>
                <div className="card-route">
                  <span>東京</span>
                  <div />
                  <span>次へ</span>
                </div>
                <div className="card-bottom">
                  <span>
                    Available balance
                    <br />
                    <b>¥1,500</b>
                  </span>
                  <span>•••• 2026</span>
                </div>
              </div>
              <div className="preview-actions">
                <span>
                  <ArrowUpRight />
                  Refund
                </span>
                <span>
                  <ScanLine />
                  Scan card
                </span>
                <span>
                  <ShieldCheck />
                  Receipts
                </span>
              </div>
              <div className="preview-list">
                <h3>
                  Your recent journey <ArrowRight size={17} />
                </h3>
                <div>
                  <i>
                    <TrainFront size={18} />
                  </i>
                  <span>
                    Shibuya → Shinjuku<small>JR Yamanote Line · Today</small>
                  </span>
                  <b>−¥180</b>
                </div>
                <div>
                  <i>
                    <ArrowDownLeft size={18} />
                  </i>
                  <span>
                    Card top-up<small>Shibuya Station · Yesterday</small>
                  </span>
                  <b>+¥2,000</b>
                </div>
              </div>
            </a>
            <div className="receipt-float">
              <span className="round-check">
                <Check size={18} />
              </span>
              <div>
                <strong>A receipt you can verify.</strong>
                <span>Powered by Sui</span>
              </div>
              <ShieldCheck size={22} />
            </div>
            <span className="product-caption">
              YOUR JOURNEY. WITH MORE TO GO.
            </span>
          </div>
        </section>
        <MarketOpportunity />
        <div className="project-strip">
          <span>
            BUILT AT <b>ETHGlobal Tokyo 2026</b>
          </span>
          <span>
            PAYOUTS ON <b>Sui · Ethereum · Awaji</b>
          </span>
          <span>
            ON DEVICE <b>dGen1 × NFC</b>
          </span>
          <a href={tx} target="_blank" rel="noreferrer">
            See a mainnet payout <ArrowUpRight size={16} />
          </a>
        </div>
        <section id="how" className="section how">
          <div className="section-heading">
            <div>
              <span className="eyebrow">01 / THE EXPERIENCE</span>
              <h2>
                One card.
                <br />
                Three simple moments.
              </h2>
            </div>
            <p>
              A familiar tap. A clear balance. A receipt that stays with you.
              Try the whole journey in your browser.
            </p>
          </div>
          <div className="steps">
            <article>
              <span className="step-number">01</span>
              <ScanLine />
              <h3>Tap into your journey.</h3>
              <p>
                On dGen1, NFC reads your card’s balance and recent trips. In the
                web demo, a sample card is ready for you.
              </p>
            </article>
            <article>
              <span className="step-number">02</span>
              <ArrowUpRight />
              <h3>Give your balance a destination.</h3>
              <p>
                Enter a .sui name, ENS name or wallet address, or use your dGen1
                wallet. Review the quote and confirm with another scan.
              </p>
            </article>
            <article>
              <span className="step-number">03</span>
              <ShieldCheck />
              <h3>Keep the proof.</h3>
              <p>
                Follow confirmation in the app, then open the transaction on its
                explorer. Your receipt and refund history stay available.
              </p>
            </article>
          </div>
          <a href="/demo" className="text-link">
            Try the interactive demo <ArrowUpRight size={18} />
          </a>
        </section>
        <section id="technology" className="technology section">
          <div>
            <span className="eyebrow">02 / UNDER THE HOOD</span>
            <h2>
              A small tap.
              <br />A verifiable trail.
            </h2>
            <p>
              Mainnet payouts, a hosted ledger and a dashboard that brings every
              recorded refund into view.
            </p>
            <a
              href={tx}
              target="_blank"
              rel="noreferrer"
              className="button outline"
            >
              Explore a live receipt <ExternalLink size={17} />
            </a>
          </div>
          <div className="tech-list">
            <article>
              <Smartphone />
              <div>
                <h3>Read on the device</h3>
                <p>
                  The Android app reads FeliCa balance and history over NFC. The
                  dGen1 wallet integration can request an Ethereum address
                  signature.
                </p>
              </div>
            </article>
            <article>
              <Layers />
              <div>
                <h3>Record on Sui</h3>
                <p>
                  A Move contract holds the SUI treasury and records refund
                  totals, sequences and unique claims. Payment and recording
                  happen atomically.
                </p>
              </div>
            </article>
            <article>
              <ShieldCheck />
              <div>
                <h3>Verify the receipt</h3>
                <p>
                  SHA-256 links each immutable receipt to the previous refund. A
                  four-leaf Merkle tree commits the card identifier, recipient,
                  amount and observed balance.
                </p>
              </div>
            </article>
            <article>
              <ShieldCheck />
              <div>
                <h3>A clear quote before you confirm</h3>
                <p>
                  Sui quotes use the SUI/JPY market rate with a 2% fee. Awaji
                  pays 1 MJPY per net yen. Refunds above ¥1,000 require a World
                  ID check before confirmation.
                </p>
              </div>
            </article>
            <div className="trust-note">
              The operator attests to the NFC scan. A receipt proves the Sui
              refund record; it does not prove a debit from a transit card. This
              is an independent hackathon prototype, not a JR East service.
            </div>
          </div>
        </section>
        <section className="section how" id="operations">
          <div className="section-heading">
            <div>
              <span className="eyebrow">03 / YOUR OPERATIONS WORKSPACE</span>
              <h2>
                Every payout.
                <br />
                Your point of view.
              </h2>
            </div>
            <p>
              See hosted refund records, recipients and transaction links in one
              place. Arrange the workspace yourself, or ask the assistant.
            </p>
          </div>
          <div className="steps">
            <article>
              <Layers />
              <h3>Make room for what matters.</h3>
              <p>
                Choose, reorder and resize cards on Overview and Treasury.
                Switch table views and show the columns you need.
              </p>
            </article>
            <article>
              <ShieldCheck />
              <h3>Follow the transaction.</h3>
              <p>
                Find an order, check its payout and open the blockchain
                explorer. Keep sample orders and app records easy to
                distinguish.
              </p>
            </article>
            <article>
              <ArrowUpRight />
              <h3>Ask for a different view.</h3>
              <p>
                “Show only payouts and latest journeys.” The assistant changes
                display settings, with Undo when you want to go back.
              </p>
            </article>
          </div>
          <a href="/dashboard" className="button dark">
            Explore the dashboard <ArrowUpRight size={18} />
          </a>
        </section>
        <section id="film" className="section film">
          <DemoVideoLink className="video-placeholder demo-video-card">
            <Play size={42} />
            <span>WATCH DEMO</span>
            <h3>A journey worth showing.</h3>
            <p>Play the project presentation</p>
          </DemoVideoLink>
          <div>
            <span className="eyebrow">04 / SEE IT IN MOTION</span>
            <h2>
              From the first tap,
              <br />
              to the confirmed payout.
            </h2>
            <p>
              Watch UnSui in action: scan a transit card, choose a payout wallet,
              and follow the refund through its receipt and dashboard.
            </p>
            <DemoVideoLink className="button dark">Watch Demo <Play size={18} /></DemoVideoLink>
            <a href="/demo" className="text-link video-browser-link">
              Open the interactive demo <ArrowUpRight size={18} />
            </a>
          </div>
        </section>
        <section id="download" className="section downloads">
          <div className="download-card">
            <Smartphone />
            <div>
              <h3>The next stop: your phone.</h3>
              <p>
                The standalone Android app connects to the hosted backend over
                Wi-Fi or mobile data, without a laptop.
                <br />
                Android · ARM64 · 21 MB. Built for dGen1 and compatible NFC
                phones.
              </p>
            </div>
            <a
              className="button dark"
              href="/downloads/unsui-1.0-arm64.apk"
              download
            >
              <Download size={16} /> Download APK
            </a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
