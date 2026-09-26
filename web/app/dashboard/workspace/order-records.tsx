import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight } from 'lucide-react';
import type { SettingItem } from './preferences';
import { dateLabel, reconcile, short, yen } from './domain.mjs';
import type { Row } from './types';

export const orderValue = (r: Row, key: string): string | number =>
    key === 'reconciliation' ? reconcile(r) : (r[key as keyof Row] ?? '');

export function OrderRecords({
    mode,
    density,
    visible,
    slice,
    sort,
    setSort,
    onSelect,
    filtered,
    page,
    size,
    setSize,
    setPage,
    pages,
}: {
    mode: string;
    density: string;
    visible: SettingItem[];
    slice: Row[];
    sort: { key: string; dir: string };
    setSort: (sort: { key: string; dir: string }) => void;
    onSelect: (row: Row) => void;
    filtered: Row[];
    page: number;
    size: number;
    setSize: (size: number) => void;
    setPage: (page: number) => void;
    pages: number;
}) {
    function cell(r: Row, key: string) {
        switch (key) {
            case 'id':
                return (
                    <button className="order-link" onClick={() => onSelect(r)}>
                        {r.id}
                    </button>
                );
            case 'date':
                return dateLabel(r.date);
            case 'source':
                return (
                    <span className={'badge ' + r.source}>
                        {r.source === 'in-app' ? 'In-App' : 'Sandbox'}
                    </span>
                );
            case 'jpy':
                return yen(r.jpy);
            case 'crypto':
                return r.crypto.toLocaleString('en-US', { maximumFractionDigits: 8 });
            case 'recipient':
            case 'digest':
                return (
                    <code title={String(orderValue(r, key))}>
                        {short(orderValue(r, key))}
                    </code>
                );
            case 'reconciliation':
                return (
                    <span className={'badge ' + reconcile(r)}>
                        {reconcile(r) === 'unmatched'
                            ? 'Awaiting merchant'
                            : reconcile(r) === 'pending'
                              ? 'Awaiting payout'
                              : reconcile(r)}
                    </span>
                );
            default:
                return String(orderValue(r, key)) || '—';
        }
    }
    return (
        <>
            <div
                className={'explorer-scroll ' + density}
                tabIndex={0}
                aria-label="Scrollable order records"
            >
                {mode === 'table' ? (
                    <table className="sticky-table">
                        <thead>
                            <tr>
                                {visible.map((c) => (
                                    <th
                                        key={c.id}
                                        aria-sort={
                                            sort.key === c.id
                                                ? sort.dir === 'asc'
                                                    ? 'ascending'
                                                    : 'descending'
                                                : 'none'
                                        }
                                    >
                                        <button
                                            onClick={() =>
                                                setSort({
                                                    key: c.id,
                                                    dir:
                                                        sort.key === c.id &&
                                                        sort.dir === 'asc'
                                                            ? 'desc'
                                                            : 'asc',
                                                })
                                            }
                                        >
                                            {c.label}
                                            {sort.key === c.id ? (
                                                sort.dir === 'asc' ? (
                                                    <ArrowUp size={12} />
                                                ) : (
                                                    <ArrowDown size={12} />
                                                )
                                            ) : (
                                                <ArrowUpDown size={12} />
                                            )}
                                        </button>
                                    </th>
                                ))}
                                <th aria-label="Actions" />
                            </tr>
                        </thead>
                        <tbody>
                            {slice.map((r) => (
                                <tr key={r.source + r.id}>
                                    {visible.map((c) => (
                                        <td key={c.id}>{cell(r, c.id)}</td>
                                    ))}
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
                ) : (
                    <div
                        className={
                            mode === 'cards' ? 'order-card-grid' : 'order-timeline'
                        }
                    >
                        {slice.map((r) => (
                            <article key={r.source + r.id}>
                                <header>
                                    <button
                                        className="order-link"
                                        onClick={() => onSelect(r)}
                                    >
                                        {r.id}
                                    </button>
                                    <span className={'badge ' + r.source}>
                                        {r.source === 'sandbox' ? 'Sandbox' : 'In-App'}
                                    </span>
                                </header>
                                <dl>
                                    {visible
                                        .filter(
                                            (c) => c.id !== 'id' && c.id !== 'source',
                                        )
                                        .map((c) => (
                                            <div key={c.id}>
                                                <dt>{c.label}</dt>
                                                <dd>{cell(r, c.id)}</dd>
                                            </div>
                                        ))}
                                </dl>
                                <button
                                    className="text-button"
                                    onClick={() => onSelect(r)}
                                >
                                    View journey <ChevronRight size={13} />
                                </button>
                            </article>
                        ))}
                    </div>
                )}
                {!filtered.length && (
                    <div className="empty">
                        <h3>No matching orders</h3>
                        <p>Try changing your filters or data source.</p>
                    </div>
                )}
            </div>
            <div className="pagination">
                <span>
                    {filtered.length
                        ? `${page * size + 1}–${Math.min((page + 1) * size, filtered.length)}`
                        : '0'}{' '}
                    of {filtered.length}
                </span>
                <select
                    aria-label="Rows per page"
                    value={size}
                    onChange={(e) => setSize(Number(e.target.value))}
                >
                    {[10, 25, 50].map((n) => (
                        <option key={n} value={n}>
                            {n} rows
                        </option>
                    ))}
                </select>
                <button disabled={page === 0} onClick={() => setPage(page - 1)}>
                    Previous
                </button>
                <button disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>
                    Next
                </button>
            </div>
        </>
    );
}
