'use client';
import {
    ArrowLeft,
    Check,
    CreditCard,
    ExternalLink,
    LoaderCircle,
    ShieldCheck,
    Wifi,
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { type Receipt } from '@/lib/demo-engine';
import { type DemoTrip } from './activity-list';

export function DemoDialogs({
    scanner,
    scanBusy,
    proof,
    proofStatus,
    selectedTrip,
    onCloseScanner,
    onScanSample,
    onCloseProof,
    onCheckProof,
    onCloseTrip,
}: {
    scanner: 'read' | 'confirm' | null;
    scanBusy: boolean;
    proof: Receipt | null;
    proofStatus: 'idle' | 'checking' | 'valid' | 'changed';
    selectedTrip: DemoTrip | null;
    onCloseScanner: () => void;
    onScanSample: () => void;
    onCloseProof: () => void;
    onCheckProof: (changed?: boolean) => void;
    onCloseTrip: () => void;
}) {
    return (
        <>
            <Dialog
                open={!!scanner}
                onOpenChange={(open) => {
                    if (!open) onCloseScanner();
                }}
            >
                <DialogContent className="scan-dialog" showCloseButton={false}>
                    <div className="scanner-top">
                        <button
                            className="scanner-close"
                            onClick={onCloseScanner}
                            aria-label="Close scanner"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <DialogTitle>
                            {scanner === 'confirm'
                                ? 'Confirm your card'
                                : 'Scan your card'}
                        </DialogTitle>
                        <Wifi size={21} />
                    </div>
                    <div className={'scan-frame ' + (scanBusy ? 'is-scanning' : '')}>
                        <span className="scan-corner tl" />
                        <span className="scan-corner tr" />
                        <span className="scan-corner bl" />
                        <span className="scan-corner br" />
                        <img
                            src="/welcome-suica.jpg"
                            alt="Sample Welcome Suica card inside the scan frame"
                        />
                        <div className="scan-beam" />
                    </div>
                    <div className="scanner-copy">
                        <h2>
                            {scanBusy
                                ? 'Reading your card…'
                                : scanner === 'confirm'
                                  ? 'One more tap to confirm.'
                                  : 'A journey, waiting to continue.'}
                        </h2>
                        <DialogDescription>
                            {scanner === 'confirm'
                                ? 'Confirm with the same sample card to continue your refund.'
                                : 'On dGen1, hold your card to the back of the phone. Here, try the sample card below.'}
                        </DialogDescription>
                    </div>
                    <button
                        disabled={scanBusy}
                        className="scan-button"
                        onClick={onScanSample}
                    >
                        {scanBusy ? (
                            <LoaderCircle className="spin" size={20} />
                        ) : (
                            <CreditCard size={20} />
                        )}{' '}
                        {scanBusy ? 'Reading…' : 'Use sample card'}
                    </button>
                    <span className="scanner-note">
                        Interactive preview · No camera or NFC access
                    </span>
                </DialogContent>
            </Dialog>
            <Dialog
                open={!!proof}
                onOpenChange={(open) => {
                    if (!open) onCloseProof();
                }}
            >
                <DialogContent className="proof-dialog">
                    <DialogTitle>Proof of your journey</DialogTitle>
                    <DialogDescription>
                        Receipt #{proof?.sequence} · Browser-generated proof
                    </DialogDescription>
                    {proof && (
                        <>
                            <div className="merkle-visual">
                                <div className="merkle-root">
                                    <ShieldCheck size={18} /> Merkle root
                                </div>
                                <div className="merkle-branches">
                                    <i />
                                    <i />
                                </div>
                                <div className="merkle-leaves">
                                    {['Card', 'Wallet', 'Amount', 'Network'].map(
                                        (label) => (
                                            <span key={label}>{label}</span>
                                        ),
                                    )}
                                </div>
                            </div>
                            <p className="proof-copy">
                                Four fields. One fingerprint. Change a field and
                                the proof no longer matches.
                            </p>
                            <label className="proof-label">MERKLE ROOT</label>
                            <code className="proof-code">{proof.root}</code>
                            <label className="proof-label">PREVIOUS RECEIPT</label>
                            <code className="proof-code">
                                {proof.sequence === 1
                                    ? 'The first stop in your hash chain.'
                                    : proof.previousHash}
                            </code>
                            <button
                                className="button dark full"
                                onClick={() => onCheckProof()}
                                disabled={proofStatus === 'checking'}
                            >
                                {proofStatus === 'checking' ? (
                                    <LoaderCircle className="spin" size={18} />
                                ) : (
                                    <ShieldCheck size={18} />
                                )}{' '}
                                Verify receipt
                            </button>
                            <button
                                className="tamper-button"
                                onClick={() => onCheckProof(true)}
                            >
                                What if the amount changes?
                            </button>
                            <div aria-live="polite">
                                {proofStatus === 'valid' && (
                                    <p className="proof-result">
                                        <Check size={18} /> Receipt, Merkle root
                                        and previous link match.
                                    </p>
                                )}
                                {proofStatus === 'changed' && (
                                    <p className="proof-result changed">
                                        <ShieldCheck size={18} /> Change detected.
                                        Adding ¥1 breaks the proof. Your original
                                        receipt is unchanged.
                                    </p>
                                )}
                            </div>
                            <p className="proof-scope">
                                This proof is local to your browser, not an
                                on-chain transaction. The native Sui contract uses
                                its own BCS receipt format.
                            </p>
                            <a
                                className="text-link"
                                href="https://suiexplorer.com/txblock/6EuqKUAbzYEg2MqpuFCr9ERcjFMezPZoCgnwGdPekffL?network=devnet"
                                target="_blank"
                                rel="noreferrer"
                            >
                                See a separate devnet example{' '}
                                <ExternalLink size={14} />
                            </a>
                        </>
                    )}
                </DialogContent>
            </Dialog>
            <Dialog
                open={!!selectedTrip}
                onOpenChange={(open) => {
                    if (!open) onCloseTrip();
                }}
            >
                <DialogContent>
                    <DialogTitle>{selectedTrip?.name}</DialogTitle>
                    <DialogDescription>{selectedTrip?.detail}</DialogDescription>
                    <div className="trip-detail-amount">
                        {(selectedTrip?.amount || 0) > 0 ? '+' : '−'}¥
                        {Math.abs(selectedTrip?.amount || 0).toLocaleString()}
                    </div>
                    <p>{selectedTrip?.date}</p>
                    <p className="small-print">Sample journey · Suica •••• 2026</p>
                </DialogContent>
            </Dialog>
        </>
    );
}
