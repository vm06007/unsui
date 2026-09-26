import { yen } from './domain.mjs';
import { number } from './format';
import type { Row } from './types';

export function ActivityChart({ rows }: { rows: Row[] }) {
    const bins = new Map<string, { gross: number; paid: number }>();
    for (const r of rows) {
        const day = new Date(r.date).toLocaleDateString('en-CA', {
            timeZone: 'Asia/Tokyo',
        });
        const b = bins.get(day) || { gross: 0, paid: 0 };
        b.gross += r.jpy;
        if (r.payout === 'confirmed') b.paid += r.jpy;
        bins.set(day, b);
    }
    const data = [...bins].sort(([a], [b]) => a.localeCompare(b)).slice(-10),
        max = Math.max(1000, ...data.map(([, b]) => b.gross)),
        step = 620 / Math.max(data.length, 1);
    return (
        <div className="activity-chart">
            <svg
                viewBox="0 0 700 230"
                role="img"
                aria-label="Daily service purchases and recorded payout principal in yen"
            >
                {[0, 1, 2, 3].map((i) => (
                    <g key={i}>
                        <line x1="57" x2="690" y1={190 - i * 52} y2={190 - i * 52} />
                        <text x="45" y={194 - i * 52} textAnchor="end">
                            {number((max * i) / 3, 0)}
                        </text>
                    </g>
                ))}
                {data.map(([day, b], i) => (
                    <g key={day}>
                        <rect
                            x={67 + i * step + step * 0.15}
                            y={190 - (b.gross / max) * 156}
                            width={step * 0.28}
                            height={(b.gross / max) * 156}
                            rx="5"
                            className="bar-gross"
                        >
                            <title>
                                {day}: {yen(b.gross)} purchases
                            </title>
                        </rect>
                        <rect
                            x={67 + i * step + step * 0.47}
                            y={190 - (b.paid / max) * 156}
                            width={step * 0.28}
                            height={(b.paid / max) * 156}
                            rx="5"
                            className="bar-paid"
                        >
                            <title>
                                {day}: {yen(b.paid)} payout principal
                            </title>
                        </rect>
                        <text
                            x={67 + i * step + step * 0.45}
                            y="218"
                            textAnchor="middle"
                        >
                            {day.slice(5)}
                        </text>
                    </g>
                ))}
            </svg>
            {!data.length && (
                <span className="chart-empty">No activity for this selection</span>
            )}
        </div>
    );
}
