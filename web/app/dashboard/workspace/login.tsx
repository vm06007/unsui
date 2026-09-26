import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import { WalletLogin, authRequest, saveSession, type Admin } from './auth';
import { WorkspaceLoader } from './motion';
import { App } from './app';

export function DemoLogin() {
    const [admin, setAdmin] = useState<Admin | null>(null),
        [checking, setChecking] = useState(true),
        [signingIn, setSigningIn] = useState(false);
    useEffect(() => {
        authRequest('session')
            .then((r) => setAdmin((r as { user: Admin }).user))
            .catch(() => sessionStorage.removeItem('unsui-ops-token'))
            .finally(() => setChecking(false));
    }, []);
    const [email, setEmail] = useState(''),
        [password, setPassword] = useState(''),
        [error, setError] = useState('');
    function logout() {
        authRequest('logout', {}).catch(() => {});
        sessionStorage.removeItem('unsui-ops-token');
        setAdmin(null);
        setPassword('');
        setError('');
    }
    async function submit(e: FormEvent) {
        e.preventDefault();
        setSigningIn(true);
        setError('');
        try {
            const result = (await authRequest('password', { email, password })) as {
                token: string;
                user: Admin;
            };
            setAdmin(saveSession(result));
            setPassword('');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unable to sign in.');
        } finally {
            setSigningIn(false);
        }
    }
    if (checking)
        return (
            <WorkspaceLoader
                label="Opening your workspace"
                detail="Checking your session…"
            />
        );
    if (admin) return <App onLogout={logout} admin={admin} />;
    return (
        <main className="login-shell">
            <section className="login-card">
                <a className="brand" href="/" aria-label="UnSui">
                    <img src="/unsui-mark.svg" alt="" />
                    <b>unsui</b>
                    <span>雲水</span>
                </a>
                <p className="eyebrow">OPERATIONS WORKSPACE</p>
                <h1>Welcome back.</h1>
                <p className="login-intro">Every purchase. Every payout. One place.</p>
                <form onSubmit={submit}>
                    <label htmlFor="login-email">Email address</label>
                    <input
                        id="login-email"
                        type="email"
                        autoComplete="username"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                    />
                    <label htmlFor="login-password">Password</label>
                    <input
                        id="login-password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        aria-invalid={!!error}
                        aria-describedby={error ? 'login-error' : undefined}
                    />
                    {error && (
                        <p id="login-error" className="login-error" role="alert">
                            {error}
                        </p>
                    )}
                    <button className="primary" type="submit" disabled={signingIn}>
                        {signingIn ? 'Signing in…' : 'Sign in'} <ArrowRight size={16} />
                    </button>
                </form>
                <WalletLogin onLogin={setAdmin} />
                <p className="login-note">
                    UnSui hackathon demo · Demo credentials or an authorized wallet open
                    this local workspace. Not an SB Payment account.
                </p>
            </section>
            <p className="login-footer">
                <a href="/">Welcome site</a> · 雲水 · Clouds & water
            </p>
        </main>
    );
}
