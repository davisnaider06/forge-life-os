'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useForge } from './store';
import { Icon } from './visuals';
import type { AgentEvent, AgentUsage, ChatTurn } from '@/lib/agent-schema';

type Message = ChatTurn & { changes?: number; error?: boolean };
const suggestions = [
  'Como está minha semana?',
  'O que devo priorizar hoje?',
  'Onde estou gastando mais este mês?',
  'Cria uma tarefa para amanhã',
];

function inline(text: string) {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? (
        <strong key={i}>{part.slice(2, -2)}</strong>
      ) : (
        part
      ),
    );
}
// Markdown mínimo (parágrafos, listas e negrito) renderizado como React, sem HTML bruto.
function Rich({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length)
      blocks.push(
        <ul key={blocks.length}>
          {list.map((item, i) => (
            <li key={i}>{inline(item)}</li>
          ))}
        </ul>,
      );
    list = [];
  };
  for (const line of text.split('\n')) {
    const item = line.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)$/);
    if (item) list.push(item[1]);
    else {
      flush();
      if (line.trim()) blocks.push(<p key={blocks.length}>{inline(line.replace(/^#+\s*/, ''))}</p>);
    }
  }
  flush();
  return <>{blocks}</>;
}

export function AgentChat({ open, close }: { open: boolean; close: () => void }) {
  const { state, demo, capabilities, applyCommands, dispatch, notify, storageKey } = useForge(),
    dialog = useRef<HTMLDialogElement>(null),
    list = useRef<HTMLDivElement>(null),
    input = useRef<HTMLTextAreaElement>(null),
    abort = useRef<AbortController | null>(null),
    [messages, setMessages] = useState<Message[]>([]),
    [draft, setDraft] = useState(''),
    [status, setStatus] = useState(''),
    [busy, setBusy] = useState(false),
    [showMemory, setShowMemory] = useState(false),
    [usage, setUsage] = useState<(AgentUsage & { at: string }) | null>(null),
    chatKey = storageKey + '.chat',
    usageKey = storageKey + '.usage',
    memory = state.memory || [],
    unavailable = demo
      ? 'O agente não funciona no modo demonstração.'
      : !capabilities.user
        ? 'Entre na sua conta para conversar com o agente do FORGE.'
        : '';

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(chatKey) || '[]');
      setMessages(Array.isArray(saved) ? saved : []);
    } catch {
      setMessages([]);
    }
  }, [chatKey]);
  useEffect(() => {
    try {
      setUsage(JSON.parse(localStorage.getItem(usageKey) || 'null'));
    } catch {
      setUsage(null);
    }
  }, [usageKey]);
  useEffect(() => {
    if (busy) return;
    try {
      localStorage.setItem(chatKey, JSON.stringify(messages.slice(-40)));
    } catch {
      /* Histórico do chat é conveniência; o app segue sem ele. */
    }
  }, [messages, busy, chatKey]);
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches)
        import('gsap').then(({ gsap }) => {
          if (d.open)
            gsap.fromTo(
              d,
              { y: 80, opacity: 0 },
              { y: 0, opacity: 1, duration: 0.42, ease: 'power3.out', clearProps: 'transform' },
            );
        });
    } else if (!open && d.open) d.close();
  }, [open]);
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [messages, status, open]);
  useEffect(() => () => abort.current?.abort(), []);

  async function send(text: string) {
    text = text.trim();
    if (!text || busy || unavailable) return;
    const turns: ChatTurn[] = [
      ...messages.filter(m => !m.error).map(({ role, text }) => ({ role, text })),
      { role: 'user' as const, text },
    ].slice(-20);
    setMessages(m => [...m, { role: 'user', text }, { role: 'assistant', text: '' }]);
    setDraft('');
    setBusy(true);
    setStatus('Pensando');
    const controller = new AbortController();
    abort.current = controller;
    const patch = (fn: (m: Message) => Message) =>
      setMessages(all => [...all.slice(0, -1), fn(all[all.length - 1])]);
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turns, state }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw Error(body.error || 'O agente não respondeu.');
      }
      const reader = res.body.getReader(),
        decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          const e = JSON.parse(line) as AgentEvent;
          if (e.type === 'text') {
            setStatus('');
            patch(m => ({ ...m, text: m.text + e.text }));
          } else if (e.type === 'tool') setStatus(e.label);
          else if (e.type === 'usage') {
            const next = { ...e.usage, at: new Date().toISOString() };
            setUsage(next);
            try {
              localStorage.setItem(usageKey, JSON.stringify(next));
            } catch {
              /* O medidor volta a aparecer na próxima resposta. */
            }
          } else if (e.type === 'commands') {
            const n = applyCommands(e.commands);
            if (n) {
              patch(m => ({ ...m, changes: (m.changes || 0) + n }));
              notify(
                n === 1 ? '1 alteração aplicada no app.' : `${n} alterações aplicadas no app.`,
              );
            }
          } else if (e.type === 'error')
            patch(m => ({
              ...m,
              text: m.text ? m.text + '\n\n' + e.message : e.message,
              error: !m.text,
            }));
        }
      }
    } catch (e) {
      if (!controller.signal.aborted)
        patch(m => ({
          ...m,
          text: e instanceof Error ? e.message : 'O agente não respondeu.',
          error: true,
        }));
    } finally {
      setMessages(all =>
        all[all.length - 1]?.role === 'assistant' && !all[all.length - 1].text
          ? [
              ...all.slice(0, -1),
              { role: 'assistant', text: 'Resposta interrompida.', error: true },
            ]
          : all,
      );
      setBusy(false);
      setStatus('');
      abort.current = null;
    }
  }

  return (
    <dialog
      className="agent-sheet"
      ref={dialog}
      onCancel={e => {
        e.preventDefault();
        close();
      }}
      aria-label="Agente do FORGE"
    >
      <header className="agent-header">
        <span className="agent-orb" aria-hidden="true" />
        <div>
          <strong>FORGE</strong>
          <small>{busy ? status || 'Escrevendo' : 'Agente e conselheiro'}</small>
        </div>
        <button
          className={'agent-chip ' + (showMemory ? 'active' : '')}
          onClick={() => setShowMemory(v => !v)}
          aria-pressed={showMemory}
        >
          Memória {memory.length ? `· ${memory.length}` : ''}
        </button>
        <button className="agent-close" onClick={close} aria-label="Fechar chat">
          ×
        </button>
      </header>
      {showMemory && (
        <section className="agent-memory" aria-label="Memória do agente">
          {memory.length ? (
            memory
              .slice()
              .reverse()
              .map(m => (
                <div key={m.id} className="agent-memory-row">
                  <span>{m.text}</span>
                  <button
                    onClick={() => dispatch('memory.forget', { id: m.id })}
                    aria-label={'Esquecer: ' + m.text}
                  >
                    ×
                  </button>
                </div>
              ))
          ) : (
            <p>
              Nada guardado ainda. Conte suas preferências e objetivos: o agente anota o que for
              durável.
            </p>
          )}
        </section>
      )}
      <div className="agent-messages" ref={list} aria-live="polite">
        {!messages.length && (
          <div className="agent-empty">
            <h2>Em que posso ajudar{state.profile.name ? `, ${state.profile.name}` : ''}?</h2>
            <p>Consulto seus dados, ajusto hábitos, metas e finanças, e digo o que acho.</p>
            <div className="agent-suggestions">
              {suggestions.map(s => (
                <button key={s} onClick={() => void send(s)} disabled={Boolean(unavailable)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`agent-bubble ${m.role} ${m.error ? 'error' : ''} ${
              busy && i === messages.length - 1 ? 'live' : ''
            }`}
          >
            {m.text ? (
              <Rich text={m.text} />
            ) : (
              <span className="agent-typing" aria-label={status || 'Pensando'}>
                <i />
                <i />
                <i />
                {status && <em>{status}</em>}
              </span>
            )}
            {m.changes ? (
              <small className="agent-changes">
                <Icon name="check" />
                {m.changes === 1 ? '1 alteração no app' : `${m.changes} alterações no app`}
              </small>
            ) : null}
          </div>
        ))}
        {busy && status && messages[messages.length - 1]?.text && (
          <span className="agent-status">{status}…</span>
        )}
      </div>
      {unavailable && <p className="agent-unavailable">{unavailable}</p>}
      <form
        className="agent-composer"
        onSubmit={e => {
          e.preventDefault();
          void send(draft);
        }}
      >
        {messages.length > 0 && !busy && (
          <button
            type="button"
            className="agent-clear"
            onClick={() => setMessages([])}
            aria-label="Limpar conversa"
          >
            <Icon name="plus" />
          </button>
        )}
        <textarea
          ref={input}
          value={draft}
          rows={1}
          placeholder="Pergunte ou peça um ajuste…"
          aria-label="Mensagem para o agente"
          disabled={Boolean(unavailable)}
          onChange={e => {
            setDraft(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey && !matchMedia('(pointer: coarse)').matches) {
              e.preventDefault();
              void send(draft);
            }
          }}
        />
        {busy ? (
          <button
            type="button"
            className="agent-send stop"
            onClick={() => abort.current?.abort()}
            aria-label="Parar resposta"
          >
            <i />
          </button>
        ) : (
          <button
            className="agent-send"
            disabled={!draft.trim() || Boolean(unavailable)}
            aria-label="Enviar"
          >
            <Icon name="send" />
          </button>
        )}
      </form>
      <UsageMeter usage={usage} />
    </dialog>
  );
}

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const tokens = (n: number) =>
  n < 1000
    ? `${n} tokens`
    : `${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil tokens`;
// O plano do Claude informa o uso da janela em percentual, não em tokens; o número de
// tokens exibido é o gasto da última resposta.
function UsageMeter({ usage }: { usage: (AgentUsage & { at: string }) | null }) {
  const five = usage?.fiveHour,
    renewed = five?.resetsAt && Date.parse(five.resetsAt) < Date.now();
  if (!five)
    return (
      <p className="agent-usage empty">
        O consumo da janela de 5h aparece após a primeira resposta.
      </p>
    );
  const percent = renewed ? 0 : five.percent;
  return (
    <div
      className={'agent-usage ' + (percent >= 90 ? 'high' : percent >= 70 ? 'warn' : '')}
      aria-label={`Janela de 5 horas: ${percent}% usado`}
    >
      <div className="agent-usage-line">
        <span>Janela de 5h</span>
        <strong>{renewed ? 'renovada' : percent + '%'}</strong>
        <span className="agent-usage-bar">
          <i style={{ width: percent + '%' }} />
        </span>
        {five.resetsAt && !renewed && <span>renova {time(five.resetsAt)}</span>}
      </div>
      <small>
        {usage.week ? `Semana ${usage.week.percent}% · ` : ''}
        {usage.tokens ? `última resposta ${tokens(usage.tokens)} · ` : ''}
        atualizado {time(usage.at)}
      </small>
    </div>
  );
}
