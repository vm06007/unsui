'use client';
import { ThemeToggle } from '@/components/theme-toggle';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, RotateCcw, LayoutDashboard } from 'lucide-react';
import {
  DEMO_ADDRESSES,
  DEMO_NETWORKS,
  TRIPS,
  issueDemoReceipt,
  verifyDemoReceipt,
  type Chain,
  type Receipt,
} from '@/lib/demo-engine';
import { DemoDialogs } from './demo-dialogs';
import { DemoExplainer } from './demo-explainer';
import { RefundFlow } from './refund-flow';
import { WalletView } from './wallet-view';

export default function Demo() {
  const [tab, setTab] = useState('home');
  const [balance, setBalance] = useState(1500);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [flow, setFlow] = useState<
    'wallet' | 'refund' | 'human' | 'sending' | 'success'
  >('wallet');
  const [chain, setChain] = useState<Chain>('sui');
  const [amount, setAmount] = useState(1500);
  const [address, setAddress] = useState(DEMO_ADDRESSES.sui);
  const [error, setError] = useState('');
  const [scanner, setScanner] = useState<'read' | 'confirm' | null>(null);
  const [scanBusy, setScanBusy] = useState(false);
  const [proof, setProof] = useState<Receipt | null>(null);
  const [proofStatus, setProofStatus] = useState<
    'idle' | 'checking' | 'valid' | 'changed'
  >('idle');
  const [message, setMessage] = useState('');
  const [confetti, setConfetti] = useState(0);
  const [selectedTrip, setSelectedTrip] = useState<
    (typeof TRIPS)[number] | null
  >(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busy = useRef(false);
  const generation = useRef(0);
  const recent = receipts.at(-1);

  useEffect(
    () => () => {
      generation.current++;
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  useEffect(() => {
    if (!message) return;
    const timeout = setTimeout(() => setMessage(''), 3500);
    return () => clearTimeout(timeout);
  }, [message]);
  useEffect(() => {
    const context = (
      document as unknown as {
        modelContext?: {
          registerTool: (tool: unknown, options: unknown) => void;
        };
      }
    ).modelContext;
    if (!context) return;
    const lifecycle = new AbortController();
    try {
      context.registerTool(
        {
          name: 'get_unsui_demo_state',
          description:
            'Read the browser-only sample wallet balance and receipts. No real funds are involved.',
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true },
          execute: () => ({
            balanceJpy: balance,
            screen: flow,
            receiptCount: receipts.length,
          }),
        },
        { signal: lifecycle.signal },
      );
      context.registerTool(
        {
          name: 'open_unsui_sample_scanner',
          description:
            'Open the visible sample-card scanner. Does not read NFC or issue a refund.',
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false },
          execute: (input: unknown) => {
            if (
              !input ||
              typeof input !== 'object' ||
              Object.keys(input).length
            )
              throw Error('No parameters expected');
            if (flow === 'sending') throw Error('A refund is in progress');
            setScanner('read');
            return { opened: true };
          },
        },
        { signal: lifecycle.signal },
      );
    } catch {
      /* Optional browser capability. */
    }
    return () => lifecycle.abort();
  }, [balance, flow, receipts.length]);

  function reset() {
    generation.current++;
    if (timer.current) clearTimeout(timer.current);
    busy.current = false;
    setBalance(1500);
    setAmount(1500);
    setReceipts([]);
    setFlow('wallet');
    setTab('home');
    setScanner(null);
    setScanBusy(false);
    setProof(null);
    setMessage('A fresh journey. Your sample card is ready.');
  }
  function openRefund() {
    if (!balance) {
      setMessage('This card has been refunded. Start a new demo to try again.');
      return;
    }
    setAmount(balance);
    setError('');
    setFlow('refund');
  }
  function closeScanner() {
    if (timer.current) clearTimeout(timer.current);
    setScanBusy(false);
    setScanner(null);
  }
  function confirm() {
    setError('');
    if (!Number.isInteger(amount) || amount < 1 || amount > balance) {
      setError(`Choose an amount from ¥1 to ¥${balance.toLocaleString()}.`);
      return;
    }
    if (
      !(chain === 'sui' ? /^0x[0-9a-fA-F]{64}$/ : /^0x[0-9a-fA-F]{40}$/).test(
        address.trim(),
      )
    ) {
      setError(`Enter a valid ${DEMO_NETWORKS[chain].name} address.`);
      return;
    }
    if (amount > 1000) setFlow('human');
    else setScanner('confirm');
  }
  async function issue() {
    if (busy.current) return;
    busy.current = true;
    const run = ++generation.current;
    setFlow('sending');
    try {
      const [receipt] = await Promise.all([
        issueDemoReceipt(chain, address.trim(), amount, recent),
        new Promise((resolve) => {
          timer.current = setTimeout(resolve, 2200);
        }),
      ]);
      if (run !== generation.current) return;
      setReceipts((list) => [...list, receipt]);
      setBalance((value) => value - amount);
      setFlow('success');
      setConfetti((value) => value + 1);
    } catch (cause) {
      if (run === generation.current) {
        setError(cause instanceof Error ? cause.message : 'Please try again.');
        setFlow('refund');
      }
    } finally {
      if (run === generation.current) busy.current = false;
    }
  }
  function scanSample() {
    if (scanBusy) return;
    setScanBusy(true);
    const intent = scanner;
    timer.current = setTimeout(() => {
      setScanner(null);
      setScanBusy(false);
      if (intent === 'confirm') void issue();
      else {
        setFlow('wallet');
        setTab('home');
        setMessage('Suica found. Your balance is up to date.');
      }
    }, 1400);
  }
  async function checkProof(changed = false) {
    if (!proof) return;
    setProofStatus('checking');
    const candidate = changed
      ? { ...proof, amountJpy: proof.amountJpy + 1 }
      : proof;
    const previous = receipts.find(
      (receipt) => receipt.sequence === proof.sequence - 1,
    );
    const valid = await verifyDemoReceipt(candidate, previous);
    setProofStatus(valid ? 'valid' : 'changed');
  }
  function showProof(receipt: Receipt) {
    setProof(receipt);
    setProofStatus('idle');
  }
  function chooseChain(next: Chain) {
    setChain(next);
    setAddress(DEMO_ADDRESSES[next]);
  }

  return (
    <div className="demo-stage">
      <header className="demo-context">
        <a href="/" className="wordmark">
          un<span>sui</span>
          <small className="wordmark-kanji" lang="ja">
            (雲水)
          </small>
          <img
            className="unsui-mark"
            src="/unsui-mark.svg?v=monk-5"
            width="34"
            height="34"
            alt=""
            aria-hidden="true"
          />
        </a>
        <div className="demo-theme-control">
          <ThemeToggle />
        </div>
        <a href="/dashboard" className="demo-dashboard-link">
          <LayoutDashboard size={17} /> Dashboard
        </a>
        <a href="/" className="back-site">
          <ArrowLeft size={16} /> Back to the project
        </a>
        <button onClick={reset} className="reset-demo">
          <RotateCcw size={16} /> Start a new demo
        </button>
      </header>
      <div className="app-wrap">
        <div className="mobile-demo-bar">
          <a href="/">
            <ArrowLeft size={15} /> Project
          </a>
          <a href="/dashboard" className="demo-dashboard-link">
            <LayoutDashboard size={15} /> Dashboard
          </a>
          <ThemeToggle />
          <button onClick={reset} aria-label="Restart demo">
            <RotateCcw size={17} />
          </button>
        </div>
        <div className="app-shell">
          {flow === 'wallet' && (
            <WalletView
              tab={tab}
              balance={balance}
              receipts={receipts}
              onTab={setTab}
              onScan={() => setScanner('read')}
              onRefund={openRefund}
              onShowProof={showProof}
              onSelectTrip={setSelectedTrip}
            />
          )}
          {flow !== 'wallet' && (flow !== 'success' || recent) && (
            <RefundFlow
              flow={flow}
              chain={chain}
              amount={amount}
              address={address}
              balance={balance}
              error={error}
              recent={recent}
              confetti={confetti}
              onBack={() => setFlow('wallet')}
              onChain={chooseChain}
              onAmount={setAmount}
              onAddress={setAddress}
              onConfirm={confirm}
              onHumanComplete={() => {
                setFlow('refund');
                setScanner('confirm');
              }}
              onReplay={() => setConfetti((value) => value + 1)}
              onShowProof={showProof}
              onScan={() => setScanner('read')}
              onHome={() => {
                setFlow('wallet');
                setTab('home');
              }}
            />
          )}
          {message && (
            <div className="app-toast" role="status">
              <Check size={17} />
              {message}
            </div>
          )}
        </div>
        <p className="device-caption">UNSUI · YOUR JOURNEY GOES ON</p>
      </div>
      <DemoExplainer />
      <DemoDialogs
        scanner={scanner}
        scanBusy={scanBusy}
        proof={proof}
        proofStatus={proofStatus}
        selectedTrip={selectedTrip}
        onCloseScanner={closeScanner}
        onScanSample={scanSample}
        onCloseProof={() => setProof(null)}
        onCheckProof={(changed) => void checkProof(changed)}
        onCloseTrip={() => setSelectedTrip(null)}
      />
    </div>
  );
}
