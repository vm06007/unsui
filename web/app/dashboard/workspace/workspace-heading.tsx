import {
  Download,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { OverviewCardControls } from './overview';
import { ToolbarPopover } from './popover';
import type { Feed } from './types';

export function WorkspaceHeading({
  view,
  title,
  manualRefresh,
  busy,
  manualRefreshing,
  download,
  source,
  setSource,
  search,
  setSearch,
  from,
  setFrom,
  to,
  setTo,
  connection,
  feed,
}: {
  view: string;
  title: string;
  manualRefresh: () => void;
  busy: boolean;
  manualRefreshing: boolean;
  download: () => void;
  source: string;
  setSource: (source: string) => void;
  search: string;
  setSearch: (search: string) => void;
  from: string;
  setFrom: (from: string) => void;
  to: string;
  setTo: (to: string) => void;
  connection: string;
  feed: Feed;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">UNSUI CONTROL ROOM / TOKYO</p>
          <h1>{view === 'overview' ? 'Every yen. Every journey.' : title}</h1>
          <p>
            {view === 'overview'
              ? 'From a transit card in Tokyo to a wallet anywhere. See the whole picture.'
              : view === 'treasury'
                ? 'Know what is available, what is committed, and what comes next.'
                : view === 'connections'
                  ? 'Clear origins for every number in your workspace.'
                  : 'Follow each service purchase through to its crypto payout.'}
          </p>
        </div>
        <div className="heading-actions">
          <button
            className="secondary"
            onClick={manualRefresh}
            disabled={busy || manualRefreshing}
          >
            <RefreshCw
              size={15}
              className={busy || manualRefreshing ? 'spin' : ''}
            />
            {manualRefreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <button className="primary" onClick={download}>
            <Download size={15} />
            Export
          </button>
        </div>
      </div>
      <div className="filterbar">
        <div className="source-tabs" role="group" aria-label="Data source">
          {[
            ['all', 'All purchases'],
            ['sandbox', 'Sandbox'],
            ['in-app', 'In-App'],
          ].map(([v, l]) => (
            <button
              key={v}
              className={source === v ? 'selected' : ''}
              onClick={() => setSource(v)}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="searchbox">
          <Search size={16} />
          <input
            aria-label="Search orders"
            placeholder="Search order, address or hash…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <ToolbarPopover
          label="Date filters"
          title="Date filters"
          className="date-filter-toggle"
          triggerContent={
            <>
              <SlidersHorizontal size={15} />
              Dates
              {(from || to) && (
                <span className="filter-count">
                  {Number(!!from) + Number(!!to)}
                </span>
              )}
            </>
          }
        >
          <p className="subtle">Purchase dates in Japan (JST).</p>
          <div className="date-range">
            <input
              aria-label="From date JST"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <span>→</span>
            <input
              aria-label="To date JST"
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
            />
            <small>JST</small>
            {(from || to) && (
              <button
                aria-label="Clear date range"
                onClick={() => {
                  setFrom('');
                  setTo('');
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>
        </ToolbarPopover>
        {view === 'overview' && <OverviewCardControls />}
      </div>
      {from && to && from > to && (
        <div className="notice">
          Choose an end date on or after the start date.
        </div>
      )}
      {connection === 'offline' && source !== 'sandbox' && (
        <div className="notice">
          App ledger is offline.{' '}
          {feed.records.length
            ? 'Showing the last received app records.'
            : 'Sandbox records remain available.'}{' '}
          Start the mobile backend to resume updates.
        </div>
      )}
    </>
  );
}
