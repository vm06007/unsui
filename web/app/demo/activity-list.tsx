'use client';
import {
    ArrowUpRight,
    Bus,
    ChevronRight,
    GlassWater,
    Plus,
    TrainFront,
} from 'lucide-react';
import { DEMO_NETWORKS, TRIPS, type Receipt } from '@/lib/demo-engine';

export type DemoTrip = (typeof TRIPS)[number];

function tripIcon(kind: string) {
    if (kind === 'train') return <TrainFront size={20} />;
    if (kind === 'bus') return <Bus size={20} />;
    if (kind === 'drink') return <GlassWater size={20} />;
    return <Plus size={20} />;
}

export function ActivityList({
    receipts,
    all = false,
    onShowProof,
    onSelectTrip,
}: {
    receipts: Receipt[];
    all?: boolean;
    onShowProof: (receipt: Receipt) => void;
    onSelectTrip: (trip: DemoTrip) => void;
}) {
    return (
        <div className="activity-list">
            {[...receipts].reverse().map((receipt) => (
                <button
                    className="activity-row"
                    key={receipt.id}
                    onClick={() => onShowProof(receipt)}
                >
                    <span className="activity-icon paid">
                        <ArrowUpRight size={20} />
                    </span>
                    <span>
                        <b>UnSui refund</b>
                        <small>
                            {new Date(receipt.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                            })}{' '}
                            · {DEMO_NETWORKS[receipt.chain].name} receipt
                        </small>
                    </span>
                    <strong>
                        −¥{receipt.amountJpy.toLocaleString()}
                        <ChevronRight size={15} />
                    </strong>
                </button>
            ))}
            {TRIPS.slice(0, all ? 5 : 3).map((trip) => (
                <button
                    className="activity-row"
                    key={trip.name}
                    onClick={() => onSelectTrip(trip)}
                >
                    <span
                        className={
                            'activity-icon ' + (trip.kind === 'topup' ? 'paid' : '')
                        }
                    >
                        {tripIcon(trip.kind)}
                    </span>
                    <span>
                        <b>{trip.name}</b>
                        <small>{trip.date}</small>
                    </span>
                    <strong className={trip.amount > 0 ? 'positive' : ''}>
                        {trip.amount > 0 ? '+' : '−'}¥
                        {Math.abs(trip.amount).toLocaleString()}
                    </strong>
                </button>
            ))}
        </div>
    );
}
