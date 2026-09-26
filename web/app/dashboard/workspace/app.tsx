import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { csv, fromPhone, reconcile, sandbox, summarize } from './domain.mjs';
import { PageLoader, WorkspaceLoader, demoLoadingDelay } from './motion';
import type { Admin } from './auth';
import { OrdersExplorer } from './orders';
import { Overview } from './overview';
import { MultiBaasPanel } from './multibaas';
import { defaultLayout, useSaved, useScrollLock } from './preferences';
import { ActivityChart } from './activity-chart';
import { OrderTable } from './order-table';
import { TreasuryView } from './treasury';
import { WorkspaceSidebar } from './sidebar';
import { WorkspaceTopbar } from './topbar';
import { WorkspaceHeading } from './workspace-heading';
import { ConnectionsPanel } from './connections';
import { OrderDialog } from './order-dialog';
import { routes } from './routes';
import type { Feed, Row } from './types';

export function App({ onLogout, admin }: { onLogout: () => void; admin: Admin }) {
    const [layout, setLayout] = useSaved('unsui-layout', defaultLayout);
    const [pageLoading, setPageLoading] = useState(false),
        [manualRefreshing, setManualRefreshing] = useState(false);
    const navigationId = useRef(0),
        navigationActive = useRef(false);
    useEffect(() => {
        document.documentElement.dataset.textSize = layout.fontSize || 'standard';
        return () => {
            delete document.documentElement.dataset.textSize;
        };
    }, [layout.fontSize]);
    const [initialLoading, setInitialLoading] = useState(true),
        [introReady, setIntroReady] = useState(false),
        [customizeCards, setCustomizeCards] = useState(false);
    useEffect(() => {
        const timer = setTimeout(() => setIntroReady(true), demoLoadingDelay());
        return () => clearTimeout(timer);
    }, []);
    const [view, setView] = useState('overview'),
        [source, setSource] = useState('all'),
        [search, setSearch] = useState(''),
        [from, setFrom] = useState(''),
        [to, setTo] = useState(''),
        [status, setStatus] = useState('all'),
        [page, setPage] = useState(0),
        [selected, setSelected] = useState<Row | null>(null),
        [mobile, setMobile] = useState(false),
        [theme, setTheme] = useState(
            () => localStorage.getItem('unsui-ops-theme') || 'light',
        ),
        [feed, setFeed] = useState<Feed>({ records: [], treasury: null }),
        [connection, setConnection] = useState('connecting'),
        [lastSync, setLastSync] = useState<Date | null>(null),
        [busy, setBusy] = useState(false),
        [toast, setToast] = useState('');
    useScrollLock(!!selected);
    const controller = useRef<AbortController | null>(null),
        dialog = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        localStorage.setItem('unsui-ops-theme', theme);
    }, [theme]);
    const refresh = useCallback(async () => {
        controller.current?.abort();
        const ac = new AbortController();
        controller.current = ac;
        setBusy(true);
        const timer = setTimeout(() => ac.abort(), 8000);
        try {
            const response = await fetch('/api/operations', {
                signal: ac.signal,
                headers: {
                    Authorization:
                        'Bearer ' + (sessionStorage.getItem('unsui-ops-token') || ''),
                },
            });
            if (response.status === 401) {
                onLogout();
                return;
            }
            if (!response.ok) throw Error();
            const data = (await response.json()) as {
                records?: unknown;
                treasury?: Feed['treasury'];
                multibaas?: Feed['multibaas'];
            };
            if (!Array.isArray(data.records)) throw Error();
            setFeed({
                records: data.records.map(fromPhone),
                treasury: data.treasury || null,
                multibaas: data.multibaas || null,
            });
            setConnection('connected');
            setLastSync(new Date());
        } catch {
            if (controller.current === ac) setConnection('offline');
        } finally {
            clearTimeout(timer);
            if (controller.current === ac) {
                setBusy(false);
                setInitialLoading(false);
            }
        }
    }, []);
    useEffect(() => {
        refresh();
        const timer = setInterval(() => {
            if (!navigationActive.current) void refresh();
        }, 5000);
        return () => {
            clearInterval(timer);
            controller.current?.abort();
        };
    }, [refresh]);
    useEffect(() => {
        setPage(0);
    }, [source, search, status, from, to, view]);
    useEffect(() => {
        if (selected && !dialog.current?.open) dialog.current?.showModal();
        else if (!selected && dialog.current?.open) dialog.current.close();
    }, [selected]);
    useEffect(() => {
        if (toast) {
            const t = setTimeout(() => setToast(''), 2500);
            return () => clearTimeout(t);
        }
    }, [toast]);
    const all = useMemo(
        () =>
            [...sandbox, ...feed.records].sort(
                (a, b) => Date.parse(b.date) - Date.parse(a.date),
            ) as Row[],
        [feed.records],
    );
    const rows = useMemo(
        () =>
            all.filter(
                (r) =>
                    (source === 'all' || r.source === source) &&
                    (!from ||
                        Date.parse(r.date) >= Date.parse(from + 'T00:00:00+09:00')) &&
                    (!to || Date.parse(r.date) <= Date.parse(to + 'T23:59:59+09:00')) &&
                    [r.id, r.merchantRef, r.recipient, r.digest, r.asset].some((v) =>
                        (v || '').toLowerCase().includes(search.toLowerCase()),
                    ),
            ),
        [all, source, from, to, search],
    );
    const totals = summarize(rows);
    async function navigate(next: string) {
        setMobile(false);
        if (next === view) return;
        const id = ++navigationId.current;
        navigationActive.current = true;
        setPageLoading(true);
        setView(next);
        setStatus('all');
        setCustomizeCards(false);
        await Promise.all([
            refresh(),
            new Promise((resolve) => setTimeout(resolve, demoLoadingDelay())),
        ]);
        if (id === navigationId.current) {
            navigationActive.current = false;
            setPageLoading(false);
        }
    }
    async function manualRefresh() {
        if (manualRefreshing) return;
        setManualRefreshing(true);
        navigationActive.current = true;
        try {
            await Promise.all([
                refresh(),
                new Promise((resolve) => setTimeout(resolve, demoLoadingDelay())),
            ]);
        } finally {
            navigationActive.current = false;
            setManualRefreshing(false);
        }
    }
    function download() {
        const a = document.createElement('a');
        const url = URL.createObjectURL(new Blob([csv(rows)], { type: 'text/csv' }));
        a.href = url;
        a.download = 'unsui-operations.csv';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setToast('Exported ' + rows.length + ' orders with source labels.');
    }
    async function copy(value: string) {
        try {
            await navigator.clipboard.writeText(value);
            setToast('Copied to clipboard.');
        } catch {
            setToast('Copy unavailable. Select the full value in the detail panel.');
        }
    }
    const title = routes.find((r) => r[0] === view)?.[1] || 'Overview';
    const issueRows = rows.filter((r) =>
        ['unmatched', 'mismatch'].includes(reconcile(r)),
    );
    const tableRows = rows.filter(
        (r) =>
            status === 'all' ||
            (view === 'payouts' ? r.payout : reconcile(r)) === status,
    );
    const displayed = tableRows.slice(page * 8, page * 8 + 8);
    if (initialLoading || !introReady)
        return (
            <WorkspaceLoader
                detail={
                    initialLoading
                        ? 'Fetching the latest app ledger…'
                        : 'Preparing your latest view…'
                }
            />
        );
    return (
        <div
            className={`app header-${layout.header} sidebar-${layout.sidebar} ${layout.compact ? 'sidebar-compact' : ''}`}
        >
            <WorkspaceSidebar
                mobile={mobile}
                navigate={navigate}
                view={view}
                issueRows={issueRows}
                admin={admin}
            />
            {mobile && (
                <button
                    className="mobile-backdrop"
                    aria-label="Close navigation"
                    onClick={() => setMobile(false)}
                />
            )}
            <div className="main-shell">
                <WorkspaceTopbar
                    setMobile={setMobile}
                    title={title}
                    layout={layout}
                    setLayout={setLayout}
                    connection={connection}
                    busy={busy}
                    theme={theme}
                    setTheme={setTheme}
                    onLogout={onLogout}
                />
                <main>
                    <WorkspaceHeading
                        view={view}
                        title={title}
                        manualRefresh={manualRefresh}
                        busy={busy}
                        manualRefreshing={manualRefreshing}
                        download={download}
                        source={source}
                        setSource={setSource}
                        search={search}
                        setSearch={setSearch}
                        from={from}
                        setFrom={setFrom}
                        to={to}
                        setTo={setTo}
                        setCustomizeCards={setCustomizeCards}
                        connection={connection}
                        feed={feed}
                    />
                    {manualRefreshing && <PageLoader title={title} fetching={busy} />}
                    <div
                        hidden={manualRefreshing}
                        aria-busy={pageLoading || manualRefreshing}
                    >
                        {pageLoading ? (
                            <PageLoader title={title} fetching={busy} />
                        ) : (
                            <>
                                {view === 'overview' && (
                                    <Overview
                                        customizeOpen={customizeCards}
                                        onCloseCustomize={() =>
                                            setCustomizeCards(false)
                                        }
                                        rows={rows}
                                        activity={
                                            <>
                                                <ActivityChart rows={rows} />
                                                <div className="chart-legend">
                                                    <span>
                                                        <i />
                                                        Service purchases
                                                    </span>
                                                    <span>
                                                        <i />
                                                        Recorded payout principal
                                                    </span>
                                                </div>
                                            </>
                                        }
                                        latest={
                                            <OrderTable
                                                rows={rows.slice(0, 5)}
                                                onSelect={setSelected}
                                            />
                                        }
                                        navigate={navigate}
                                    />
                                )}
                                {['orders', 'payouts', 'reconciliation'].includes(
                                    view,
                                ) && (
                                    <OrdersExplorer
                                        key={view}
                                        rows={rows}
                                        view={view}
                                        onSelect={setSelected}
                                    />
                                )}
                                {view === 'treasury' && (
                                    <TreasuryView rows={rows} feed={feed} />
                                )}
                                {['overview', 'payouts', 'connections'].includes(
                                    view,
                                ) && (
                                    <MultiBaasPanel
                                        data={feed.multibaas}
                                        onRefresh={manualRefresh}
                                        busy={busy || manualRefreshing}
                                    />
                                )}
                                <ConnectionsPanel
                                    view={view}
                                    connection={connection}
                                    feed={feed}
                                    lastSync={lastSync}
                                    manualRefresh={manualRefresh}
                                    setSource={setSource}
                                    navigate={navigate}
                                />
                            </>
                        )}
                    </div>
                    <footer>
                        <span>
                            <img src="/unsui-mark.svg" alt="" /> UnSui (雲水) · Clouds &
                            water
                        </span>
                        <span>
                            Sandbox and In-App sources remain distinct ·{' '}
                            {lastSync
                                ? 'Synced ' + lastSync.toLocaleTimeString()
                                : 'Awaiting app connection'}
                        </span>
                    </footer>
                </main>
            </div>
            <OrderDialog
                dialog={dialog}
                selected={selected}
                setSelected={setSelected}
                copy={copy}
            />
            {toast && (
                <div className="toast" role="status">
                    <Check size={16} />
                    {toast}
                </div>
            )}
        </div>
    );
}
