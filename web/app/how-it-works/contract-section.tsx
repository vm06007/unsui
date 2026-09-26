import { ArrowRight, Check, ExternalLink } from 'lucide-react';
import {
  ledger,
  objectLink,
  pkg,
  receipt,
  tx,
  transactionLink,
} from './deployed-records';

export function ContractSection() {
  return (
    <section className="arch-section contract-section" id="contract">
      <div className="arch-section-heading">
        <span className="arch-kicker">04 / ONE CLAIM, ONE PAYOUT</span>
        <h2>
          Sui makes the payout
          <br />
          and the record inseparable.
        </h2>
        <p>
          The Sui mainnet contract uses a shared Move ledger. Every successful
          refund updates the card’s total and sequence, consumes a request ID,
          creates an immutable receipt and transfers SUI in one transaction.
        </p>
      </div>
      <div className="contract-flow">
        <div>
          <small>INPUT</small>
          <h3>Authorized request</h3>
          <p>
            Card commitment
            <br />
            Request ID + recipient
            <br />
            Amount + observed balance
            <br />
            Expected sequence + expiry
          </p>
        </div>
        <ArrowRight />
        <div className="contract-checks">
          <small>CONTRACT GATES</small>
          <h3>Check every condition</h3>
          <ul>
            <li>
              <Check />
              Authorized operator; not paused
            </li>
            <li>
              <Check />
              Request ID not already consumed
            </li>
            <li>
              <Check />
              Expected card sequence matches
            </li>
            <li>
              <Check />
              Within attested balance + expiry
            </li>
            <li>
              <Check />
              Enough SUI in the pool
            </li>
          </ul>
        </div>
        <ArrowRight />
        <div>
          <small>ATOMIC RESULT</small>
          <h3>Record + transfer</h3>
          <p>
            Advance total and sequence
            <br />
            Link and freeze receipt
            <br />
            Emit refund event
            <br />
            Pay the destination wallet
          </p>
        </div>
      </div>
      <div className="failure-strip">
        <span>Any check fails</span>
        <ArrowRight size={18} />
        <b>Transaction aborts</b>
        <span>
          No partial payout or partial ledger update. Transaction gas may still
          be charged.
        </span>
      </div>
      <div className="double-spend-grid">
        <article>
          <span className="implemented-badge">DEPLOYED ON MAINNET</span>
          <h3>Prevent replay inside this ledger.</h3>
          <p>
            Submitting the same request ID twice cannot pay twice. A stale
            sequence rejects racing updates. Cumulative refunds cannot exceed
            the operator-attested balance for that card commitment. These checks
            do not authenticate the physical card balance.
          </p>
        </article>
        <article>
          <span className="planned-badge">
            REQUIRED FOR THE PAYMENT INTEGRATION
          </span>
          <h3>Consume the payment—not just a request.</h3>
          <p>
            Add a unique payment commitment derived from the verified processor
            reference and merchant context. Enforce its payout cap on-chain so a
            second request ID cannot redeem the same purchase again. This
            merchant-payment binding is not in the current contract.
          </p>
        </article>
      </div>
      <p className="arch-footnote">
        Sui and Ethereum mainnet payouts share the hosted refund allowance with
        MJPY payouts on Awaji testnet. Neon stores reservations and signed
        transactions so retries recover the same payout. Merchant payment
        verification remains a separate integration.
      </p>
      <div className="contract-links">
        <h3>
          Inspect the deployed contracts <span>MAINNET + AWAJI TESTNET</span>
        </h3>
        {[
          { name: 'Move package', id: pkg },
          { name: 'Shared treasury & ledger', id: ledger },
          { name: 'Immutable example receipt', id: receipt },
        ].map((item) => (
          <a
            key={item.id}
            href={objectLink(item.id)}
            target="_blank"
            rel="noreferrer"
          >
            <div>
              <span>{item.name}</span>
              <code>{item.id}</code>
            </div>
            <ExternalLink size={18} />
          </a>
        ))}
        <a href={transactionLink} target="_blank" rel="noreferrer">
          <div>
            <span>Example payout transaction</span>
            <code>{tx}</code>
          </div>
          <ExternalLink size={18} />
        </a>
        <a
          href="https://etherscan.io/address/0xeAf3e03A76eb5Be4E08E0b0FF415CA3422319C52"
          target="_blank"
          rel="noreferrer"
        >
          <span>Ethereum mainnet · ETH treasury</span>
          <ExternalLink size={18} />
        </a>
        <a
          href="https://awaji.blockscout.com/address/0xeAf3e03A76eb5Be4E08E0b0FF415CA3422319C52"
          target="_blank"
          rel="noreferrer"
        >
          <span>Mizuhiki Awaji testnet · MJPY treasury</span>
          <ExternalLink size={18} />
        </a>
        <p>
          These links show the active Sui package, treasury and a confirmed
          mainnet payout. Balances change with funding and refunds. The
          publisher retains upgrade and administration capabilities.
        </p>
      </div>
    </section>
  );
}
