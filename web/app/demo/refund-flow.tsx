'use client';
import { useRef, useState } from 'react';
import { transactionLink } from '../how-it-works/deployed-records';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  LoaderCircle,
  ScanLine,
  ShieldCheck,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DEMO_ADDRESSES,
  demoPayout,
  DEMO_NETWORKS,
  type Chain,
  type Receipt,
} from '@/lib/demo-engine';

export function RefundFlow({
  flow,
  chain,
  amount,
  address,
  balance,
  error,
  recent,
  confetti,
  onBack,
  onChain,
  onAmount,
  onAddress,
  onConfirm,
  onReplay,
  onShowProof,
  onScan,
  onHome,
  onHumanComplete,
}: {
  flow: 'refund' | 'human' | 'sending' | 'success';
  chain: Chain;
  amount: number;
  address: string;
  balance: number;
  error: string;
  recent?: Receipt;
  confetti: number;
  onBack: () => void;
  onChain: (chain: Chain) => void;
  onAmount: (amount: number) => void;
  onAddress: (address: string) => void;
  onConfirm: () => void;
  onReplay: () => void;
  onShowProof: (receipt: Receipt) => void;
  onScan: () => void;
  onHome: () => void;
  onHumanComplete: () => void;
}) {
  const [nameInput, setNameInput] = useState('');
  const [resolutionError, setResolutionError] = useState('');
  const [resolving, setResolving] = useState(false);
  const lookup = useRef(0);
  async function resolveName(value = nameInput) {
    const run = ++lookup.current;
    setResolving(true);
    setResolutionError('');
    try {
      const response = await fetch(
        `/api/mobile/${chain === 'sui' ? 'sui' : 'ens'}/resolve-name`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            chain === 'sui'
              ? { variables: { name: value.trim() } }
              : { name: value.trim() },
          ),
          signal: AbortSignal.timeout(15000),
        },
      );
      const data = (await response.json()) as {
        address?: string;
        data?: { nameRecord?: { target?: { address?: string } } };
        error?: string;
      };
      if (!response.ok)
        throw new Error(
          data.error || 'Name lookup unavailable. Enter a full address.',
        );
      const result = data.address || data.data?.nameRecord?.target?.address;
      if (!result) throw new Error('No address found.');
      if (run === lookup.current) onAddress(result);
    } catch (cause) {
      if (run === lookup.current)
        setResolutionError(
          cause instanceof Error ? cause.message : 'Name lookup unavailable.',
        );
    } finally {
      if (run === lookup.current) setResolving(false);
    }
  }
  if (flow === 'human')
    return (
      <div className="flow-screen">
        <ShieldCheck size={38} />
        <h1>Verify with World ID</h1>
        <p>
          Refunds above ¥1,000 include a human verification step before the
          confirmation scan.
        </p>
        <div className="refund-summary">
          <p>
            On the phone, the verification page offers a QR code to scan with
            World App on another device, or a same-device handoff.
          </p>
        </div>
        <p className="small-print">
          This walkthrough previews the step; it does not create a World ID
          proof.
        </p>
        <button className="button dark full" onClick={onHumanComplete}>
          Continue walkthrough
        </button>
        <button className="home-link" onClick={onBack}>
          Cancel check
        </button>
      </div>
    );
  const asset = DEMO_NETWORKS[chain].asset;
  if (flow === 'sending') {
    return (
      <div className="processing flow-screen" role="status">
        <div className="processing-spinner">
          <LoaderCircle size={42} />
        </div>
        <span className="eyebrow">ONE MOMENT</span>
        <h1>Issuing refund…</h1>
        <p>Following the {DEMO_NETWORKS[chain].name} payout flow.</p>
        <div className="processing-steps">
          <span>
            <Check size={16} /> Card confirmed
          </span>
          <span>
            <LoaderCircle size={16} /> Waiting for confirmation
          </span>
        </div>
      </div>
    );
  }
  if (flow === 'success' && recent) {
    return (
      <div className="success-screen flow-screen">
        <div className="confetti" key={confetti} aria-hidden="true">
          {Array.from({ length: 18 }, (_, index) => (
            <i
              key={index}
              style={{
                left: `${index * 5.7}%`,
                animationDelay: `${(index % 5) * 0.08}s`,
                background: ['#b3e978', '#39734a', '#e4c08b', '#8dc6dd'][
                  index % 4
                ],
              }}
            />
          ))}
        </div>
        <button
          className="success-tick"
          onClick={onReplay}
          aria-label="Replay celebration"
        >
          <Check size={42} />
        </button>
        <span className="eyebrow">A NEW BEGINNING</span>
        <h1>A little goes further.</h1>
        <div className="success-amount">
          {recent.amount.toFixed(recent.chain === 'sui' ? 4 : 6)}
          <small>{DEMO_NETWORKS[recent.chain].asset}</small>
        </div>
        <p>Your walkthrough is complete.</p>
        <div className="success-receipt">
          <div>
            <span>Refund amount</span>
            <b>¥{recent.amountJpy.toLocaleString()}</b>
          </div>
          <div>
            <span>Still with you</span>
            <b>¥{balance.toLocaleString()}</b>
          </div>
          <div>
            <span>Receipt</span>
            <b>
              #{recent.sequence} · {DEMO_NETWORKS[recent.chain].name}
            </b>
          </div>
          <div>
            <span>Fee (2%)</span>
            <b>¥{(recent.amountJpy * 0.02).toFixed(2)}</b>
          </div>
          <label>LOCAL RECEIPT HASH</label>
          <code>{recent.hash}</code>
        </div>
        <a
          className="text-link"
          href={transactionLink}
          target="_blank"
          rel="noreferrer"
        >
          View a real Sui payout example <ArrowUpRight size={16} />
        </a>
        <button className="proof-button" onClick={() => onShowProof(recent)}>
          <ShieldCheck size={20} />
          <span>
            Explore your proof
            <small>Merkle tree + linked receipt</small>
          </span>
          <ChevronRight size={18} />
        </button>
        <button className="button dark full" onClick={onScan}>
          <ScanLine size={18} /> Rescan card
        </button>
        <button className="home-link" onClick={onHome}>
          Back to home
        </button>
      </div>
    );
  }
  return (
    <div className="flow-screen">
      <div className="flow-top">
        <button
          className="icon-button"
          aria-label="Back to wallet"
          onClick={onBack}
        >
          <ArrowLeft />
        </button>
        <span>YOUR NEXT DESTINATION</span>
        <div />
      </div>
      <span className="flow-symbol">
        <ArrowUpRight size={30} />
      </span>
      <h1>
        Take a little
        <br />
        Japan with you.
      </h1>
      <p>Give your leftover balance a new beginning.</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm();
        }}
      >
        <div className="refund-summary">
          <span>Refund amount</span>
          <b>¥{amount.toLocaleString()}</b>
        </div>
        <div className="network-row">
          <span>Send to</span>
          <Select
            value={chain}
            onValueChange={(value) => {
              if (
                value === 'sui' ||
                value === 'ethereum' ||
                value === 'mizuhiki'
              ) {
                lookup.current++;
                setNameInput('');
                setResolutionError('');
                setResolving(false);
                onChain(value);
              }
            }}
          >
            <SelectTrigger aria-label="Refund network">
              <SelectValue>{DEMO_NETWORKS[chain].name}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sui">Sui · Default</SelectItem>
              <SelectItem value="ethereum">Ethereum</SelectItem>
              <SelectItem value="mizuhiki">Mizuhiki · Awaji Testnet</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <label className="address-input">
          {chain === 'sui'
            ? 'Sui address or .sui name'
            : 'Wallet address or ENS name'}
          <div className="demo-recipient-input">
            <input
              value={nameInput || address}
              placeholder={
                chain === 'sui' ? 'kartik.sui or 0x…' : 'name.eth or 0x…'
              }
              onChange={(event) => {
                lookup.current++;
                setResolving(false);
                setResolutionError('');
                const value = event.target.value;
                setNameInput(value);
                onAddress(value.startsWith('0x') ? value : '');
              }}
              spellCheck={false}
              aria-label="Recipient address or name"
            />
            <button
              type="button"
              onClick={() => void resolveName()}
              disabled={resolving || !nameInput || nameInput.startsWith('0x')}
              aria-label="Resolve name"
            >
              {resolving ? (
                <LoaderCircle size={18} className="spin" />
              ) : (
                <Check size={18} />
              )}
            </button>
          </div>
        </label>
        {nameInput && address && !nameInput.startsWith('0x') && (
          <p className="demo-resolved" role="status">
            Resolved · {address}
          </p>
        )}
        {resolutionError && (
          <p className="form-error" role="alert">
            {resolutionError}
          </p>
        )}
        <button
          type="button"
          className="sample-address"
          onClick={() => {
            if (chain === 'sui') {
              setNameInput('kartik.sui');
              onAddress('');
              void resolveName('kartik.sui');
            } else {
              lookup.current++;
              setNameInput('');
              onAddress(DEMO_ADDRESSES[chain]);
            }
          }}
        >
          Use {chain === 'sui' ? 'developer' : 'sample'} address
        </button>
        {chain !== 'sui' && (
          <p className="rate-note">
            On dGen1, you can also use the device wallet and sign to select its
            address.
          </p>
        )}
        <div className="refund-summary">
          <span>You’ll receive</span>
          <b>
            {demoPayout(amount, chain).toFixed(chain === 'sui' ? 4 : 6)} {asset}
          </b>
        </div>
        <span className="rate-note">
          2% fee included · Sample SUI/ETH rates · 1 MJPY per net yen
        </span>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="button dark full" type="submit">
          {amount > 1000 ? 'Continue to World ID' : 'Confirm with a scan'}{' '}
          <ScanLine size={20} />
        </button>
      </form>
      <p className="small-print">
        Interactive walkthrough · Install the app for on-chain payouts
      </p>
    </div>
  );
}
