import { ArrowUpRight, Radio, ShieldCheck } from 'lucide-react';
import type { Admin } from './auth';
import { routes } from './routes';

export function WorkspaceSidebar({
    mobile,
    navigate,
    view,
    issueRows,
    admin,
}: {
    mobile: boolean;
    navigate: (next: string) => void;
    view: string;
    issueRows: { length: number };
    admin: Admin;
}) {
    return (
        <aside className={'sidebar ' + (mobile ? 'show' : '')}>
            <a className="brand" href="#overview" onClick={() => navigate('overview')}>
                <img src="/unsui-mark.svg" alt="" />
                <b>unsui</b>
                <span>雲水</span>
            </a>
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
                        {id === 'reconciliation' && issueRows.length > 0 && (
                            <em>{issueRows.length}</em>
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
                    <small>
                        {admin.method === 'wallet' ? 'Wallet admin' : 'Demo admin'}
                    </small>
                </div>
                <ShieldCheck size={17} />
            </div>
        </aside>
    );
}
