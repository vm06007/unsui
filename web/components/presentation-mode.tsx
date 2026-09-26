'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  LayoutDashboard,
  Maximize,
  MonitorPlay,
  ScanLine,
  ShieldCheck,
  Wallet,
  X,
} from 'lucide-react';
import { PresentationDetails, detailChapters, type PresentationScreenshots } from './presentation-details';
import { transactionLink } from '@/app/how-it-works/deployed-records';

const mainChapters = [
  'The idea',
  'The problem',
  'Suica refunds',
  'The experience',
  'The payout',
  'The workspace',
  'The proof',
  'Try it',
];

export function PresentationMode() {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [detailed, setDetailed] = useState(false);
  const [screenshots] = useState<PresentationScreenshots>({ merchant: '/images/sb-dashboard.jpg', workspace: '/images/unsui-dashboard.jpg' });
  const chapters = detailed ? detailChapters : mainChapters;
  function switchDeck(details: boolean) {
    memeVideo.current?.pause();
    setDetailed(details);
    setIndex(details ? 0 : mainChapters.length - 1);
    setDirection(details ? 1 : -1);
    setPlaybackError(false);
  }
  const [direction, setDirection] = useState(1);
  const [fullscreenError, setFullscreenError] = useState('');
  const memeVideo = useRef<HTMLVideoElement>(null);
  const [playbackError, setPlaybackError] = useState(false);
  useEffect(() => {
    if (!open || detailed || index !== 2) return;
    const video = memeVideo.current;
    if (!video) return;
    video.muted = false;
    void video.play().catch(() => setPlaybackError(true));
    return () => video.pause();
  }, [open, index, detailed]);
  function advance() {
    go(index + 1);
  }
  function go(next: number) {
    if (next !== index) {
      memeVideo.current?.pause();
      setPlaybackError(false);
    }
    setDirection(next >= index ? 1 : -1);
    setIndex(Math.max(0, Math.min(chapters.length - 1, next)));
  }
  function close() {
    if (document.fullscreenElement === dialog.current)
      void document.exitFullscreen();
    dialog.current?.close();
    setOpen(false);
    trigger.current?.focus();
  }
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);
  const slides = [
    <div className="pitch-cover" key="idea">
      <img src="/unsui-mark.svg?v=monk-5" alt="UnSui" width="96" height="96" />
      <p className="pitch-kicker">UNSUI / 雲水</p>
      <h2>
        Your journey
        <br />
        <em>goes on.</em>
      </h2>
      <p className="pitch-lead">
        A new destination for leftover transit balance.
      </p>
      <span className="pitch-tag">Built at ETHGlobal Tokyo 2026</span>
    </div>,
    <div className="pitch-problem-slide" key="problem">
      <div>
        <p className="pitch-kicker">THE PROBLEM</p>
        <h2>
          The trip ends.
          <br />
          <em>The balance stays.</em>
        </h2>
        <div className="pitch-statements">
          <p>A visitor leaves Japan with yen still on a transit card.</p>
          <p>For someone with no return trip planned, that value can sit unused.</p>
          <p>We want the last tap to open a next step.</p>
        </div>
      </div>
      <img
        className="pitch-problem-meme"
        src="/images/suica-refunds-meme.png"
        alt="Two-panel reaction meme: When JR East promises Suica refunds"
        width="1090"
        height="1443"
      />
    </div>,
    <div className="pitch-meme-slide" key="suica-refunds">
      <h2>When you ask JR East for Suica refund</h2>
      <video
        ref={memeVideo}
        className="pitch-meme-video"
        src="/videos/how-to-think-about-it.mp4"
        autoPlay
        loop
        playsInline
        controls
        preload="auto"
        aria-label="Suica refund meme video"
      />
      <p className="pitch-meme-quote">Can somebody get these beggars out of here!</p>
      {playbackError && <p role="status">Press Play on the video to start the audio.</p>}
    </div>,
    <div key="experience">
      <p className="pitch-kicker">THE EXPERIENCE</p>
      <h2>
        Tap. Choose.
        <br />
        <em>Take it with you.</em>
      </h2>
      <div className="pitch-steps">
        <article>
          <ScanLine />
          <span>01</span>
          <h3>Read the card</h3>
          <p>NFC balance and recent journeys on dGen1.</p>
        </article>
        <article>
          <Wallet />
          <span>02</span>
          <h3>Choose a destination</h3>
          <p>A .sui name, ENS name, address or the dGen1 wallet.</p>
        </article>
        <article>
          <ShieldCheck />
          <span>03</span>
          <h3>Confirm & follow</h3>
          <p>Re-scan, watch progress, then open the transaction.</p>
        </article>
      </div>
      <p className="pitch-note">
        A 2% fee is shown before confirmation. Refunds above ¥1,000 include a
        World ID check.
      </p>
    </div>,
    <div key="payout">
      <p className="pitch-kicker">THE PAYOUT</p>
      <h2>
        Three networks.
        <br />
        <em>One shared allowance.</em>
      </h2>
      <div className="pitch-networks">
        <article>
          <span>MAINNET</span>
          <h3>Sui</h3>
          <p>SUI paid at a backend-quoted SUI/JPY market rate.</p>
        </article>
        <article>
          <span>MAINNET</span>
          <h3>Ethereum</h3>
          <p>ETH paid through the funded payout contract.</p>
        </article>
        <article>
          <span>AWAJI TESTNET</span>
          <h3>Mizuhiki</h3>
          <p>1 MJPY per net yen. MIZU covers transaction gas.</p>
        </article>
      </div>
      <div className="pitch-rail">
        <span>Card + quote</span>
        <ArrowRight />
        <span>Hosted ledger</span>
        <ArrowRight />
        <span>Funded contract</span>
        <ArrowRight />
        <span>Recipient</span>
      </div>
      <p className="pitch-note">
        Neon preserves requests and signed transactions. Retries recover the
        same payout.
      </p>
    </div>,
    <div key="workspace">
      <p className="pitch-kicker">THE WORKSPACE</p>
      <h2>
        Every payout.
        <br />
        <em>Your point of view.</em>
      </h2>
      <div className="pitch-workspace">
        <div>
          <LayoutDashboard size={44} />
          <h3>One operations dashboard</h3>
          <p>Orders, recipients, transaction hashes and treasury scenarios.</p>
          <p>Choose cards, reorder columns, filter records, or switch views.</p>
        </div>
        <blockquote>
          “Show payouts and latest journeys first.”
          <span>
            The assistant updates the layout.
            <br />
            Undo brings the previous view back.
          </span>
        </blockquote>
      </div>
      <p className="pitch-note">
        The assistant changes display preferences. It does not issue payouts.
      </p>
    </div>,
    <div key="proof">
      <p className="pitch-kicker">WORKING TODAY</p>
      <h2>
        From a real scan
        <br />
        <em>to a real receipt.</em>
      </h2>
      <div className="pitch-proof">
        <div className="pitch-yen">
          ¥71<span>Confirmed Sui mainnet refund</span>
        </div>
        <div>
          <h3>0.3758237 SUI</h3>
          <p>¥69.58 after the 2% fee · sent to kartik.sui</p>
          <a href={transactionLink} target="_blank" rel="noreferrer">
            Inspect this transaction <ArrowUpRight size={20} />
          </a>
        </div>
      </div>
      <p className="pitch-note">
        The standalone Android app uses the hosted backend without a laptop. NFC
        reads the physical card; the shared refund ledger tracks its allowance.
        Merchant debit and live SBPS settlement are not connected.
      </p>
    </div>,
    <div className="pitch-cover" key="demo">
      <Check size={54} />
      <p className="pitch-kicker">LET’S MAKE THE NEXT TAP</p>
      <h2>
        See the journey.
        <br />
        <em>Then explore the proof.</em>
      </h2>
      <p className="pitch-lead">
        Start with the card. Finish in the dashboard.
      </p>
      <div className="pitch-cta">
        <a href="/demo">
          Open browser demo <ArrowUpRight />
        </a>
        <a href="/dashboard">
          Open dashboard <LayoutDashboard />
        </a>
        <a href="/downloads/unsui-1.0-arm64.apk" download>
          Get Android app <Wallet />
        </a>
      </div>
      <button className="pitch-details-link" onClick={() => switchDeck(true)}>
        How it works — detailed slides <ArrowRight size={20} />
      </button>
      <p className="pitch-note">
        Browser walkthrough uses sample receipts. The Android app performs
        on-chain payouts.
      </p>
    </div>,
  ];
  return (
    <>
      <button
        ref={trigger}
        className="button outline"
        onClick={() => {
          setIndex(0);
          setDetailed(false);
          setDirection(1);
          setFullscreenError('');
          dialog.current?.showModal();
          setOpen(true);
        }}
      >
        <MonitorPlay size={19} /> Present the project
      </button>
      <dialog
        ref={dialog}
        className="pitch-dialog"
        aria-label="UnSui project presentation"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onKeyDown={(event) => {
          if ((event.target as HTMLElement).closest('input, textarea, select, [role=slider], video')) return;
          if (event.key === 'ArrowRight' || event.key === 'PageDown') {
            event.preventDefault();
            advance();
          }
          if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
            event.preventDefault();
            go(index - 1);
          }
          if (event.key === 'Home') {
            event.preventDefault();
            go(0);
          }
          if (event.key === 'End') {
            event.preventDefault();
            go(chapters.length - 1);
          }
        }}
      >
        <header className="pitch-header">
          <span>
            unsui <small>雲水</small>
          </span>
          <div>
            {detailed && <button className="pitch-back-to-main" onClick={() => switchDeck(false)}><ArrowLeft size={18} /> Back to main slides</button>}
            <button
              aria-label="Toggle presentation fullscreen"
              onClick={async () => {
                try {
                  if (document.fullscreenElement)
                    await document.exitFullscreen();
                  else await dialog.current?.requestFullscreen();
                } catch {
                  setFullscreenError(
                    'Fullscreen unavailable. The presentation still fills this window.',
                  );
                }
              }}
            >
              <Maximize size={20} />
            </button>
            <button onClick={close} aria-label="Close presentation">
              <X size={24} />
            </button>
          </div>
        </header>
        <div className="pitch-stage" key={`stage-${detailed}-${index}`}>
          <section
            key={`${detailed}-${index}`}
            className={`pitch-slide ${detailed ? 'pitch-detailed' : ''} ${direction < 0 ? 'pitch-backward' : ''}`}
            aria-label={`${index + 1} of ${chapters.length}: ${chapters[index]}`}
          >
            {open ? detailed ? <PresentationDetails index={index} screenshots={screenshots} /> : slides[index] : null}
          </section>
        </div>
        <footer className="pitch-controls">
          <button
            onClick={() => go(index - 1)}
            disabled={index === 0}
            aria-label="Previous slide"
          >
            <ArrowLeft size={22} />
          </button>
          <nav aria-label="Slides">
            {chapters.map((chapter, n) => (
              <button
                key={chapter}
                aria-label={`Slide ${n + 1}: ${chapter}`}
                aria-current={index === n ? 'step' : undefined}
                onClick={() => go(n)}
              />
            ))}
          </nav>
          <span aria-live="polite">
            {index + 1} / {chapters.length} · {chapters[index]}
          </span>
          <button
            onClick={advance}
            disabled={index === chapters.length - 1}
            aria-label="Next slide"
          >
            <ArrowRight size={22} />
          </button>
        </footer>
        {fullscreenError && (
          <p role="status" className="pitch-error">
            {fullscreenError}
          </p>
        )}
      </dialog>
    </>
  );
}
