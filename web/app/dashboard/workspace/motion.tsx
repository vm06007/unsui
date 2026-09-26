import { useEffect, useRef, useState } from 'react';
/** Animate formatted metrics, preserving their currency, units and precision. */
export function CountUp({ value }: { value: string | number }) {
    const text = String(value),
        match = text.match(/^([^\d−-]*)([-−]?\d[\d,]*(?:\.\d+)?)(.*)$/);
    const target = match ? Number(match[2].replaceAll(',', '').replace('−', '-')) : NaN,
        previous = useRef(0),
        [current, setCurrent] = useState(0);
    useEffect(() => {
        if (!Number.isFinite(target)) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            previous.current = target;
            setCurrent(target);
            return;
        }
        const start = previous.current,
            began = performance.now();
        let frame = 0;
        const tick = (now: number) => {
            const progress = Math.min(1, (now - began) / 800),
                next = start + (target - start) * (1 - Math.pow(1 - progress, 3));
            previous.current = next;
            setCurrent(next);
            if (progress < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [target]);
    if (!match || !Number.isFinite(target)) return <>{text}</>;
    const decimals = match[2].split('.')[1]?.length || 0;
    return (
        <span className="count-up" aria-label={text}>
            <span aria-hidden="true">
                {match[1]}
                {current.toLocaleString('en-US', {
                    minimumFractionDigits: decimals,
                    maximumFractionDigits: decimals,
                })}
                {match[3]}
            </span>
        </span>
    );
}
export function WorkspaceLoader({
    label = 'Loading your workspace',
    detail = 'Fetching the latest app ledger and preparing your dashboard…',
}: {
    label?: string;
    detail?: string;
}) {
    return (
        <div className="workspace-loader" role="status" aria-live="polite">
            <div className="loader-panel">
                <div className="loader-mark">
                    <img src="/unsui-mark.svg" alt="" />
                    <span />
                </div>
                <p className="eyebrow">UNSUI · OPERATIONS</p>
                <h1>{label}</h1>
                <p>{detail}</p>
                <div className="loader-track">
                    <span />
                </div>
            </div>
        </div>
    );
}

export function PageLoader({ title, fetching }: { title: string; fetching: boolean }) {
    return (
        <section className="page-loader" role="status" aria-live="polite">
            <p>
                <span className="page-loader-dot" />
                {fetching
                    ? 'Refreshing app ledger…'
                    : `Preparing ${title.toLowerCase()}…`}
            </p>
            <div className="page-skeleton-metrics" aria-hidden="true">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i}>
                        <span />
                        <strong />
                        <span />
                    </div>
                ))}
            </div>
            <div className="page-skeleton-chart" aria-hidden="true" />
        </section>
    );
}

/** Presentation delay for the hackathon demo; real requests are awaited separately. */
export function demoLoadingDelay() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 0;
    return Math.round(
        Math.random() < 0.2 ? 1200 + Math.random() * 1200 : 350 + Math.random() * 750,
    );
}
