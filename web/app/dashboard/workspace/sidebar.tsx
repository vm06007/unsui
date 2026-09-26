import {
    ArrowUpRight,
    PanelLeftClose,
    PanelLeftOpen,
    Radio,
    ShieldCheck,
} from 'lucide-react';
import type { Admin } from './auth';
import { routes } from './routes';

export function WorkspaceSidebar({
    mobile,
    navigate,
    view,
    livePurchases,
    admin,
    compact,
    onCompact,
}: {
    mobile: boolean;
    navigate: (next: string) => void;
    view: string;
    livePurchases: number;
    admin: Admin;
    compact: boolean;
    onCompact: (compact: boolean) => void;
}) {
    return (
        <aside className={'sidebar ' + (mobile ? 'show' : '')}>
            <div className="sidebar-brand-row">
                <a className="brand" href="#overview" onClick={() => navigate('overview')}>
                    <img src="/unsui-mark.svg" alt="" />
                    <b>unsui</b>
                    <span>雲水</span>
                </a>
                <button
                    className="icon-button sidebar-collapse"
                    aria-label={compact ? 'Expand sidebar' : 'Compact sidebar'}
                    aria-pressed={compact}
                    onClick={() => onCompact(!compact)}
                >
                    {compact ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                </button>
            </div>
            <div className="workspace-tag">
                <span className="tiny-dot" />
                Tokyo workspace<small>OPERATIONS</small>
            </div>
            <p className="nav-label">WORKSPACE</p>
            <nav>
                {routes.map(([id, label, Icon]) => (
                    <button
                        key={id}
                        className={view === id ? 'active' : ''}
                        onClick={() => navigate(id)}
                    >
                        <Icon size={18} />
                        {label}
                        {id === 'reconciliation' && livePurchases > 0 && (
                            <em title="In-app purchases">{livePurchases}</em>
                        )}
                    </button>
                ))}
            </nav>
            <div className="sidebar-bottom">
                <div className="source-icon">
                    <Radio size={16} />
                </div>
                <strong>One journey. Two ledgers.</strong>
                <p>Merchant purchases meet on-chain payouts.</p>
                <button onClick={() => navigate('connections')}>
                    Manage data sources <ArrowUpRight size={14} />
                </button>
            </div>
            <div className="account">
                <span>U</span>
                <div title={admin.email + ' · ' + admin.address}>
                    UnSui admin
                    {admin.method === 'wallet' && <small>Wallet admin</small>}
                </div>
                <ShieldCheck size={17} />
            </div>
        </aside>
    );
}
