import { ChevronRight, Menu, Moon, Sun } from 'lucide-react';
import { LayoutSettings, defaultLayout } from './preferences';

export function WorkspaceTopbar({
    setMobile,
    title,
    layout,
    setLayout,
    connection,
    busy,
    theme,
    setTheme,
    onLogout,
}: {
    setMobile: (open: boolean) => void;
    title: string;
    layout: typeof defaultLayout;
    setLayout: (value: typeof defaultLayout) => void;
    connection: string;
    busy: boolean;
    theme: string;
    setTheme: (theme: string) => void;
    onLogout: () => void;
}) {
    return (
        <header className="topbar">
            <button
                className="icon-button mobile-toggle"
                aria-label="Open navigation"
                onClick={() => setMobile(true)}
            >
                <Menu size={20} />
            </button>
            <div className="breadcrumb">
                Workspace <ChevronRight size={14} />
                <b>{title}</b>
            </div>
            <div className="top-actions">
                <LayoutSettings value={layout} onChange={setLayout} />
                <span className={'connection ' + connection}>
                    <i />
                    {connection === 'connected'
                        ? busy
                            ? 'Syncing app ledger…'
                            : 'App ledger connected'
                        : connection === 'offline'
                          ? 'App ledger offline'
                          : 'Connecting'}
                </span>
                <button
                    className="icon-button"
                    aria-label={
                        theme === 'light'
                            ? 'Switch to dark mode'
                            : 'Switch to light mode'
                    }
                    onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                >
                    {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                </button>
                <a className="secondary" href="/">
                    Welcome
                </a>
                <button className="secondary" onClick={onLogout}>
                    Sign out
                </button>
                <span className="avatar">U</span>
            </div>
        </header>
    );
}
