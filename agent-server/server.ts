// Serviço do agente para hospedagens onde o binário do Claude Code cabe (Docker, VPS).
// O app na Vercel autentica o usuário e repassa a conversa com FORGE_AGENT_SECRET.
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { timingSafeEqual } from 'node:crypto';
import { runAgent, ndjsonStream } from '../src/lib/agent';
import { chatSchema } from '../src/lib/agent-schema';
import type { AppState } from '../src/lib/domain';

const secret = process.env.FORGE_AGENT_SECRET || '',
  port = Number(process.env.PORT || 8787);
if (secret.length < 32) throw Error('Defina FORGE_AGENT_SECRET com pelo menos 32 caracteres.');

function authorized(header: string | undefined) {
  const a = Buffer.from(header || ''),
    b = Buffer.from('Bearer ' + secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') return res.end('ok');
  if (req.method !== 'POST' || req.url !== '/chat') return res.writeHead(404).end();
  if (!authorized(req.headers.authorization)) return res.writeHead(401).end();
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 3_000_000) return res.writeHead(413).end();
    chunks.push(chunk);
  }
  let body;
  try {
    body = chatSchema.parse(JSON.parse(Buffer.concat(chunks).toString()));
  } catch {
    return res.writeHead(400).end();
  }
  const abort = new AbortController();
  res.on('close', () => abort.abort());
  res.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8' });
  Readable.fromWeb(
    ndjsonStream(runAgent(body.turns, body.state as unknown as AppState, abort.signal)) as never,
  ).pipe(res);
}).listen(port, () => console.log(`Agente do FORGE na porta ${port}`));
