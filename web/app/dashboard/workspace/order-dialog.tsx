import type { RefObject } from 'react';
import { ArrowRight, Copy, ExternalLink, X } from 'lucide-react';
import { dateLabel, reconcile, yen } from './domain.mjs';
import { Badge } from './badge';
import { number } from './format';
import type { Row } from './types';

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div className="detail">
            <span>{label}</span>
            <b>{value}</b>
        </div>
    );
}

export function OrderDialog({
    dialog,
    selected,
    setSelected,
    copy,
}: {
    dialog: RefObject<HTMLDialogElement | null>;
    selected: Row | null;
    setSelected: (row: Row | null) => void;
    copy: (value: string) => void;
}) {
    return (
        <dialog
            ref={dialog}
            className="order-dialog"
            onCancel={() => setSelected(null)}
            onClick={(e) => {
                if (e.target === dialog.current) setSelected(null);
            }}
        >
            {selected && (
                <>
                    <button
                        className="dialog-close icon-button"
                        aria-label="Close order details"
                        onClick={() => setSelected(null)}
                    >
                        <X />
                    </button>
                    <span className="eyebrow">ORDER JOURNEY</span>
                    <h2>{selected.id}</h2>
                    <div className="dialog-badges">
                        <Badge value={selected.source} />
                        <Badge value={reconcile(selected)} />
                        <Badge value={selected.network} />
                    </div>
                    <div className="order-amount">
                        {yen(selected.jpy)}
                        <ArrowRight size={22} />
                        <span>
                            {number(selected.crypto, 6)} {selected.asset}
                        </span>
                    </div>
                    <p className="subtle">
                        {dateLabel(selected.date)} JST · Fee recorded:{' '}
                        {yen(selected.feeJpy)}
                    </p>
                    <div className="detail-columns">
                        <section>
                            <h3>Merchant side</h3>
                            <Detail
                                label="Merchant order"
                                value={selected.merchantRef || 'Not yet linked'}
                            />
                            <Detail
                                label="Purchase amount"
                                value={
                                    selected.merchantJpy === null
                                        ? 'Awaiting merchant data'
                                        : yen(selected.merchantJpy)
                                }
                            />
                            <Detail label="Settlement" value={selected.settlement} />
                        </section>
                        <section>
                            <h3>UnSui payout</h3>
                            <Detail label="Payout state" value={selected.payout} />
                            <Detail label="Network" value={selected.network} />
                            <Detail
                                label="Crypto amount"
                                value={
                                    number(selected.crypto, 8) + ' ' + selected.asset
                                }
                            />
                        </section>
                    </div>
                    <div className="hash-field">
                        <label>Recipient wallet</label>
                        <code>
                            {selected.recipient ||
                                'Not recorded on this historical receipt'}
                        </code>
                        {selected.recipient && (
                            <button
                                className="icon-button"
                                aria-label="Copy recipient"
                                onClick={() => copy(selected.recipient!)}
                            >
                                <Copy size={15} />
                            </button>
                        )}
                    </div>
                    <div className="hash-field">
                        <label>Transaction digest</label>
                        <code>{selected.digest || 'Awaiting payout'}</code>
                        {selected.digest && (
                            <button
                                className="icon-button"
                                aria-label="Copy transaction digest"
                                onClick={() => copy(selected.digest!)}
                            >
                                <Copy size={15} />
                            </button>
                        )}
                    </div>
                    <div className="hash-field">
                        <label>Receipt reference</label>
                        <code>{selected.receipt || 'Not recorded'}</code>
                    </div>
                    {selected.source === 'in-app' &&
                        selected.digest &&
                        ['devnet', 'testnet'].includes(selected.network) && (
                            <a
                                className="primary explorer"
                                target="_blank"
                                rel="noreferrer"
                                href={`https://suiexplorer.com/txblock/${encodeURIComponent(selected.digest)}?network=${selected.network}`}
                            >
                                View Sui transaction <ExternalLink size={14} />
                            </a>
                        )}
                    <p className="detail-note">
                        {selected.source === 'sandbox'
                            ? 'Sandbox addresses and transaction references illustrate the workflow; they are not submitted transactions.'
                            : 'This app receipt does not itself prove a merchant charge. Reconciliation stays open until a processor record is linked.'}
                    </p>
                </>
            )}
        </dialog>
    );
}
