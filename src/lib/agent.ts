// Agente do FORGE sobre o Claude Agent SDK, autenticado pela assinatura do dono
// (login do Claude Code local ou CLAUDE_CODE_OAUTH_TOKEN). Nunca usa chave de API.
// As ferramentas leem uma cópia do estado enviada pelo aparelho e devolvem comandos
// validados; quem aplica e sincroniza é o próprio app, pelo mesmo fluxo dos botões.
import { tmpdir } from 'node:os';
import { z } from 'zod';
import {
  createSdkMcpServer,
  query,
  tool,
  type SDKRateLimitInfo,
} from '@anthropic-ai/claude-agent-sdk';
import {
  applyCommand,
  categories,
  dayInZone,
  financeTotals,
  makeCommand,
  money,
  shiftDay,
  stats,
  type AppState,
  type Command,
} from './domain';
import type { AgentEvent, AgentUsage, ChatTurn } from './agent-schema';

const labels: Record<string, string> = {
  resumo: 'Lendo seu painel',
  transacoes: 'Consultando transações',
  historico_habitos: 'Olhando seu histórico',
  criar_habito: 'Criando hábito',
  editar_habito: 'Ajustando hábito',
  marcar_habito: 'Marcando hábito',
  arquivar_habito: 'Arquivando hábito',
  criar_tarefa: 'Criando tarefa',
  marcar_tarefa: 'Atualizando tarefa',
  criar_meta: 'Criando meta',
  progresso_meta: 'Atualizando meta',
  arquivar_meta: 'Arquivando meta',
  registrar_transacao: 'Registrando transação',
  apagar_transacao: 'Apagando transação',
  lembrar: 'Guardando na memória',
  esquecer: 'Apagando da memória',
};

function overview(s: AppState) {
  const st = stats(s),
    month = st.day.slice(0, 7),
    f = financeTotals(s, month),
    week = Array.from({ length: 7 }, (_, i) => shiftDay(st.day, -i));
  return {
    hoje: st.day,
    perfil: { nome: s.profile.name, cidade: s.profile.city },
    progresso: {
      nivel: st.level,
      titulo: st.title,
      xpTotal: st.xp,
      xpSemana: st.weekXp,
      sequenciaDias: st.streak,
      ativoHoje: st.activeToday,
    },
    habitos: s.habits
      .filter(h => !h.archived)
      .map(h => ({
        id: h.id,
        nome: h.name,
        xp: h.xp,
        feitoHoje: h.doneDays.includes(st.day),
        diasFeitosUltimos7: week.filter(d => h.doneDays.includes(d)).length,
      })),
    tarefasHoje: s.tasks
      .filter(t => t.date === st.day)
      .map(t => ({ id: t.id, nome: t.name, feita: t.done })),
    tarefasPendentesAtrasadas: s.tasks
      .filter(t => t.date < st.day && !t.done)
      .slice(-20)
      .map(t => ({ id: t.id, nome: t.name, data: t.date })),
    metas: s.goals
      .filter(g => !g.archived)
      .map(g => ({
        id: g.id,
        nome: g.name,
        categoria: g.category,
        prazo: g.deadline,
        atual: g.current,
        objetivo: g.target,
        unidade: g.unit,
        concluida: g.completed,
      })),
    financasDoMes: {
      mes: month,
      entradas: money(f.income),
      gastos: money(f.expense),
      gastosCartao: money(f.cardSpend),
      gastosPixDebito: money(f.cashSpend),
      saldoEmConta: money(f.balance),
      porCategoria: Object.fromEntries(Object.entries(f.byCategory).map(([c, v]) => [c, money(v)])),
    },
    contasBancarias: s.accounts.map(a => ({
      nome: a.name,
      tipo: a.type,
      saldo: money(a.balanceCents),
    })),
    memoria: (s.memory || []).map(m => ({ id: m.id, texto: m.text, em: m.at.slice(0, 10) })),
  };
}

const ok = (text: string) => ({ content: [{ type: 'text' as const, text }] });
const fail = (text: string) => ({ content: [{ type: 'text' as const, text }], isError: true });
const json = (v: unknown) => ok(JSON.stringify(v));

function forgeServer(initial: AppState, out: Command[]) {
  let state = initial;
  // Executa o comando numa cópia local; se o domínio recusar, o modelo recebe o motivo.
  const run = (type: Command['type'], payload: unknown, done: string) => {
    const cmd = makeCommand(type, payload);
    try {
      state = applyCommand(state, cmd, new Date(cmd.at));
    } catch (e) {
      return fail(
        e instanceof z.ZodError
          ? 'Dados inválidos: ' + e.issues.map(i => i.message).join('; ')
          : e instanceof Error
            ? e.message
            : 'Não foi possível executar.',
      );
    }
    out.push(cmd);
    return ok(`${done} (id ${cmd.id})`);
  };
  const xp = z.union([z.literal(20), z.literal(40), z.literal(60), z.literal(80)]);
  const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
  return createSdkMcpServer({
    name: 'forge',
    version: '1.0.0',
    alwaysLoad: true,
    tools: [
      tool(
        'resumo',
        'Painel completo do usuário: hábitos (com ids), tarefas, metas, finanças do mês, contas e memória salva. Chame antes de responder sobre os dados ou de alterar algo.',
        {},
        async () => json(overview(state)),
        { annotations: { readOnlyHint: true } },
      ),
      tool(
        'transacoes',
        'Lista transações de um mês (AAAA-MM), opcionalmente de uma categoria. Valores em reais.',
        { mes: z.string().regex(/^\d{4}-\d{2}$/), categoria: z.string().optional() },
        async ({ mes, categoria }) =>
          json(
            financeTotals(state, mes)
              .entries.filter(t => !categoria || t.category === categoria)
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 150)
              .map(t => ({
                id: t.id,
                nome: t.name,
                valor: money(t.cents),
                tipo: t.type === 'income' ? 'entrada' : 'gasto',
                categoria: t.category,
                data: t.date,
                origem: t.source === 'pluggy' ? 'banco' : 'manual',
              })),
          ),
        { annotations: { readOnlyHint: true } },
      ),
      tool(
        'historico_habitos',
        'Dias em que cada hábito foi feito nos últimos N dias (máx. 90). Útil para avaliar consistência.',
        { dias: z.number().int().min(1).max(90) },
        async ({ dias }) => {
          const today = dayInZone(state.profile.timezone),
            from = shiftDay(today, -dias + 1);
          return json(
            state.habits
              .filter(h => !h.archived)
              .map(h => ({
                id: h.id,
                nome: h.name,
                dias: h.doneDays.filter(d => d >= from).sort(),
              })),
          );
        },
        { annotations: { readOnlyHint: true } },
      ),
      tool(
        'criar_habito',
        'Cria um hábito diário. xp: 20 (leve), 40, 60 ou 80 (pesado).',
        { nome: z.string(), xp },
        async ({ nome, xp }) => run('habit.create', { name: nome, xp }, 'Hábito criado'),
      ),
      tool(
        'editar_habito',
        'Renomeia um hábito ou muda o XP.',
        { id: z.string(), nome: z.string(), xp },
        async ({ id, nome, xp }) => run('habit.edit', { id, name: nome, xp }, 'Hábito atualizado'),
      ),
      tool(
        'marcar_habito',
        'Marca ou desmarca um hábito como feito hoje.',
        { id: z.string(), feito: z.boolean() },
        async ({ id, feito }) =>
          run('habit.toggle', { id, done: feito }, feito ? 'Hábito marcado' : 'Hábito desmarcado'),
      ),
      tool(
        'arquivar_habito',
        'Arquiva (remove da lista) um hábito. Só use com confirmação explícita do usuário.',
        { id: z.string() },
        async ({ id }) => run('habit.archive', { id }, 'Hábito arquivado'),
        { annotations: { destructiveHint: true } },
      ),
      tool(
        'criar_tarefa',
        'Cria uma tarefa para uma data (AAAA-MM-DD).',
        { nome: z.string(), data: day },
        async ({ nome, data }) => run('task.create', { name: nome, date: data }, 'Tarefa criada'),
      ),
      tool(
        'marcar_tarefa',
        'Marca ou desmarca uma tarefa como concluída.',
        { id: z.string(), feita: z.boolean() },
        async ({ id, feita }) => run('task.toggle', { id, done: feita }, 'Tarefa atualizada'),
      ),
      tool(
        'criar_meta',
        `Cria uma meta. categoria: ${categories.join(', ')}. unidade: %, R$, horas, módulos ou dias. prazo AAAA-MM-DD.`,
        {
          nome: z.string(),
          categoria: z.enum(categories),
          prazo: day,
          objetivo: z.number().positive(),
          unidade: z.enum(['%', 'R$', 'horas', 'módulos', 'dias']),
        },
        async ({ nome, categoria, prazo, objetivo, unidade }) =>
          run(
            'goal.create',
            { name: nome, category: categoria, deadline: prazo, target: objetivo, unit: unidade },
            'Meta criada',
          ),
      ),
      tool(
        'progresso_meta',
        'Define o valor atual de uma meta (mesma unidade do objetivo; não pode passar do objetivo).',
        { id: z.string(), atual: z.number().min(0) },
        async ({ id, atual }) => run('goal.progress', { id, current: atual }, 'Meta atualizada'),
      ),
      tool(
        'arquivar_meta',
        'Arquiva uma meta. Só use com confirmação explícita do usuário.',
        { id: z.string() },
        async ({ id }) => run('goal.archive', { id }, 'Meta arquivada'),
        { annotations: { destructiveHint: true } },
      ),
      tool(
        'registrar_transacao',
        'Registra uma entrada ou gasto manual. valor em reais (ex.: 32.5). Categorias de gasto usadas no app: Comida, Transporte, Estudos, Lazer, Outros.',
        {
          nome: z.string(),
          valor: z.number().positive(),
          tipo: z.enum(['entrada', 'gasto']),
          categoria: z.string(),
          data: day,
        },
        async ({ nome, valor, tipo, categoria, data }) =>
          run(
            'transaction.create',
            {
              name: nome,
              cents: Math.round(valor * 100),
              type: tipo === 'entrada' ? 'income' : 'expense',
              category: categoria,
              date: data,
            },
            'Transação registrada',
          ),
      ),
      tool(
        'apagar_transacao',
        'Apaga uma transação manual. Só use com confirmação explícita do usuário.',
        { id: z.string() },
        async ({ id }) => run('transaction.delete', { id }, 'Transação apagada'),
        { annotations: { destructiveHint: true } },
      ),
      tool(
        'lembrar',
        'Guarda na memória permanente um fato durável sobre o usuário (preferência, contexto de vida, decisão, objetivo de longo prazo). Uma frase curta e autocontida.',
        { texto: z.string() },
        async ({ texto }) => run('memory.save', { text: texto }, 'Guardado na memória'),
      ),
      tool(
        'esquecer',
        'Apaga uma anotação da memória pelo id.',
        { id: z.string() },
        async ({ id }) => run('memory.forget', { id }, 'Removido da memória'),
      ),
    ],
  });
}

function systemPrompt(s: AppState) {
  const name = s.profile.name || 'o usuário';
  return `Você é o FORGE, o agente pessoal dentro do app FORGE de ${name}. O app acompanha hábitos, tarefas, metas (com XP e níveis) e finanças.

Você tem dois papéis:
1. Operar o app: consultar dados e fazer ajustes com as ferramentas do servidor "forge" (criar/editar/marcar hábitos e tarefas, criar e atualizar metas, registrar transações, gerenciar a memória).
2. Conselheiro: ajudar ${name} a decidir o que priorizar, analisar consistência dos hábitos, ritmo das metas e gastos, e dizer com franqueza quando algo não está funcionando.

Como trabalhar:
- Antes de falar dos dados ou alterar algo, chame "resumo" para ver o estado atual e os ids. Nunca invente números.
- Faça as alterações pedidas direto, sem pedir confirmação. Para arquivar ou apagar, confirme antes, a menos que o pedido já seja explícito.
- A memória aparece em "resumo". Quando surgir um fato durável sobre ${name} (preferência, rotina, objetivo de longo prazo, decisão), salve com "lembrar". Não salve coisas passageiras.
- Datas no formato AAAA-MM-DD, no fuso ${s.profile.timezone}. Valores em reais.
- Depois de alterar, diga em uma linha o que mudou.

Tom: português brasileiro informal, direto e técnico. Respostas curtas, pensadas para a tela do celular (poucos parágrafos, listas curtas quando ajudar). Sem tom de coach, sem frases de efeito, sem construções do tipo "não é X, é Y". Discorde quando houver razão e elogie quando a ideia for boa. Você não é consultor financeiro licenciado: em finanças, fale de organização e hábitos de gasto, sem recomendar investimentos específicos.`;
}

function transcript(turns: ChatTurn[], name: string) {
  const last = turns[turns.length - 1],
    earlier = turns.slice(0, -1);
  const history = earlier
    .map(t => `${t.role === 'user' ? name || 'Usuário' : 'FORGE'}: ${t.text}`)
    .join('\n\n');
  return history
    ? `<conversa_anterior>\n${history}\n</conversa_anterior>\n\n${last.text}`
    : last.text;
}

// A assinatura informa o uso das janelas em fração (0–1) e o horário de renovação, não
// um total de tokens. `unifiedWindows` chega junto do evento, mas ainda não está tipado.
type Window = { utilization?: number; resetsAt?: number };
function windows(info: SDKRateLimitInfo) {
  const unified = (info as { unifiedWindows?: Record<string, Window> }).unifiedWindows || {},
    pick = (w?: Window) =>
      w && typeof w.utilization === 'number'
        ? {
            percent: Math.round(w.utilization * 100),
            resetsAt: w.resetsAt ? new Date(w.resetsAt * 1000).toISOString() : undefined,
          }
        : undefined;
  return {
    fiveHour:
      pick(unified.five_hour) ||
      (info.rateLimitType === 'five_hour'
        ? pick({ utilization: info.utilization, resetsAt: info.resetsAt })
        : undefined),
    week: pick(unified.seven_day),
  };
}

const authMessages: Record<string, string> = {
  authentication_failed:
    'O servidor do agente não está logado na sua conta do Claude. Rode "claude setup-token" e configure CLAUDE_CODE_OAUTH_TOKEN.',
  oauth_org_not_allowed: 'Esta conta do Claude não pode usar o agente.',
  billing_error: 'Sua assinatura do Claude não está ativa.',
  rate_limit: 'Você atingiu o limite de uso da sua assinatura do Claude. Tente mais tarde.',
  overloaded: 'O Claude está sobrecarregado agora. Tente de novo em instantes.',
};

export async function* runAgent(
  turns: ChatTurn[],
  state: AppState,
  signal?: AbortSignal,
): AsyncGenerator<AgentEvent> {
  const commands: Command[] = [],
    server = forgeServer(state, commands),
    abort = new AbortController();
  signal?.addEventListener('abort', () => abort.abort());
  // Força a assinatura: sem chave de API mesmo que exista no ambiente.
  const env: Record<string, string | undefined> = {
    ...process.env,
    ANTHROPIC_API_KEY: undefined,
    ANTHROPIC_AUTH_TOKEN: undefined,
    CLAUDE_AGENT_SDK_CLIENT_APP: 'forge/0.1',
  };
  if (process.env.FORGE_AGENT_CONFIG_DIR)
    env.CLAUDE_CONFIG_DIR = process.env.FORGE_AGENT_CONFIG_DIR;
  let textBlocks = 0;
  const usage: AgentUsage = {};
  try {
    for await (const m of query({
      prompt: transcript(turns, state.profile.name),
      options: {
        systemPrompt: systemPrompt(state),
        model: process.env.FORGE_AGENT_MODEL || 'claude-opus-5',
        effort: 'medium',
        tools: [],
        mcpServers: { forge: server },
        allowedTools: Object.keys(labels).map(n => 'mcp__forge__' + n),
        permissionMode: 'dontAsk',
        settingSources: [],
        strictMcpConfig: true,
        persistSession: false,
        includePartialMessages: true,
        maxTurns: 16,
        cwd: tmpdir(),
        env,
        abortController: abort,
      },
    })) {
      if (m.type === 'stream_event' && !m.parent_tool_use_id) {
        const e = m.event;
        if (e.type === 'content_block_start' && e.content_block.type === 'text' && textBlocks++)
          yield { type: 'text', text: '\n\n' };
        else if (e.type === 'content_block_start' && e.content_block.type === 'tool_use') {
          const name = e.content_block.name.replace('mcp__forge__', '');
          yield { type: 'tool', label: labels[name] || 'Trabalhando' };
        } else if (e.type === 'content_block_delta' && e.delta.type === 'text_delta')
          yield { type: 'text', text: e.delta.text };
      } else if (m.type === 'assistant' && m.error) {
        yield {
          type: 'error',
          message: authMessages[m.error] || 'O Claude não conseguiu responder agora.',
        };
      } else if (m.type === 'rate_limit_event') {
        const w = windows(m.rate_limit_info);
        if (w.fiveHour) usage.fiveHour = w.fiveHour;
        if (w.week) usage.week = w.week;
      } else if (m.type === 'result') {
        usage.tokens = Object.values(m.modelUsage || {}).reduce(
          (s, u) =>
            s +
            u.inputTokens +
            u.outputTokens +
            u.cacheReadInputTokens +
            u.cacheCreationInputTokens,
          0,
        );
      }
      if (m.type === 'result' && m.subtype !== 'success') {
        yield {
          type: 'error',
          message:
            m.subtype === 'error_max_turns'
              ? 'Parei no meio: a tarefa ficou longa demais. Peça em partes.'
              : 'O Claude não conseguiu concluir a resposta.',
        };
      }
    }
  } catch (e) {
    if (!abort.signal.aborted)
      yield {
        type: 'error',
        message:
          e instanceof Error && /auth|login|credential/i.test(e.message)
            ? authMessages.authentication_failed
            : 'Não foi possível falar com o Claude agora.',
      };
  }
  if (commands.length) yield { type: 'commands', commands };
  if (usage.fiveHour || usage.tokens) yield { type: 'usage', usage };
  yield { type: 'done' };
}

export function ndjsonStream(events: AsyncGenerator<AgentEvent>) {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { value, done } = await events.next();
      if (done) controller.close();
      else controller.enqueue(encoder.encode(JSON.stringify(value) + '\n'));
    },
    async cancel() {
      await events.return(undefined);
    },
  });
}
