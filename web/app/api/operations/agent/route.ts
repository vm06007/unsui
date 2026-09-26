import { readSession } from '@/lib/ops-auth';
import { createDashboardAgent } from '../../../../../server/dashboard-agent.cjs';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  const token = (request.headers.get('authorization') || '').replace(
    /^Bearer /,
    '',
  );
  if (!(await readSession(token))) {
    return Response.json({ error: 'Please sign in again.' }, { status: 401 });
  }
  if (!process.env.OPENROUTER_API_KEY) {
    return Response.json(
      {
        error:
          'The assistant is not configured on this deployment yet. No settings were changed.',
      },
      { status: 503 },
    );
  }
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).length > 24000) {
      return Response.json(
        { error: 'Assistant request too large.' },
        { status: 413 },
      );
    }
    const chat = createDashboardAgent();
    return Response.json(await chat(JSON.parse(text)), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'The assistant could not complete this request.',
      },
      { status: 400 },
    );
  }
}
