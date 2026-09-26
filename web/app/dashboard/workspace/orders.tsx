import { useState, useMemo, useEffect } from 'react';
import {
    Filter,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    List,
    LayoutGrid,
    Clock,
    Maximize2,
    Minimize2,
} from 'lucide-react';
import { useSaved, useScrollLock, type SettingItem } from './preferences';
import { ToolbarPopover } from './popover';
import { ColumnSettings } from './columns';
import type { Row } from './types';
import { yen, reconcile } from './domain.mjs';
import { OrderRecords, orderValue } from './order-records';
const defaults: SettingItem[] = [
    ['id', 'Order'],
    ['date', 'Date (JST)'],
    ['source', 'Source'],
    ['jpy', 'Purchase'],
    ['crypto', 'Crypto amount'],
    ['asset', 'Asset'],
    ['payout', 'Payout'],
    ['recipient', 'Recipient'],
    ['reconciliation', 'Reconciliation'],
    ['merchantRef', 'Merchant reference'],
    ['digest', 'Transaction hash'],
    ['network', 'Network'],
].map(([id, label], i) => ({ id, label, enabled: i < 9 }));
export function OrdersExplorer({
    rows,
    onSelect,
    view,
}: {
    rows: Row[];
    onSelect: (r: Row) => void;
    view: string;
}) {
    const [stored, setColumns] = useSaved<SettingItem[]>(
            'unsui-table-columns',
            defaults,
        ),
        [mode, setMode] = useSaved('unsui-table-view', 'table'),
        [density, setDensity] = useSaved('unsui-table-density', 'comfortable'),
        [size, setSize] = useSaved('unsui-table-pagesize', 10),
        [sort, setSort] = useSaved('unsui-table-sort', { key: 'date', dir: 'desc' }),
        [hiddenStatuses, setHiddenStatuses] = useState<string[]>([]),
        [hiddenAssets, setHiddenAssets] = useState<string[]>([]),
        [min, setMin] = useState(''),
        [max, setMax] = useState(''),
        [page, setPage] = useState(0),
        [expanded, setExpanded] = useState(false);
    const filterCount =
        hiddenStatuses.length + hiddenAssets.length + Number(!!min) + Number(!!max);
    const statuses =
        view === 'payouts'
            ? ['confirmed', 'queued']
            : ['matched', 'pending', 'mismatch', 'unmatched'];
    const assets = Array.from(
        new Set(['SUI', 'ETH', 'MIZU', ...rows.map((r) => r.asset)]),
    );
    const labels: Record<string, string> = {
        confirmed: 'Confirmed',
        queued: 'Awaiting payout',
        matched: 'Matched',
        pending: 'Awaiting payout',
        mismatch: 'Amount mismatch',
        unmatched: 'Awaiting merchant',
    };
    const rangeLimit = Math.max(
            2000,
            ...rows.map((r) => r.jpy),
            Number(max) || 0,
            Number(min) || 0,
        ),
        lower = Number(min) || 0,
        upper = max === '' ? rangeLimit : Number(max);
    const inRange = (r: Row) => r.jpy >= lower && r.jpy <= upper;
    const toggle = (items: string[], key: string) =>
        items.includes(key) ? items.filter((x) => x !== key) : [...items, key];
    function sortBy(key: string) {
        setSort({ key, dir: sort.key === key && sort.dir === 'asc' ? 'desc' : 'asc' });
    }
    const columns = stored.filter((c) => defaults.some((d) => d.id === c.id));
    const visible = columns.filter((c) => c.enabled);
    const filtered = useMemo(
        () =>
            rows
                .filter(
                    (r) =>
                        !hiddenStatuses.includes(
                            view === 'payouts' ? r.payout : reconcile(r),
                        ) &&
                        !hiddenAssets.includes(r.asset) &&
                        (!min || r.jpy >= Number(min)) &&
                        (!max || r.jpy <= Number(max)),
                )
                .sort((a, b) => {
                    const av = orderValue(a, sort.key),
                        bv = orderValue(b, sort.key);
                    const c =
                        typeof av === 'number' && typeof bv === 'number'
                            ? av - bv
                            : String(av).localeCompare(String(bv), undefined, {
                                  numeric: true,
                              });
                    return (
                        (sort.dir === 'asc' ? 1 : -1) * c || a.id.localeCompare(b.id)
                    );
                }),
        [rows, hiddenStatuses, hiddenAssets, min, max, sort, view],
    );
    useEffect(
        () => setPage(0),
        [hiddenStatuses, hiddenAssets, min, max, sort, size, view, rows.length],
    );
    const pages = Math.max(1, Math.ceil(filtered.length / size));
    useEffect(() => setPage((p) => Math.min(p, pages - 1)), [pages]);
    const slice = filtered.slice(page * size, (page + 1) * size);
    useScrollLock(expanded);
    useEffect(() => {
        if (!expanded) return;
        const escape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !document.querySelector('dialog[open]'))
                setExpanded(false);
        };
        document.addEventListener('keydown', escape);
        return () => {
            document.removeEventListener('keydown', escape);
        };
    }, [expanded]);
    return (
        <section
            className={'card explorer ' + (expanded ? 'explorer-fullscreen' : '')}
            aria-label="Orders explorer"
        >
            <div className="explorer-toolbar">
                <div>
                    <h2>
                        {view === 'payouts'
                            ? 'Crypto payout ledger'
                            : view === 'reconciliation'
                              ? 'Reconciliation workspace'
                              : 'Service orders'}
                    </h2>
                    <p className="subtle">
                        {filtered.length} records ·{' '}
                        {yen(filtered.reduce((s, r) => s + r.jpy, 0))} purchase value
                    </p>
                </div>
                <div className="table-actions">
                    <ToolbarPopover
                        label="View options"
                        title="View"
                        triggerContent={
                            <>
                                <List size={15} />
                                View
                            </>
                        }
                    >
                        <div className="view-options">
                            <p className="subtle">Layout</p>
                            {[
                                ['table', 'Table', List],
                                ['cards', 'Cards', LayoutGrid],
                                ['timeline', 'Timeline', Clock],
                            ].map(([id, label, Icon]: any) => (
                                <button
                                    key={id}
                                    aria-label={label + ' view'}
                                    aria-pressed={mode === id}
                                    onClick={() => setMode(id)}
                                >
                                    <Icon size={16} />
                                    {label}
                                </button>
                            ))}
                            <p className="subtle">Row spacing</p>
                            {['comfortable', 'compact'].map((v) => (
                                <button
                                    key={v}
                                    aria-pressed={density === v}
                                    onClick={() => setDensity(v)}
                                >
                                    {v === 'comfortable' ? 'Comfortable' : 'Compact'}
                                </button>
                            ))}
                        </div>
                    </ToolbarPopover>
                    <ToolbarPopover
                        label="Order filters"
                        title="Order filters"
                        triggerContent={
                            <>
                                <Filter size={15} />
                                Filters
                                {filterCount > 0 && (
                                    <span className="filter-count">{filterCount}</span>
                                )}
                            </>
                        }
                    >
                        <div className="category-filters">
                            <fieldset>
                                <legend>Status</legend>
                                {statuses.map((key) => (
                                    <button
                                        key={key}
                                        className="filter-option"
                                        role="switch"
                                        aria-checked={!hiddenStatuses.includes(key)}
                                        aria-label={labels[key]}
                                        onClick={() =>
                                            setHiddenStatuses(
                                                toggle(hiddenStatuses, key),
                                            )
                                        }
                                    >
                                        <span>
                                            <i className={'category-dot ' + key} />
                                            {labels[key]}{' '}
                                            <small>
                                                (
                                                {
                                                    rows.filter(
                                                        (r) =>
                                                            (view === 'payouts'
                                                                ? r.payout
                                                                : reconcile(r)) ===
                                                                key &&
                                                            !hiddenAssets.includes(
                                                                r.asset,
                                                            ) &&
                                                            inRange(r),
                                                    ).length
                                                }
                                                )
                                            </small>
                                        </span>
                                        <i className="filter-switch" />
                                    </button>
                                ))}
                            </fieldset>
                            <fieldset>
                                <legend>Asset</legend>
                                {assets.map((key) => (
                                    <button
                                        key={key}
                                        className="filter-option"
                                        role="switch"
                                        aria-checked={!hiddenAssets.includes(key)}
                                        aria-label={key + ' asset'}
                                        onClick={() =>
                                            setHiddenAssets(toggle(hiddenAssets, key))
                                        }
                                    >
                                        <span>
                                            {key}{' '}
                                            <small>
                                                (
                                                {
                                                    rows.filter(
                                                        (r) =>
                                                            r.asset === key &&
                                                            !hiddenStatuses.includes(
                                                                view === 'payouts'
                                                                    ? r.payout
                                                                    : reconcile(r),
                                                            ) &&
                                                            inRange(r),
                                                    ).length
                                                }
                                                )
                                            </small>
                                        </span>
                                        <i className="filter-switch" />
                                    </button>
                                ))}
                            </fieldset>
                            <fieldset>
                                <legend>Purchase amount</legend>
                                <div className="range-labels">
                                    <span>{yen(lower)}</span>
                                    <span>{yen(upper)}</span>
                                </div>
                                <div className="dual-range">
                                    <div className="range-track">
                                        <span
                                            style={{
                                                left: `${(lower / rangeLimit) * 100}%`,
                                                right: `${100 - (upper / rangeLimit) * 100}%`,
                                            }}
                                        />
                                    </div>
                                    <input
                                        type="range"
                                        aria-label="Minimum purchase"
                                        min="0"
                                        max={rangeLimit}
                                        value={lower}
                                        style={{ zIndex: lower === upper ? 3 : 1 }}
                                        onChange={(e) =>
                                            setMin(
                                                String(
                                                    Math.min(
                                                        Number(e.target.value),
                                                        upper,
                                                    ),
                                                ),
                                            )
                                        }
                                    />
                                    <input
                                        type="range"
                                        aria-label="Maximum purchase"
                                        min="0"
                                        max={rangeLimit}
                                        value={upper}
                                        onChange={(e) =>
                                            setMax(
                                                String(
                                                    Math.max(
                                                        Number(e.target.value),
                                                        lower,
                                                    ),
                                                ),
                                            )
                                        }
                                    />
                                </div>
                            </fieldset>
                            <button
                                className="text-button reset-filters"
                                onClick={() => {
                                    setHiddenStatuses([]);
                                    setHiddenAssets([]);
                                    setMin('');
                                    setMax('');
                                }}
                            >
                                Display all orders
                            </button>
                        </div>
                    </ToolbarPopover>
                    <ToolbarPopover
                        label="Sort orders"
                        title="Sort"
                        triggerContent={
                            <>
                                <ArrowUpDown size={15} />
                                Sort
                            </>
                        }
                    >
                        <div className="sort-options">
                            {defaults.map((c) => (
                                <button
                                    key={c.id}
                                    aria-pressed={sort.key === c.id}
                                    onClick={() => sortBy(c.id)}
                                >
                                    <span>{c.label}</span>
                                    {sort.key === c.id ? (
                                        sort.dir === 'asc' ? (
                                            <ArrowUp size={15} />
                                        ) : (
                                            <ArrowDown size={15} />
                                        )
                                    ) : (
                                        <ArrowUpDown size={15} />
                                    )}
                                </button>
                            ))}
                        </div>
                    </ToolbarPopover>
                    <ColumnSettings
                        columns={columns}
                        onChange={setColumns}
                        onReset={() => setColumns(defaults)}
                    />
                    <button
                        className="icon-button"
                        aria-label={expanded ? 'Exit expanded table' : 'Expand table'}
                        onClick={() => setExpanded(!expanded)}
                    >
                        {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>
                </div>
            </div>

            <OrderRecords
                mode={mode}
                density={density}
                visible={visible}
                slice={slice}
                sort={sort}
                setSort={setSort}
                onSelect={onSelect}
                filtered={filtered}
                page={page}
                size={size}
                setSize={setSize}
                setPage={setPage}
                pages={pages}
            />
        </section>
    );
}
