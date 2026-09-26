'use client';
import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { modelBuffer } from '@/lib/buffer-model';
export default function BufferChart() {
  const [initial, setInitial] = useState(20),
    [delay, setDelay] = useState(3),
    [daily, setDaily] = useState(50000);
  const { points, quote, floor, totalPaid } = modelBuffer(
    initial,
    delay,
    daily,
  );
  const end = points.at(-1)!;
  const high = Math.max(initial, ...points.map((p) => p.pool), floor) * 1.15;
  const x = (day: number) => 48 + day * 58;
  const y = (v: number) => 224 - (v / high) * 190;
  const line = points.map((p) => `${x(p.day)},${y(p.pool)}`).join(' ');
  const number = (n: number) =>
    n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return (
    <div className="buffer-lab">
      <div className="lab-controls">
        <span className="arch-kicker">TRY THE TREASURY MODEL</span>
        <h3>
          Give the buffer
          <br />a little pressure.
        </h3>
        <p>
          Adjust the opening balance and settlement delay. Watch the payout
          queue grow when the reserve floor would be breached.
        </p>
        <div className="lab-slider">
          <label id="buffer-label">
            Opening crypto buffer <b>{initial} SUI</b>
          </label>
          <Slider
            aria-labelledby="buffer-label"
            min={5}
            max={50}
            step={5}
            value={[initial]}
            onValueChange={(v) => setInitial(Array.isArray(v) ? v[0] : v)}
          />
        </div>
        <div className="lab-slider">
          <label id="delay-label">
            Settlement + conversion lag <b>{delay} days</b>
          </label>
          <Slider
            aria-labelledby="delay-label"
            min={1}
            max={7}
            step={1}
            value={[delay]}
            onValueChange={(v) => setDelay(Array.isArray(v) ? v[0] : v)}
          />
        </div>
        <div className="lab-slider">
          <label id="volume-label">
            Daily confirmed purchases <b>¥{daily.toLocaleString()}</b>
          </label>
          <Slider
            aria-labelledby="volume-label"
            min={10000}
            max={100000}
            step={10000}
            value={[daily]}
            onValueChange={(v) => setDaily(Array.isArray(v) ? v[0] : v)}
          />
        </div>
        <button
          className="lab-reset"
          onClick={() => {
            setInitial(20);
            setDelay(3);
            setDaily(50000);
          }}
        >
          Reset illustration
        </button>
      </div>
      <div className="lab-results">
        <div className="chart-heading">
          <h3>Available crypto in the pool</h3>
          <span>10-day illustration · SUI</span>
        </div>
        <div
          className="chart-scroll"
          tabIndex={0}
          role="region"
          aria-label="Liquidity chart. Scroll horizontally on small screens."
        >
          <svg
            className="buffer-svg"
            viewBox="0 0 660 270"
            role="img"
            aria-label={`Pool starts at ${initial} SUI and ends at ${number(end.pool)} SUI. ${number(end.queued)} SUI of requested payouts queued after ten days.`}
          >
            <defs>
              <linearGradient id="buffer-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#81b759" stopOpacity=".24" />
                <stop offset="100%" stopColor="#81b759" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0, 1, 2, 3, 4].map((i) => (
              <g key={i}>
                <line
                  x1="48"
                  x2="628"
                  y1={y((high * i) / 4)}
                  y2={y((high * i) / 4)}
                  stroke="#e1e9dc"
                />
                <text x="35" y={y((high * i) / 4) + 4} textAnchor="end">
                  {Math.round((high * i) / 4)}
                </text>
              </g>
            ))}
            <polygon
              points={`48,224 ${line} 628,224`}
              fill="url(#buffer-fill)"
            />
            <line
              x1="48"
              x2="628"
              y1={y(floor)}
              y2={y(floor)}
              stroke="#bb844f"
              strokeDasharray="5 5"
            />
            <polyline
              points={line}
              fill="none"
              stroke="#3b7b4b"
              strokeWidth="3"
            />
            {points.map((p) => (
              <g key={p.day}>
                <circle
                  cx={x(p.day)}
                  cy={y(p.pool)}
                  r={p.queued > 0 ? 5 : 3.5}
                  fill={p.queued > 0 ? '#bc7d4d' : '#3b7b4b'}
                  stroke="#fff"
                  strokeWidth="2"
                />
                <text x={x(p.day)} y="248" textAnchor="middle">
                  {p.day === 0 ? 'Start' : `D${p.day}`}
                </text>
              </g>
            ))}
          </svg>
        </div>
        <div className="chart-key">
          <span>
            <i />
            Crypto available
          </span>
          <span>
            <i className="floor-key" />3 SUI reserve floor
          </span>
          <span>
            <i className="queue-key" />
            Payouts queued
          </span>
        </div>
        <div className="lab-stats" aria-live="polite">
          <div>
            <span>Paid over 10 days</span>
            <strong>
              {number(totalPaid)} <small>SUI</small>
            </strong>
          </div>
          <div>
            <span>End-of-day pool</span>
            <strong>
              {number(end.pool)} <small>SUI</small>
            </strong>
          </div>
          <div className={end.queued > 0 ? 'warning-stat' : ''}>
            <span>Waiting for liquidity</span>
            <strong>
              {number(end.queued)} <small>SUI</small>
            </strong>
          </div>
        </div>
        <p className="chart-assumptions">
          Illustrative assumptions: ¥{quote.toLocaleString()} per SUI, 2%
          combined settlement/conversion cost, one purchase batch per day, and a
          3 SUI minimum reserve. Fees reduce replenishment, so an equal gross
          payout erodes the buffer. This is not a live price, an SBPS fee quote,
          or an SBPS settlement promise. Whole daily batches wait in order; gas,
          price movements and payment reversals are excluded.
        </p>
        <Accordion className="model-details">
          <AccordionItem value="numbers">
            <AccordionTrigger>See the day-by-day numbers</AccordionTrigger>
            <AccordionContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Day</TableHead>
                    <TableHead>Added SUI</TableHead>
                    <TableHead>Paid SUI</TableHead>
                    <TableHead>Pool SUI</TableHead>
                    <TableHead>Queued SUI</TableHead>
                    <TableHead>Unsettled gross JPY</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {points.map((p) => (
                    <TableRow key={p.day}>
                      <TableCell>{p.day}</TableCell>
                      <TableCell>{number(p.refilled)}</TableCell>
                      <TableCell>{number(p.paid)}</TableCell>
                      <TableCell>{number(p.pool)}</TableCell>
                      <TableCell>{number(p.queued)}</TableCell>
                      <TableCell>¥{number(p.pendingJpy)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
