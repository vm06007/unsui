import { ExternalLink, RefreshCw } from 'lucide-react';
import { yen, short, dateLabel } from './domain.mjs';

export type MultiBaasData = {
    status: string;
    message: string;
    network: string;
    chainId: number;
    blockNumber?: number;
    observedAt?: number;
    truncated?: boolean;
    treasury: null | {
        asset: string;
        balance: number;
        network: string;
        observedAt: number;
    };
    records: {
        id: string;
        date: string;
        amountJpy: number;
        amount: number;
        amountAtomic: string;
        recipient: string;
        digest: string;
        requestId: string;
        asset: string;
    }[];
};
export function MultiBaasPanel({
    data,
    onRefresh,
    busy,
}: {
    data?: MultiBaasData | null;
    onRefresh: () => void;
    busy: boolean;
}) {
    return (
        <section className="card multibaas-panel" aria-label="MultiBaas indexer">
            <div className="section-head">
                <div>
                    <span className="eyebrow">CURVEGRID / MIZUHIKI</span>
                    <h2>MultiBaas payout indexer</h2>
                    <p>{data?.message || 'Waiting for the backend integration'}</p>
                </div>
                <button className="secondary" onClick={onRefresh} disabled={busy}>
                    <RefreshCw size={15} className={busy ? 'spin' : ''} />
                    Sync indexer
                </button>
            </div>
            <div className="multibaas-summary">
                <span>
                    <b>{data?.network || 'Awaji Testnet'}</b>
                    <small>Chain {data?.chainId || 6497}</small>
                </span>
                <span>
                    <b>{data?.status === 'connected' ? data.records.length : '—'}</b>
                    <small>Indexed payout events</small>
                </span>
                <span>
                    <b>
                        {data?.treasury
                            ? data.treasury.balance.toLocaleString('en-US', {
                                  maximumFractionDigits: 6,
                              }) + ' MIZU'
                            : '—'}
                    </b>
                    <small>Observed contract balance</small>
                </span>
                <span>
                    <b>{data?.blockNumber?.toLocaleString() || '—'}</b>
                    <small>Latest network block</small>
                </span>
            </div>
            <p className="subtle">
                On-chain payout evidence, separate from app orders and SB merchant
                records. Indexed events do not prove a merchant charge.
            </p>
            {data?.observedAt && (
                <p className="subtle">
                    Last observed: {new Date(data.observedAt).toLocaleString()}
                    {data.truncated ? ' · Limited to 1,000 indexed events' : ''}
                </p>
            )}
            {!!data?.records.length && (
                <div className="multibaas-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Date (JST)</th>
                                <th>Request</th>
                                <th>Order value</th>
                                <th>Payout</th>
                                <th>Recipient</th>
                                <th>Evidence</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.records.map((row) => (
                                <tr key={row.id}>
                                    <td>{dateLabel(row.date)}</td>
                                    <td title={row.requestId}>
                                        {short(row.requestId)}
                                    </td>
                                    <td>{yen(row.amountJpy)}</td>
                                    <td title={row.amountAtomic + ' atomic MIZU'}>
                                        {row.amount.toLocaleString('en-US', {
                                            maximumFractionDigits: 8,
                                        })}{' '}
                                        {row.asset}
                                    </td>
                                    <td title={row.recipient}>
                                        {short(row.recipient)}
                                    </td>
                                    <td>
                                        <a
                                            href={
                                                'https://awaji.blockscout.com/tx/' +
                                                encodeURIComponent(row.digest)
                                            }
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            View transaction <ExternalLink size={13} />
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {data?.status === 'connected' && !data.records.length && (
                <p>
                    No indexed UnSui payouts yet. Deploy, link and execute a test payout
                    to populate this view.
                </p>
            )}
        </section>
    );
}
