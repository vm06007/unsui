import {
  ArrowRight,
  ScanLine,
  FileCheck,
  ShieldCheck,
  Database,
  Wallet,
} from 'lucide-react';
import { ChargeSequence, MoneyCycle } from './money-cycle';

export function MoneyFlow() {
  return (
    <>
      <section className="arch-section" id="money-flow">
        <div className="arch-section-heading">
          <span className="arch-kicker">01 / FROM A TAP TO A TRANSACTION</span>
          <h2>
            Your card on the phone.
            <br />
            Your payout on-chain.
          </h2>
          <p>
            UnSui reads the card over NFC, prepares the payout and confirms it
            through the hosted backend. A prefunded contract sends the funds to
            your chosen address. The phone and dashboard share the same recorded
            result.
          </p>
        </div>
        <div className="flow-board">
          <div className="flow-board-title">
            <span className="implemented-badge">HOW UNSUI WORKS TODAY</span>
            <span>Scan → confirm → follow the transaction.</span>
          </div>
          <ol className="money-nodes">
            <li>
              <ScanLine />
              <small>01 · SCAN & QUOTE</small>
              <h3>A balance and a destination</h3>
              <p>
                Read the transit card, select the network and enter a wallet
                address, .sui name or ENS name. Review the amount and 2% fee.
              </p>
            </li>
            <li>
              <ShieldCheck />
              <small>02 · CONFIRM</small>
              <h3>Check the same card</h3>
              <p>
                Re-scan to confirm. The backend checks the quote, remaining
                allowance and request ID. Refunds above ¥1,000 also require
                World ID verification.
              </p>
            </li>
            <li>
              <FileCheck />
              <small>03 · ISSUE THE PAYOUT</small>
              <h3>One request, one result</h3>
              <p>
                The operator signs the payout and waits for chain confirmation.
                An interrupted request reuses its saved transaction when
                retried.
              </p>
            </li>
          </ol>
          <div className="split-connector">
            <span>Transaction confirmed</span>
            <div />
            <span>One result, two views</span>
          </div>
          <div className="payment-lanes">
            <article className="payout-lane">
              <div className="lane-heading">
                <Wallet />
                <span>ON THE PHONE</span>
                <b>Funds and a receipt</b>
              </div>
              <div className="lane-steps">
                <div>
                  <strong>Funded treasury</strong>
                  <small>SUI · ETH · MJPY</small>
                </div>
                <ArrowRight />
                <div>
                  <strong>Payout contract</strong>
                  <small>Check → record → transfer</small>
                </div>
                <ArrowRight />
                <div>
                  <strong>Destination wallet</strong>
                  <small>Confirmed transaction</small>
                </div>
              </div>
              <p>
                Sui and Ethereum payouts run on mainnet. Mizuhiki Awaji pays
                MJPY on testnet at 1 MJPY per net yen. The app shows progress,
                then the receipt and explorer link.
              </p>
            </article>
            <article className="settlement-lane">
              <div className="lane-heading">
                <Database />
                <span>IN OPERATIONS</span>
                <b>The same receipt, ready to inspect</b>
              </div>
              <div className="lane-steps">
                <div>
                  <strong>Hosted ledger</strong>
                  <small>Durable refund history</small>
                </div>
                <ArrowRight />
                <div>
                  <strong>Dashboard</strong>
                  <small>Orders, recipients, hashes</small>
                </div>
                <ArrowRight />
                <div>
                  <strong>Explorer</strong>
                  <small>Inspect the chain record</small>
                </div>
              </div>
              <p>
                Filter orders, choose cards and columns, or ask the workspace
                assistant to arrange the view. The SB extension presents
                merchant-shaped records for the demonstration; live SBPS
                settlement is not connected.
              </p>
            </article>
          </div>
        </div>
        <div className="arch-callout">
          <Wallet />
          <p>
            <b>Funded before the scan.</b> Payouts use the contract’s existing
            balance. Operators replenish the treasury directly. NFC reads the
            transit card; the refund ledger tracks the allowance without
            debiting the physical card.
          </p>
        </div>
        <div className="arch-actions">
          <a className="button dark" href="/dashboard">
            Explore the operations dashboard <ArrowRight size={18} />
          </a>
        </div>
      </section>
      <section className="arch-section" id="card-transaction">
        <ChargeSequence />
      </section>
      <section className="arch-section" id="settlement-model">
        <div className="arch-section-heading">
          <span className="arch-kicker">THE MERCHANT SETTLEMENT MODEL</span>
          <h2>How replenishment can follow.</h2>
          <p>
            The working payout path uses operator-funded liquidity. This model
            shows how verified merchant payments and later yen settlement could
            replenish it when the payment provider is connected.
          </p>
        </div>
        <MoneyCycle />
      </section>
    </>
  );
}
