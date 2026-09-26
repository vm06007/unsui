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
  try {
    const response = await fetch(new URL('/api/mobile/dashboard-feed', request.url), {
      cache: 'no-store', signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw Error('Ledger unavailable');
    const data: unknown = await response.json();
    if (
      typeof data !== 'object' ||
      data === null ||
      !('records' in data) ||
      !Array.isArray(data.records)
    ) {
      throw Error('Invalid ledger response');
    }
    return Response.json({ records: data.records, treasury: null, multibaas: null }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return Response.json({ error: 'The live app ledger is temporarily unavailable.' }, {
      status: 503, headers: { 'Cache-Control': 'no-store' },
    });
  }
}
