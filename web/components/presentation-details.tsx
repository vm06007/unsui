'use client';

import { useRef } from 'react';
import { ArrowRight, ArrowLeft, ArrowUp, ArrowDown, ArrowUpRight, Maximize2, X } from 'lucide-react';
import { ledger, objectLink, pkg, receipt, transactionLink } from '@/app/how-it-works/deployed-records';

import { MoneyCycle, ChargeSequence, ClaimTree } from '@/app/how-it-works/money-cycle';
import BufferChart from '@/app/how-it-works/buffer-chart';

export const detailChapters = ['End to end', 'Quote & confirmation', 'Treasury cycle', 'Money cycle', 'Buffer model', 'Receipt commitments', 'Merchant records', 'Operations workspace', 'Follow the proof'];
export type PresentationScreenshots = { merchant?: string; workspace?: string };

type Props = {
  index: number;
  screenshots: PresentationScreenshots;
};

function ScreenshotSlot({ slot, title, screenshots }: Omit<Props, 'index'> & { slot: keyof PresentationScreenshots; title: string }) {
  const viewer = useRef<HTMLDialogElement>(null);
  const source = screenshots[slot];
  if (!source) return null;
  return (
    <div className="detail-screenshot">
      <button type="button" className="detail-screenshot-preview" aria-label={`Enlarge ${title}`} onClick={() => viewer.current?.showModal()}>
        <img src={source} alt={title} />
        <span className="detail-enlarge"><Maximize2 size={18} /> Enlarge screenshot</span>
      </button>
      <dialog ref={viewer} className="detail-image-viewer" aria-label={title}
        onCancel={(event) => { event.preventDefault(); event.stopPropagation(); viewer.current?.close(); }}
        onKeyDown={(event) => event.stopPropagation()}>
        <header><strong>{title}</strong><button type="button" aria-label="Close screenshot" onClick={() => viewer.current?.close()} autoFocus><X size={24} /></button></header>
        <div className="detail-image-canvas"><img src={source} alt={title} /></div>
      </dialog>
    </div>
  );
}

export function PresentationDetails({ index, screenshots }: Props) {
  const slides = [
    <div className="detail-refund-flow" key="flow">
      <p className="pitch-kicker">HOW IT WORKS / 01</p>
      <h2>One refund.<br /><em>Start to finish.</em></h2>
      <ChargeSequence />
    </div>,
    <div key="quote">
      <p className="pitch-kicker">HOW IT WORKS / 02</p>
      <h2>A clear quote.<br /><em>One shared allowance.</em></h2>
      <div className="detail-two-column">
        <div className="detail-calculation"><span>CONFIRMED SUI REFUND</span><strong>¥71</strong><p>− ¥1.42 fee (2%)</p><hr /><strong>¥69.58</strong><p>Converted at the quoted SUI/JPY rate</p><b>0.3758237 SUI</b></div>
        <div className="pitch-statements"><p>Recipient names resolve to an address before confirmation.</p><p>Sui quotes expire after five minutes. The contract pays the exact quoted MIST amount.</p><p>Refunds above ¥1,000 require World ID. The ledger tracks the card’s remaining allowance across payout networks.</p><p>Request IDs and saved transaction records make retries traceable.</p></div>
      </div>
    </div>,
    <div key="cycle">
      <p className="pitch-kicker">HOW IT WORKS / 03</p>
      <h2>Fund first.<br /><em>Track every movement.</em></h2>
      <div className="detail-cycle">
        <article><span>01</span><h3>Fund the treasury</h3><p>Deposit the payout asset into its network’s contract.</p></article>
        <span className="detail-cycle-arrow detail-cycle-right" aria-hidden="true"><ArrowRight /></span>
        <article><span>02</span><h3>Confirm the quote</h3><p>The backend checks the request and card allowance.</p></article>
        <span className="detail-cycle-arrow detail-cycle-up" aria-hidden="true"><ArrowUp /></span>
        <span className="detail-cycle-arrow detail-cycle-down" aria-hidden="true"><ArrowDown /></span>
        <article><span>04</span><h3>Review & replenish</h3><p>Use balances, payout records and forecast scenarios to plan the next funding.</p></article>
        <span className="detail-cycle-arrow detail-cycle-left" aria-hidden="true"><ArrowLeft /></span>
        <article><span>03</span><h3>Pay & record</h3><p>The contract transfers the asset. The transaction links to the refund record.</p></article>
      </div>
      <p className="pitch-note">Cycle: fund → confirm → pay → review → fund again. Available on-chain liquidity funds the payout; a forecast is a planning scenario.</p>
    </div>,
    <div className="detail-money-cycle" key="money-cycle">
      <p className="pitch-kicker">HOW IT WORKS / 04 / SANDBOX</p>
      <MoneyCycle />
    </div>,
    <div className="detail-buffer-model" key="buffer-model">
      <p className="pitch-kicker">HOW IT WORKS / 05 / SANDBOX TREASURY MODEL</p>
      <BufferChart />
    </div>,
    <div key="commitments">
      <p className="pitch-kicker">HOW IT WORKS / 06</p>
      <h2>Linked receipts.<br /><em>Verifiable commitments.</em></h2>
      <div className="detail-commitments">
        <article><h3>The receipt chain</h3><div className="receipt-chain"><div>Receipt #1<small>Hash A</small></div><ArrowRight /><div>Receipt #2<small>Includes Hash A</small></div><ArrowRight /><div>Receipt #3<small>Includes Hash B</small></div></div><p>Each receipt includes the previous receipt’s ID and hash, the current claim, sequence and timestamp. The ledger stores the latest head.</p></article>
        <article><h3>The claim commitment</h3><ClaimTree /><p>Four leaves bind the card commitment, recipient, JPY amount and observed balance. The receipt hash covers the full BCS-encoded receipt.</p></article>
      </div>
      <p className="pitch-note">On-chain records make the payout inspectable. Merchant and bank records supply the off-chain payment and settlement context.</p>
    </div>,
    <div key="merchant">
      <p className="pitch-kicker">HOW IT WORKS / 07</p>
      <h2>Merchant identity.<br /><em>A record to reconcile.</em></h2>
      <div className="detail-evidence-grid">
        <div className="pitch-statements"><p><strong>merchant_id</strong> identifies the merchant; <strong>service_id</strong> identifies the contracted service.</p><p><strong>order_id</strong> connects the purchase reference to operational tracking.</p><p>Compare purchase amount, merchant reference and payout status in the reconciliation view.</p><a className="detail-link" href="https://developer.sbpayment.jp/system-specifications/link-type/2517/" target="_blank" rel="noreferrer">SB Payment API documentation <ArrowUpRight size={18} /></a></div>
        <ScreenshotSlot slot="merchant" title="SB dashboard screenshot" screenshots={screenshots} />
      </div>
    </div>,
    <div key="workspace">
      <p className="pitch-kicker">HOW IT WORKS / 08</p>
      <h2>The same journey.<br /><em>An operations view.</em></h2>
      <div className="detail-evidence-grid">
        <div className="pitch-statements"><p><strong>Orders:</strong> follow recipient, asset, status and transaction link.</p><p><strong>Reconciliation:</strong> compare records and bring exceptions into view.</p><p><strong>Treasury:</strong> inspect balances and explore forecast assumptions.</p><p><strong>Assistant:</strong> change filters, columns and card layouts, with Undo.</p><a className="detail-link" href="/dashboard" target="_blank" rel="noreferrer">Open UnSui dashboard <ArrowUpRight size={18} /></a></div>
        <ScreenshotSlot slot="workspace" title="UnSui dashboard screenshot" screenshots={screenshots} />
      </div>
    </div>,
    <div key="proof">
      <p className="pitch-kicker">HOW IT WORKS / 09</p>
      <h2>Don’t stop at the screen.<br /><em>Follow the proof.</em></h2>
      <div className="detail-proof-links">
        <a href={transactionLink} target="_blank" rel="noreferrer"><span>01 / TRANSACTION</span><h3>¥71 → 0.3758237 SUI</h3><p>Inspect the confirmed Sui mainnet payout to kartik.sui.</p><ArrowUpRight /></a>
        <a href={objectLink(receipt)} target="_blank" rel="noreferrer"><span>02 / RECEIPT</span><h3>The recorded refund</h3><p>Open the receipt object associated with the payout.</p><ArrowUpRight /></a>
        <a href={objectLink(ledger)} target="_blank" rel="noreferrer"><span>03 / TREASURY</span><h3>The funded ledger</h3><p>Inspect the ledger object and its on-chain state.</p><ArrowUpRight /></a>
      </div>
      <div className="detail-resource-links"><a href={objectLink(pkg)} target="_blank" rel="noreferrer">Sui package ↗</a><a href="https://etherscan.io/address/0xeAf3e03A76eb5Be4E08E0b0FF415CA3422319C52" target="_blank" rel="noreferrer">Ethereum contract ↗</a><a href="https://awaji.blockscout.com/address/0xeAf3e03A76eb5Be4E08E0b0FF415CA3422319C52" target="_blank" rel="noreferrer">Awaji contract ↗</a><a href="/how-it-works" target="_blank" rel="noreferrer">Full architecture page ↗</a></div>
      <p className="pitch-note">The explorer shows the on-chain payout. Merchant and order references provide the operational context alongside it.</p>
    </div>,
  ];
  return slides[index] ?? null;
}
