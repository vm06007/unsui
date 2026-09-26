import { useState } from 'react';
import { createThirdwebClient } from 'thirdweb';
import { ThirdwebProvider, useConnectModal, useDisconnect } from 'thirdweb/react';
import { createWallet } from 'thirdweb/wallets';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Wallet } from 'lucide-react';
export const ADMIN_ADDRESS = '0x22079A848266A7D2E40CF0fF71a6573D78adcF37';
export type Admin = { email: string; address: string; role: string; method: string };
export async function authRequest(action: string, body?: object) {
    const response = await fetch('/api/auth/' + action, {
        method: body ? 'POST' : 'GET',
        headers: {
            'Content-Type': 'application/json',
            Authorization:
                'Bearer ' + (sessionStorage.getItem('unsui-ops-token') || ''),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const text = await response.text();
    let result: { error?: string; token: string; user: Admin; message: string; nonce: string };
    try {
        result = JSON.parse(text);
    } catch {
        throw Error('Sign-in service is unavailable.');
    }
    if (!response.ok) throw Error(result.error || 'Please sign in again.');
    return result;
}
export function saveSession(result: { token: string; user: Admin }) {
    sessionStorage.setItem('unsui-ops-token', result.token);
    return result.user;
}
const clientId = import.meta.env.VITE_THIRDWEB_CLIENT_ID;
const client = clientId ? createThirdwebClient({ clientId }) : null;
const wallets = [
    createWallet('io.rabby'),
    createWallet('io.metamask'),
    createWallet('com.coinbase.wallet'),
];
const queries = new QueryClient();
export function WalletProviders({ children }: { children: React.ReactNode }) {
    return (
        <QueryClientProvider client={queries}>
            <ThirdwebProvider>{children}</ThirdwebProvider>
        </QueryClientProvider>
    );
}
export function WalletLogin({ onLogin }: { onLogin: (admin: Admin) => void }) {
    const { connect, isConnecting } = useConnectModal(),
        { disconnect } = useDisconnect();
    const [busy, setBusy] = useState(false),
        [error, setError] = useState('');
    async function login() {
        if (!client) return;
        setError('');
        setBusy(true);
        let wallet;
        try {
            wallet = await connect({
                client,
                wallets,
                title: 'UnSui admin sign-in',
                appMetadata: {
                    name: 'UnSui Operations',
                    url: location.origin,
                    description: 'UnSui operations workspace',
                },
                showThirdwebBranding: false,
            });
            const account = wallet.getAccount();
            if (!account) throw Error('No wallet account connected.');
            if (account.address.toLowerCase() !== ADMIN_ADDRESS.toLowerCase())
                throw Error(
                    'This wallet is not the configured admin. Switch to ' +
                        ADMIN_ADDRESS +
                        '.',
                );
            const challenge = await authRequest('challenge', {
                address: account.address,
            });
            const signature = await account.signMessage({ message: challenge.message });
            const result = await authRequest('verify', {
                nonce: challenge.nonce,
                signature,
            });
            onLogin(saveSession(result));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Wallet sign-in was cancelled.');
        } finally {
            if (wallet) disconnect(wallet);
            setBusy(false);
        }
    }
    return (
        <>
            <div className="login-or">
                <span />
                OR
                <span />
            </div>
            <button
                className="secondary wallet-login"
                type="button"
                disabled={busy || isConnecting || !client}
                onClick={login}
            >
                <Wallet size={17} />
                {busy ? 'Waiting for wallet…' : 'Sign in with wallet'}
            </button>
            <p className="wallet-hint">
                Admin wallet · {ADMIN_ADDRESS.slice(0, 8)}…{ADMIN_ADDRESS.slice(-6)}
                <br />
                Linked to vitalik@bitcoin.com
            </p>
            {!client && <p role="alert">Wallet login needs a Thirdweb client ID.</p>}
            {error && (
                <p role="alert" className="login-error">
                    {error}
                </p>
            )}
        </>
    );
}
