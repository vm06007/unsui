import { normalizeItems } from '../../../../shared/dashboard-settings.mjs';
import { type ReactNode } from 'react';
import { CountUp } from './motion';
import { ArrowUpRight, Settings2 } from 'lucide-react';
import {
  useSaved,
  ReorderSettings,
  ExpandablePanel,
  type SettingItem,
} from './preferences';
import { ToolbarPopover } from './popover';
import type { Row } from './types';
import { summarize, yen, treasury, sandbox, reconcile } from './domain.mjs';
export const cardDefaults: SettingItem[] = [
  ['purchases', 'Service purchases', false],
  ['payouts', 'Recorded payouts', false],
  ['settlement', 'Merchant settlement', false],
  ['issues', 'Needs reconciliation', false],
  ['activity', 'Purchases & payout value', true],
  ['buffer', 'Payout buffer', false],
  ['assets', 'Payout asset mix', false],
  ['states', 'Reconciliation breakdown', false],
  ['settlements', 'Yen settlement', false],
  ['latest', 'Latest journeys', true],
].map(([id, label, wide]) => ({
  id: String(id),
  label: String(label),
  wide: Boolean(wide),
  enabled: true,
}));
export function OverviewCardControls() {
  const [stored, setItems] = useSaved<SettingItem[]>(
    'unsui-overview-cards',
    cardDefaults,
  );
  const items: SettingItem[] = normalizeItems(stored, cardDefaults);
  const preset = (ids: string[]) =>
    setItems([
      ...ids.map((id) => ({
        ...cardDefaults.find((card) => card.id === id)!,
        enabled: true,
      })),
      ...cardDefaults
        .filter((card) => !ids.includes(card.id))
        .map((card) => ({ ...card, enabled: false })),
    ]);
  return (
    <ToolbarPopover
      label="Customize cards"
      title="Customize overview"
      width={390}
      triggerContent={
        <>
          <Settings2 size={15} />
          Customize cards{' '}
          <small>
            {items.filter((card) => card.enabled).length}/{items.length}
          </small>
        </>
      }
    >
      <p className="subtle">
        Drag cards to reorder, toggle their visibility, or choose a width. Your
        layout saves automatically.
      </p>
      <div
        className="overview-presets"
        role="group"
        aria-label="Overview layouts"
      >
        <button className="secondary" onClick={() => setItems(cardDefaults)}>
          All cards
        </button>
        <button
          className="secondary"
          onClick={() => preset(['payouts', 'buffer', 'assets', 'latest'])}
        >
          Payout focus
        </button>
        <button
          className="secondary"
          onClick={() =>
            preset(['issues', 'states', 'settlement', 'settlements'])
          }
        >
          Reconciliation focus
        </button>
      </div>
      <ReorderSettings
        items={items}
        onChange={setItems}
        onReset={() => setItems(cardDefaults)}
        resize
      />
    </ToolbarPopover>
  );
}

export function Overview({
  rows,
  activity,
  latest,
  navigate,
}: {
  rows: Row[];
  activity: ReactNode;
  latest: ReactNode;
  navigate: (s: string) => void;
}) {
  const [storedItems, setItems] = useSaved<SettingItem[]>(
    'unsui-overview-cards',
    cardDefaults,
  );
  const items: SettingItem[] = normalizeItems(storedItems, cardDefaults);
  const t = summarize(rows),
    b = treasury(sandbox, 'SUI', 50);
  const metrics: Record<string, [string, string, string]> = {
    purchases: [
      'Service purchases',
      yen(t.gross),
      `${rows.length} orders across selected sources`,
    ],
    payouts: [
      'Recorded payouts',
      String(t.paid),
      `${rows.filter((r) => r.payout === 'queued').length} queued · SUI / ETH / MIZU`,
    ],
    settlement: [
      'Merchant settlement',
      yen(t.settled),
      `${yen(t.pending)} awaiting settlement · sample SB data`,
    ],
    issues: [
      'Needs reconciliation',
      String(t.issues),
      'Missing references or amount differences',
    ],
  };
  return (
    <>
      <div className="custom-card-grid">
        {items
          .filter((x) => x.enabled && cardDefaults.some((d) => d.id === x.id))
          .map((item) => (
            <div
              key={item.id}
              className={'widget ' + (item.wide ? 'widget-wide' : '')}
            >
              {metrics[item.id] ? (
                <div className="metric">
                  <div>{metrics[item.id][0]}</div>
                  <strong>
                    <CountUp value={metrics[item.id][1]} />
                  </strong>
                  <small>{metrics[item.id][2]}</small>
                </div>
              ) : item.id === 'activity' ? (
                <ExpandablePanel title={item.label}>{activity}</ExpandablePanel>
              ) : item.id === 'buffer' ? (
                <section className="buffer-card">
                  <h2>Payout buffer</h2>
                  <span className="buffer-caption">SANDBOX / SUI</span>
                  <strong>
                    <CountUp value={b.remaining.toFixed(4)} />
                    <small>SUI</small>
                  </strong>
                  <p>
                    Prefunded liquidity while yen settles. Opening balance: 50
                    SUI.
                  </p>
                  <div className="buffer-meter">
                    <span
                      style={{
                        width: `${Math.max(0, (b.remaining / 50) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="buffer-meta">
                    {b.queued.toFixed(4)} SUI reserved
                  </div>
                  <button onClick={() => navigate('treasury')}>
                    Treasury & forecast <ArrowUpRight size={16} />
                  </button>
                </section>
              ) : item.id === 'assets' ? (
                <ExpandablePanel title={item.label}>
                  <Breakdown
                    data={Array.from(
                      new Set([
                        'SUI',
                        'ETH',
                        'MIZU',
                        ...rows.map((r) => r.asset),
                      ]),
                    ).map((asset) => ({
                      label: asset,
                      value: rows.filter((r) => r.asset === asset).length,
                    }))}
                    unit="orders"
                  />
                </ExpandablePanel>
              ) : item.id === 'states' ? (
                <ExpandablePanel title={item.label}>
                  <Breakdown
                    data={['matched', 'pending', 'unmatched', 'mismatch'].map(
                      (state) => ({
                        label: state,
                        value: rows.filter((r) => reconcile(r) === state)
                          .length,
                      }),
                    )}
                    unit="orders"
                  />
                </ExpandablePanel>
              ) : item.id === 'settlements' ? (
                <ExpandablePanel title={item.label}>
                  <Breakdown
                    data={[
                      { label: 'Settled', value: t.settled },
                      {
                        label: 'Awaiting yen settlement',
                        value: t.pending,
                      },
                      {
                        label: 'Unmatched',
                        value: rows
                          .filter((r) => r.settlement === 'unmatched')
                          .reduce((s, r) => s + r.jpy, 0),
                      },
                    ]}
                    unit="JPY"
                  />
                </ExpandablePanel>
              ) : (
                <ExpandablePanel title="Latest journeys">
                  {latest}
                  <button
                    className="text-button"
                    onClick={() => navigate('orders')}
                  >
                    Explore all orders <ArrowUpRight size={14} />
                  </button>
                </ExpandablePanel>
              )}
            </div>
          ))}
      </div>
    </>
  );
}
function Breakdown({
  data,
  unit,
}: {
  data: { label: string; value: number }[];
  unit: string;
}) {
  const max = Math.max(1, ...data.map((x) => x.value)),
    total = data.reduce((s, x) => s + x.value, 0);
  return (
    <div className="breakdown">
      <strong>
        <CountUp value={unit === 'JPY' ? yen(total) : total} />
        <small>{unit === 'JPY' ? 'merchant value' : 'orders'}</small>
      </strong>
      {data.map((x, i) => (
        <div className="breakdown-row" key={x.label}>
          <div>
            <span>
              {x.label === 'unmatched'
                ? 'Awaiting merchant'
                : x.label === 'pending'
                  ? 'Awaiting payout'
                  : x.label}
            </span>
            <b>{unit === 'JPY' ? yen(x.value) : x.value}</b>
          </div>
          <div className="breakdown-track">
            <span
              style={{
                width: `${(x.value / max) * 100}%`,
                background: ['#719c59', '#aecb89', '#cfa66a', '#b66f64'][i % 4],
              }}
            />
          </div>
        </div>
      ))}
      {!total && <p className="subtle">No data for this selection.</p>}
    </div>
  );
}
