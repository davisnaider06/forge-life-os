import { requireUser, fail, sameOrigin, jsonBody, HttpError } from '@/lib/server';
import { chatSchema } from '@/lib/agent-schema';
import type { AppState } from '@/lib/domain';

export const maxDuration = 300;

// O agente consome a assinatura do Claude do dono: só contas na lista podem usar.
function allowed(email: string | undefined) {
  const list = (process.env.FORGE_AGENT_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return Boolean(email && list.includes(email.toLowerCase()));
}

export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const user = await requireUser();
    if (!allowed(user.email))
      throw new HttpError(403, 'O agente do FORGE não está liberado para esta conta.');
    const body = chatSchema.parse(await jsonBody(req, 3_000_000));
    const headers = { 'Content-Type': 'application/x-ndjson; charset=utf-8' };
    // Na Vercel o binário do Claude Code não cabe na função; o agente roda num serviço à parte.
    if (process.env.FORGE_AGENT_URL) {
      const upstream = await fetch(new URL('/chat', process.env.FORGE_AGENT_URL), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + (process.env.FORGE_AGENT_SECRET || ''),
        },
        body: JSON.stringify(body),
        signal: req.signal,
      }).catch(() => null);
      if (!upstream?.ok || !upstream.body)
        throw new HttpError(502, 'O servidor do agente não respondeu.');
      return new Response(upstream.body, { headers });
    }
    const { runAgent, ndjsonStream } = await import('@/lib/agent');
    return new Response(
      ndjsonStream(runAgent(body.turns, body.state as unknown as AppState, req.signal)),
      { headers },
    );
  } catch (e) {
    return fail(e);
  }
}
