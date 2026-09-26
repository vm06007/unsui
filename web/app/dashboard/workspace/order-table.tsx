import { ChevronRight, Search } from 'lucide-react';
import { dateLabel, reconcile, short, yen } from './domain.mjs';
import { Badge } from './badge';
import { number } from './format';
import type { Row } from './types';

export function OrderTable({
    rows,
    onSelect,
    expanded = false,
}: {
    rows: Row[];
    onSelect: (r: Row) => void;
    expanded?: boolean;
}) {
    return (
        <div className="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>Order / source</th>
                        <th>Purchase</th>
                        <th>Payout</th>
                        {expanded && <th>Recipient</th>}
                        <th>Reconciliation</th>
                        <th />
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => (
                        <tr key={r.source + r.id}>
                            <td>
                                <button
                                    className="order-link"
                                    onClick={() => onSelect(r)}
                                >
                                    {r.id}
                                </button>
                                <small>
                                    <Badge value={r.source} /> {dateLabel(r.date)}
                                </small>
                            </td>
                            <td>
                                <b>{yen(r.jpy)}</b>
                                <small>JPY service purchase</small>
                            </td>
                            <td>
                                <b>
                                    {number(r.crypto, 6)} {r.asset}
                                </b>
                                <small>
                                    <span className={'status-dot ' + r.payout} />
                                    {r.payout === 'confirmed'
                                        ? r.network === 'demo'
                                            ? 'Mock recorded'
                                            : 'Recorded'
                                        : r.payout}
                                </small>
                            </td>
                            {expanded && (
                                <td>
                                    <code>{short(r.recipient)}</code>
                                    <small>{r.network}</small>
                                </td>
                            )}
                            <td>
                                <Badge value={reconcile(r)} />
                            </td>
                            <td>
                                <button
                                    className="icon-button"
                                    aria-label={'View ' + r.id}
                                    onClick={() => onSelect(r)}
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {!rows.length && (
                <div className="empty">
                    <Search />
                    <h3>No orders in this view</h3>
                    <p>
                        Change the source, search or date range. In-App orders appear
                        after the backend receives a refund receipt.
                    </p>
                </div>
            )}
        </div>
    );
}
