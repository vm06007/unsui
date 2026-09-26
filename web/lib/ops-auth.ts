const ADMIN_ADDRESS = '0x22079A848266A7D2E40CF0fF71a6573D78adcF37';
const ADMIN_EMAIL = 'vitalik@bitcoin.com';
const DEMO_PASSWORD = 'ethglobal2026';
const SECRET = process.env.UNSUI_AUTH_SECRET || 'unsui-ethglobal-2026-demo';

export type OpsUser = {
    email: string;
    address: string;
    role: string;
    method: string;
};

type SessionPayload = OpsUser & { exp: number; kind: 'session' };
type ChallengePayload = {
    kind: 'challenge';
    message: string;
    origin: string;
    exp: number;
};

function bytesToHex(bytes: ArrayBuffer) {
    return [...new Uint8Array(bytes)]
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
}

function hexToBytes(hex: string) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
}

async function mac(value: string) {
    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
    );
    return bytesToHex(
        await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)),
    );
}

function encode(payload: object) {
    return btoa(JSON.stringify(payload))
        .replaceAll('+', '-')
        .replaceAll('/', '_')
        .replaceAll('=', '');
}

function decode(value: string) {
    const padded = value.replaceAll('-', '+').replaceAll('_', '/');
    return JSON.parse(atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), '=')));
}

async function sign(payload: object) {
    const body = encode(payload);
    return body + '.' + (await mac(body));
}

async function open<T>(token: string): Promise<T | null> {
    const [body, signature] = token.split('.');
    if (!body || !signature || signature.length !== 64) return null;
    const expected = hexToBytes(await mac(body));
    const actual = hexToBytes(signature);
    if (expected.length !== actual.length) return null;
    let mismatch = 0;
    for (let i = 0; i < expected.length; i++) mismatch |= expected[i] ^ actual[i];
    if (mismatch !== 0) return null;
    try {
        const payload = decode(body) as T & { exp: number };
        if (!payload.exp || payload.exp <= Date.now()) return null;
        return payload;
    } catch {
        return null;
    }
}

function same(left: string, right: string) {
    const a = new TextEncoder().encode(left);
    const b = new TextEncoder().encode(right);
    if (a.length !== b.length) return false;
    let mismatch = 0;
    for (let i = 0; i < a.length; i++) mismatch |= a[i] ^ b[i];
    return mismatch === 0;
}

function identity(method: string): OpsUser {
    return {
        email: ADMIN_EMAIL,
        address: ADMIN_ADDRESS,
        role: 'admin',
        method,
    };
}

export async function issueSession(method: string) {
    const user = identity(method);
    const exp = Date.now() + 8 * 3600000;
    const token = await sign({ ...user, exp, kind: 'session' } satisfies SessionPayload);
    return { token, user };
}

export async function readSession(token: string) {
    const payload = await open<SessionPayload>(token);
    if (!payload || payload.kind !== 'session') return null;
    return {
        email: payload.email,
        address: payload.address,
        role: payload.role,
        method: payload.method,
    } satisfies OpsUser;
}

export async function passwordLogin(email: unknown, password: unknown) {
    if (
        typeof email !== 'string' ||
        typeof password !== 'string' ||
        email.trim() !== ADMIN_EMAIL ||
        !same(password, DEMO_PASSWORD)
    ) {
        throw Error('The email or password is incorrect.');
    }
    return issueSession('demo');
}

export async function createChallenge(address: unknown, origin: string) {
    if (
        typeof address !== 'string' ||
        address.toLowerCase() !== ADMIN_ADDRESS.toLowerCase()
    ) {
        throw Error('This wallet is not authorized for the UnSui admin workspace.');
    }
    const exp = Date.now() + 300000;
    const message = [
        'UnSui Operations admin sign-in',
        'Origin: ' + origin,
        'Wallet: ' + ADMIN_ADDRESS,
        'Account: ' + ADMIN_EMAIL,
        'Nonce: pending',
        'Issued: ' + new Date().toISOString(),
        'Expires: ' + new Date(exp).toISOString(),
        'This signature signs you in. It does not authorize a transaction.',
    ].join('\n');
    const nonce = await sign({
        kind: 'challenge',
        message,
        origin,
        exp,
    } satisfies ChallengePayload);
    const signedMessage = message.replace('Nonce: pending', 'Nonce: ' + nonce);
    return { nonce, message: signedMessage };
}

export async function verifyChallenge(
    nonce: unknown,
    signature: unknown,
    origin: string,
) {
    if (typeof nonce !== 'string' || typeof signature !== 'string') {
        throw Error('Login request expired. Please reconnect and try again.');
    }
    const challenge = await open<ChallengePayload>(nonce);
    if (!challenge || challenge.kind !== 'challenge' || challenge.origin !== origin) {
        throw Error('Login request expired. Please reconnect and try again.');
    }
    const { verifyMessage } = await import('viem');
    const valid = await verifyMessage({
        address: ADMIN_ADDRESS,
        message: challenge.message.replace('Nonce: pending', 'Nonce: ' + nonce),
        signature: signature as `0x${string}`,
    });
    if (!valid) throw Error('Wallet signature could not be verified.');
    return issueSession('wallet');
}

export const DEMO_LOGIN = {
    email: ADMIN_EMAIL,
    password: DEMO_PASSWORD,
};
