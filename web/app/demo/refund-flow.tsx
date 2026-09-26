'use client';
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
}: {
    flow: 'refund' | 'sending' | 'success';
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
}) {
    const asset = DEMO_NETWORKS[chain].asset;
    if (flow === 'sending') {
        return (
            <div className="processing flow-screen" role="status">
                <div className="processing-spinner">
                    <LoaderCircle size={42} />
                </div>
                <span className="eyebrow">ONE MOMENT</span>
                <h1>Issuing refund…</h1>
                <p>Preparing your {DEMO_NETWORKS[chain].name} receipt.</p>
                <div className="processing-steps">
                    <span>
                        <Check size={16} /> Card confirmed
                    </span>
                    <span>
                        <LoaderCircle size={16} /> Building your proof
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
                                background: [
                                    '#b3e978',
                                    '#39734a',
                                    '#e4c08b',
                                    '#8dc6dd',
                                ][index % 4],
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
                <p>Your browser refund is complete.</p>
                <div className="success-receipt">
                    <div>
                        <span>From your card</span>
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
                    <label>RECEIPT HASH</label>
                    <code>{recent.hash}</code>
                </div>
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
                <label className="amount-input">
                    Refund amount{' '}
                    <div>
                        <span>¥</span>
                        <input
                            aria-label="Refund amount in yen"
                            type="number"
                            min="1"
                            max={balance}
                            step="1"
                            value={amount || ''}
                            onChange={(event) =>
                                onAmount(Number(event.target.value))
                            }
                        />
                    </div>
                    <small>
                        ¥{balance.toLocaleString()} available{' '}
                        <button type="button" onClick={() => onAmount(balance)}>
                            Use all
                        </button>
                    </small>
                </label>
                <div className="network-row">
                    <span>Send to</span>
                    <Select
                        value={chain}
                        onValueChange={(value) => {
                            if (
                                value === 'sui' ||
                                value === 'ethereum' ||
                                value === 'mizuhiki'
                            )
                                onChain(value);
                        }}
                    >
                        <SelectTrigger aria-label="Refund network">
                            <SelectValue>{DEMO_NETWORKS[chain].name}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="sui">Sui · Default</SelectItem>
                            <SelectItem value="ethereum">Ethereum</SelectItem>
                            <SelectItem value="mizuhiki">
                                Mizuhiki · Awaji Testnet
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <label className="address-input">
                    Wallet address
                    <textarea
                        value={address}
                        onChange={(event) => onAddress(event.target.value)}
                        rows={2}
                        spellCheck={false}
                    />
                </label>
                <button
                    type="button"
                    className="sample-address"
                    onClick={() => onAddress(DEMO_ADDRESSES[chain])}
                >
                    Use sample address
                </button>
                <div className="refund-summary">
                    <span>You’ll receive</span>
                    <b>
                        {(amount * DEMO_NETWORKS[chain].rate).toFixed(
                            chain === 'sui' ? 4 : 6,
                        )}{' '}
                        {asset}
                    </b>
                </div>
                <span className="rate-note">
                    Illustrative rate · No network fee in this demo
                </span>
                {error && (
                    <p className="form-error" role="alert">
                        {error}
                    </p>
                )}
                <button className="button dark full" type="submit">
                    Confirm with a scan <ScanLine size={20} />
                </button>
            </form>
            <p className="small-print">Browser experience · No funds move</p>
        </div>
    );
}
