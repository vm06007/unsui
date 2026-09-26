import { useState, type ReactNode } from 'react';
import { ArrowUpRight, Clock, Radio, Wallet } from 'lucide-react';
import { project, sandbox, treasury, yen } from './domain.mjs';
import { CountUp } from './motion';
import { ExpandablePanel } from './preferences';
import { Badge } from './badge';
import { number } from './format';
import type { Feed, Row } from './types';

function Metric({
    label,
    value,
    hint,
    icon,
    accent = false,
}: {
    label: string;
    value: string;
    hint: string;
    icon: ReactNode;
    accent?: boolean;
}) {
    return (
        <div className={'metric ' + (accent ? 'accent' : '')}>
            <div>
                <span>{label}</span>
                <i>{icon}</i>
            </div>
            <strong>
                <CountUp value={value} />
            </strong>
            <small>{hint}</small>
        </div>
    );
}

export function TreasuryView({ rows, feed }: { rows: Row[]; feed: Feed }) {
    const [asset, setAsset] = useState('SUI'),
        [basis, setBasis] = useState('sandbox'),
        [dailyOrders, setDaily] = useState(12),
        [avg, setAvg] = useState(1000),
        [days, setDays] = useState(7),
        [fee, setFee] = useState(0),
        [opening, setOpening] = useState(50);
    const availableLive = asset === 'SUI' && feed.treasury?.asset === 'SUI';
    const sandboxBalance = treasury(sandbox, asset, asset === 'ETH' ? 0.05 : opening),
        isLive = basis === 'observed';
    const balance = isLive
            ? availableLive
                ? feed.treasury!.balance
                : 0
            : sandboxBalance.remaining,
        queue = isLive
            ? feed.records
                  .filter((r) => r.asset === asset && r.payout === 'queued')
                  .reduce((n, r) => n + r.crypto, 0)
            : sandboxBalance.queued;
    const forecast = project({
        balance,
        queued: queue,
        dailyOrders,
        averageJpy: avg,
        rate: asset === 'ETH' ? 0.000002 : 0.0001,
        feeBps: fee,
        days,
    });
    const d = rows
        .filter((r) => r.asset === asset && r.payout === 'confirmed')
        .reduce((n, r) => n + r.crypto, 0);
    return (
        <>
            <div className="treasury-controls">
                <label>
                    Asset
                    <select value={asset} onChange={(e) => setAsset(e.target.value)}>
                        <option>SUI</option>
                        <option>ETH</option>
                        <option>MIZU</option>
                    </select>
                </label>
                <label>
                    Balance source
                    <select value={basis} onChange={(e) => setBasis(e.target.value)}>
                        <option value="sandbox">Sandbox treasury</option>
                        <option value="observed">Observed app pool</option>
                    </select>
                </label>
                <span>
                    {isLive
                        ? 'Read-only contract pool · ' +
                          (feed.treasury?.network || 'unavailable')
                        : 'Illustrative opening balance less sandbox payouts'}
                </span>
            </div>
            {isLive && !availableLive && (
                <div className="notice">
                    No observed {asset} pool is available. Forecast is disabled until a
                    balance is received.
                </div>
            )}
            <div className="metric-grid">
                <Metric
                    label={'Available ' + asset}
                    value={isLive && !availableLive ? '—' : number(balance, 6)}
                    icon={<Wallet size={19} />}
                    hint={
                        isLive
                            ? 'Observed contract balance'
                            : 'Sandbox balance, not a wallet balance'
                    }
                    accent
                />
                <Metric
                    label="Queued commitments"
                    value={number(queue, 6) + ' ' + asset}
                    icon={<Clock size={19} />}
                    hint="Reserved before forecasting future demand"
                />
                <Metric
                    label="Recorded payouts"
                    value={number(d, 6) + ' ' + asset}
                    icon={<ArrowUpRight size={19} />}
                    hint="From current order filters"
                />
                <Metric
                    label="Projected runway"
                    value={
                        isLive && !availableLive
                            ? '—'
                            : forecast.runway === null
                              ? 'No demand'
                              : number(forecast.runway, 1) + ' days'
                    }
                    icon={<Radio size={19} />}
                    hint="Without any future treasury replenishment"
                />
            </div>
            <div className="forecast-grid">
                <section className="card">
                    <div className="section-head">
                        <div>
                            <span className="eyebrow">PLAN THE NEXT JOURNEY</span>
                            <h2>Buffer forecast</h2>
                            <p>What happens before the next settlement?</p>
                        </div>
                        <span className="badge sandbox">Scenario only</span>
                    </div>
                    <div className="forecast-end">
                        <strong>
                            {isLive && !availableLive
                                ? '—'
                                : number(forecast.ending, 6)}{' '}
                            <small>{asset}</small>
                        </strong>
                        {(!isLive || availableLive) && (
                            <Badge
                                value={forecast.ending < 0 ? 'shortfall' : 'covered'}
                            />
                        )}
                    </div>
                    {(!isLive || availableLive) && (
                        <ExpandablePanel title="Liquidity projection">
                            <ForecastChart
                                balance={balance - queue}
                                ending={forecast.ending}
                                days={days}
                            />
                        </ExpandablePanel>
                    )}
                    <p className="subtle">
                        After {days} days · {dailyOrders} orders/day · {yen(avg)}{' '}
                        average order
                    </p>
                </section>
                <section className="card forecast-inputs">
                    <h2>Scenario assumptions</h2>
                    <label>
                        Orders per day <output>{dailyOrders}</output>
                        <input
                            aria-label="Orders per day"
                            type="range"
                            min="0"
                            max="60"
                            value={dailyOrders}
                            onChange={(e) => setDaily(+e.target.value)}
                        />
                    </label>
                    <label>
                        Average purchase (JPY)
                        <input
                            aria-label="Average purchase JPY"
                            type="number"
                            min="0"
                            max="20000"
                            value={avg}
                            onChange={(e) =>
                                setAvg(Math.max(0, Math.min(20000, +e.target.value)))
                            }
                        />
                    </label>
                    <label>
                        Forecast horizon
                        <select
                            aria-label="Forecast horizon"
                            value={days}
                            onChange={(e) => setDays(+e.target.value)}
                        >
                            <option value="1">1 day</option>
                            <option value="3">3 days</option>
                            <option value="7">7 days</option>
                            <option value="14">14 days</option>
                            <option value="30">30 days</option>
                        </select>
                    </label>
                    <label>
                        Hypothetical fee<output>{fee / 100}%</output>
                        <input
                            aria-label="Hypothetical fee"
                            type="range"
                            min="0"
                            max="500"
                            step="25"
                            value={fee}
                            onChange={(e) => setFee(+e.target.value)}
                        />
                    </label>
                    {!isLive && asset === 'SUI' && (
                        <label>
                            Sandbox opening SUI
                            <input
                                aria-label="Opening SUI"
                                type="number"
                                min="0"
                                value={opening}
                                onChange={(e) =>
                                    setOpening(Math.max(0, +e.target.value))
                                }
                            />
                        </label>
                    )}
                    <div className="small-note">
                        Fixed scenario rate: ¥10,000 = 1 SUI; ¥500,000 = 1 ETH; ¥10,000
                        = 1 test MIZU. Actual recorded fees remain unchanged. Projected
                        fee value: {yen(forecast.feesJpy)}.
                    </div>
                </section>
            </div>
            <section className="card">
                <h2>Yen settlement ≠ crypto liquidity</h2>
                <div className="responsibilities">
                    <div>
                        <b>1 / Collect</b>
                        <p>
                            Merchant service purchases accrue in JPY. App receipts alone
                            cannot establish bank settlement.
                        </p>
                    </div>
                    <div>
                        <b>2 / Pay out</b>
                        <p>
                            Crypto leaves the prefunded pool to the recipient. Its
                            receipt is linked to the UnSui order.
                        </p>
                    </div>
                    <div>
                        <b>3 / Replenish</b>
                        <p>
                            Convert settled yen and replenish the pool. Forecasts above
                            assume no automatic conversion or top-up.
                        </p>
                    </div>
                </div>
            </section>
        </>
    );
}
function ForecastChart({
    balance,
    ending,
    days,
}: {
    balance: number;
    ending: number;
    days: number;
}) {
    const max = Math.max(balance, ending, 1),
        min = Math.min(ending, 0),
        y = (v: number) => 170 - ((v - min) / (max - min)) * 145;
    return (
        <svg
            className="forecast-chart"
            viewBox="0 0 650 205"
            role="img"
            aria-label={`Projected buffer after ${days} days: ${number(ending)} tokens`}
        >
            <line x1="30" x2="625" y1={y(0)} y2={y(0)} className="zero-line" />
            <path
                d={`M30 ${y(balance)} L625 ${y(ending)} L625 180 L30 180Z`}
                className="forecast-area"
            />
            <path d={`M30 ${y(balance)} L625 ${y(ending)}`} className="forecast-line" />
            <circle cx="30" cy={y(balance)} r="5" />
            <circle cx="625" cy={y(ending)} r="5" />
            <text x="30" y="200">
                Today
            </text>
            <text x="625" y="200" textAnchor="end">
                Day {days}
            </text>
        </svg>
    );
}
