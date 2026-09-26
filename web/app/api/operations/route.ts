import { readSession } from '@/lib/ops-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const token = (request.headers.get('authorization') || '').replace(
    /^Bearer /,
    '',
  );
  if (!(await readSession(token))) {
    return Response.json({ error: 'Please sign in again.' }, { status: 401 });
  }
  return Response.json(
    { error: 'The live app ledger is not connected to this deployment.' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
