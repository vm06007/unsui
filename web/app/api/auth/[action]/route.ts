import {
    createChallenge,
    passwordLogin,
    readSession,
    verifyChallenge,
} from '@/lib/ops-auth';

export const dynamic = 'force-dynamic';

function json(status: number, data: object) {
    return Response.json(data, { status });
}

async function actionOf(context: { params: Promise<{ action: string }> }) {
    return (await context.params).action;
}

function tokenOf(request: Request) {
    return (request.headers.get('authorization') || '').replace(/^Bearer /, '');
}

export async function GET(
    request: Request,
    context: { params: Promise<{ action: string }> },
) {
    if ((await actionOf(context)) !== 'session') return json(404, { error: 'Not found' });
    const user = await readSession(tokenOf(request));
    if (!user) return json(401, { error: 'Please sign in again.' });
    return json(200, { user });
}

export async function POST(
    request: Request,
    context: { params: Promise<{ action: string }> },
) {
    const action = await actionOf(context);
    if (action === 'logout') return json(200, { ok: true });
    try {
        const body = (await request.json().catch(() => ({}))) as {
            email?: string;
            password?: string;
            address?: string;
            nonce?: string;
            signature?: string;
        };
        const origin = request.headers.get('origin') || '';
        if (action === 'password' || action === 'demo') {
            return json(
                200,
                await passwordLogin(
                    action === 'demo' ? 'vitalik@bitcoin.com' : body.email,
                    action === 'demo' ? 'ethglobal2026' : body.password,
                ),
            );
        }
        if (action === 'challenge') {
            return json(200, await createChallenge(body.address, origin));
        }
        if (action === 'verify') {
            return json(200, await verifyChallenge(body.nonce, body.signature, origin));
        }
        return json(404, { error: 'Not found' });
    } catch (error) {
        return json(401, {
            error: error instanceof Error ? error.message : 'Please sign in again.',
        });
    }
}
