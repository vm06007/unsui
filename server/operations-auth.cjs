const { randomBytes, timingSafeEqual } = require('node:crypto');

const ADMIN_ADDRESS = '0x22079A848266A7D2E40CF0fF71a6573D78adcF37';
const ADMIN_EMAIL = 'vitalik@bitcoin.com';

function equal(left, right) {
    return (
        typeof left === 'string' &&
        left.length === right.length &&
        timingSafeEqual(Buffer.from(left), Buffer.from(right))
    );
}

function createOperationsAuth({
    adminAddress = ADMIN_ADDRESS,
    now = Date.now,
} = {}) {
    const challenges = new Map();
    const sessions = new Map();
    const identity = {
        email: ADMIN_EMAIL,
        address: adminAddress,
        role: 'admin',
    };

    function cleanup() {
        for (const map of [challenges, sessions]) {
            for (const [key, value] of map) {
                if (value.expires <= now()) map.delete(key);
            }
        }
    }

    function issue(method) {
        cleanup();
        const token = randomBytes(32).toString('hex');
        const expires = now() + 8 * 3600000;
        sessions.set(token, { ...identity, method, expires });
        return { token, user: { ...identity, method }, expires };
    }

    return {
        session(token) {
            cleanup();
            return sessions.get(token) || null;
        },
        logout(token) {
            sessions.delete(token);
        },
        password(email, password) {
            if (email?.trim() !== ADMIN_EMAIL || !equal(password, 'ethglobal2026')) {
                throw Error('The email or password is incorrect.');
            }
            return issue('demo');
        },
        challenge(address, origin) {
            cleanup();
            if (
                typeof address !== 'string' ||
                address.toLowerCase() !== adminAddress.toLowerCase()
            ) {
                throw Error(
                    'This wallet is not authorized for the UnSui admin workspace.',
                );
            }
            const nonce = randomBytes(24).toString('hex');
            const expires = now() + 300000;
            const message = [
                'UnSui Operations admin sign-in',
                'Origin: ' + origin,
                'Wallet: ' + adminAddress,
                'Account: ' + ADMIN_EMAIL,
                'Nonce: ' + nonce,
                'Issued: ' + new Date(now()).toISOString(),
                'Expires: ' + new Date(expires).toISOString(),
                'This signature signs you in. It does not authorize a transaction.',
            ].join('\n');
            challenges.set(nonce, { message, origin, expires });
            return { nonce, message };
        },
        async verify(nonce, signature, origin) {
            cleanup();
            const challenge = challenges.get(nonce);
            challenges.delete(nonce);
            if (!challenge || challenge.origin !== origin) {
                throw Error('Login request expired. Please reconnect and try again.');
            }
            const { verifyMessage } = await import('viem');
            const valid = await verifyMessage({
                address: adminAddress,
                message: challenge.message,
                signature,
            });
            if (!valid) throw Error('Wallet signature could not be verified.');
            return issue('wallet');
        },
    };
}

async function readAuthBody(req) {
    let body = '';
    for await (const chunk of req) {
        body += chunk;
        if (body.length > 4096) throw Error('Request too large.');
    }
    return JSON.parse(body || '{}');
}

module.exports = { createOperationsAuth, readAuthBody, ADMIN_EMAIL };
