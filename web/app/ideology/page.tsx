import { SiteHeader, SiteFooter } from '@/components/site-chrome';
import type { Metadata } from 'next';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Cloud,
  Waves,
  Footprints,
} from 'lucide-react';
export const metadata: Metadata = {
  title: 'Ideology — Clouds & water · UnSui',
  description:
    'The meaning behind UnSui: clouds, water and a journey that keeps moving.',
};
export default function Ideology() {
  return (
    <>
      <SiteHeader />
      <main className="ideology">
        <section className="ideology-hero">
          <a href="/" className="back-site">
            <ArrowLeft size={15} /> Back to the project
          </a>
          <div className="ideology-hero-grid">
            <div>
              <span className="eyebrow">THE IDEA BEHIND UNSUI</span>
              <h1>
                Like clouds.
                <br />
                Like <em>water.</em>
              </h1>
              <p>
                A journey moves on.
                <br />
                We believe the value you carry should, too.
              </p>
              <span className="ideology-reading">
                雲水 · UNSUI · CLOUDS & WATER
              </span>
            </div>
            <div
              className="ideology-landscape"
              role="img"
              aria-label="Clouds above a flowing river, with the Japanese characters for clouds and water"
            >
              <svg viewBox="0 0 500 540" aria-hidden="true">
                <circle cx="338" cy="143" r="70" fill="#dce9c7" />
                <g
                  fill="none"
                  stroke="#8ba277"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M58 156h124c30 0 30-34 9-39-1-31-48-42-64-13-21-11-41 0-43 17H58c-23 0-23 35 0 35Z" />
                  <path d="M297 229h113c30 0 27-30 8-33-3-25-38-33-53-9-19-9-35 0-39 13h-29c-20 0-20 29 0 29Z" />
                </g>
                <path
                  d="M0 352 Q96 258 180 337 T348 315 T500 326 V540 H0Z"
                  fill="#dfe8d5"
                />
                <path
                  d="M0 404 Q110 320 218 385 T500 352 V540 H0Z"
                  fill="#c8d9b7"
                />
                <path
                  d="M322 338 C166 390 403 422 209 469 S150 520 200 540 H330 C238 489 433 474 362 421 S250 384 339 338Z"
                  fill="#f8faf2"
                />
                <g fill="none" stroke="#9cb68b" strokeWidth="1.5">
                  <path d="M314 366c-47 24 81 44 37 68" />
                  <path d="M294 458c-68 25-102 38-62 57" />
                </g>
                <text
                  x="65"
                  y="268"
                  fill="#395b35"
                  fontFamily="serif"
                  fontSize="62"
                  letterSpacing="12"
                >
                  雲水
                </text>
              </svg>
              <span>A NAME FOR THE JOURNEY</span>
            </div>
          </div>
        </section>
        <section className="ideology-origin">
          <div>
            <span className="eyebrow">01 / THE NAME</span>
            <h2>
              Two characters.
              <br />A way of moving.
            </h2>
          </div>
          <div>
            <p>
              <i>Unsui</i> (雲水) means “clouds and water.” In Zen Buddhist
              usage, it refers to monks in training. Its history evokes
              practitioners travelling between teachers and monasteries, likened
              to clouds and water without a fixed abode.
            </p>
            <p>
              Today, the term also describes monks resident in training
              monasteries. The journey is as much about learning as it is about
              movement.
            </p>
            <a
              className="ideology-source"
              href="https://www.sotozen.com/eng/library/glossary/individual.html?key=monk_in_training"
              target="_blank"
              rel="noreferrer"
            >
              Read the origin in the Sōtō Zen glossary{' '}
              <ArrowUpRight size={15} />
            </a>
          </div>
        </section>
        <section className="ideology-principles">
          <span className="eyebrow">02 / OUR INTERPRETATION</span>
          <h2>
            Travel lightly.
            <br />
            Keep possibility in motion.
          </h2>
          <p className="ideology-lead">
            We borrow an image from the name and bring it to a very everyday
            moment: leaving Japan with a little value still on your transit
            card.
          </p>
          <div className="ideology-values">
            <article>
              <Cloud size={29} strokeWidth={1.3} />
              <span>雲 / CLOUDS</span>
              <h3>Beyond the last stop.</h3>
              <p>
                Your journey does not end at a station gate. Our ambition is for
                your remaining balance to follow you into whatever comes next.
              </p>
            </article>
            <article>
              <Waves size={29} strokeWidth={1.3} />
              <span>水 / WATER</span>
              <h3>A change of form.</h3>
              <p>
                Water takes a new shape as it moves. That inspires our approach
                to connecting local transit value with a wallet you can carry
                onward.
              </p>
            </article>
            <article>
              <Footprints size={29} strokeWidth={1.3} />
              <span>道 / THE JOURNEY</span>
              <h3>Less to carry.</h3>
              <p>
                Make the experience feel simple: understand what is left, choose
                your next step and leave with a clear record of what happened.
              </p>
            </article>
          </div>
          <p className="ideology-note">
            These are UnSui’s design principles, inspired by the name’s imagery.
            They are our interpretation, rather than a statement of Zen teaching
            or religious affiliation.
          </p>
        </section>
        <section className="ideology-origin ideology-balance" id="why-redeem">
          <div>
            <span className="eyebrow">03 / WHY LEFTOVER VALUE MATTERS</span>
            <h2>
              The balance stays.
              <br />
              The world moves on.
            </h2>
            <div className="ideology-inflation">
              <strong>+3.2%</strong>
              <span>
                Japan’s consumer prices
                <br />
                2025 annual average vs. 2024
              </span>
            </div>
          </div>
          <div>
            <p>
              A transit card can sit in a drawer long after a trip ends. Its yen
              balance may stay the same, while rising prices reduce what that
              balance can buy. Value left unused is still exposed to inflation.
            </p>
            <p>
              Japan’s all-items Consumer Price Index rose 3.2% in 2025 compared
              with the previous year. This measures average consumer prices, not
              a reduction in the yen shown on the card or a uniform increase in
              every transit fare.
            </p>
            <a
              className="ideology-source"
              href="https://www.stat.go.jp/english/data/cpi/158c.htm"
              target="_blank"
              rel="noreferrer"
            >
              Source: Statistics Bureau of Japan · 2025 CPI{' '}
              <ArrowUpRight size={15} />
            </a>
            <p className="ideology-payout-note">
              UnSui is about making leftover value usable again. Redeeming into
              yen alone does not remove inflation exposure, and a crypto payout
              can rise or fall in value.
            </p>
          </div>
          <aside className="ideology-card-story">
            <span className="eyebrow">A REAL CARD. A RETURN TO TOKYO.</span>
            <h3>From ETHGlobal Tokyo, April 2023.</h3>
            <p>
              The creator still has the Suica from that hackathon visit, more
              than three years later, and plans to bring it back for the demo.
              It makes the problem tangible: the trip ended, but the card
              stayed.
            </p>
            <p>
              That old card is the starting point for a new question: what if
              the value left behind could continue the journey?
            </p>
          </aside>
        </section>
        <section className="ideology-symbol">
          <img
            src="/unsui-mark.svg?v=monk-5"
            width="120"
            height="120"
            alt="UnSui smiling novice monk mark"
          />
          <div>
            <span className="eyebrow">04 / THE MARK</span>
            <h2>A quiet moment on the journey.</h2>
            <p>
              Our round-faced novice monk connects the mark to the name’s roots.
              Resting eyes, a small smile and a folded robe give the traveller a
              calm, welcoming presence.
            </p>
            <p>
              The Japanese characters beside our name,{' '}
              <span lang="ja">雲水</span>, mean clouds and water.
            </p>
          </div>
        </section>
        <section className="ideology-closing">
          <span className="eyebrow">FROM AN IDEA TO AN EXPERIENCE</span>
          <h2>
            Your last stop.
            <br />A new beginning.
          </h2>
          <div>
            <a href="/demo" className="button dark">
              Try the experience <ArrowUpRight size={18} />
            </a>
            <a href="/how-it-works" className="ideology-text-link">
              See how it works <ArrowRight size={17} />
            </a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
