'use client';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useForge } from './store';
import { Icon, Art, Progress, Badge } from './visuals';
import { achievements, type Sheet, type OpenSheet } from './screens';
import { stats, categories, parseMoney, money, type Command } from '@/lib/domain';
import { browserSupabase } from '@/lib/supabase-browser';
import { BankPanel } from './bank-panel';
export function Sheets({
  sheet,
  open,
  close,
  month,
  setMonth,
}: {
  sheet: Sheet | null;
  open: OpenSheet;
  close: () => void;
  month: string;
  setMonth: (m: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (sheet && !ref.current?.open) {
      ref.current?.showModal();
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches)
        import('gsap').then(({ gsap }) => {
          if (ref.current?.open)
            gsap.fromTo(
              ref.current,
              { y: 50, opacity: 0 },
              { y: 0, opacity: 1, duration: 0.3, ease: 'power3.out' },
            );
        });
    } else if (!sheet) ref.current?.close();
  }, [sheet]);
  return (
    <dialog
      className="sheet"
      ref={ref}
      onCancel={close}
      onClick={e => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            close();
        }
      }}
    >
      <div className="sheet-grab" />
      <button className="close-sheet" onClick={close} aria-label="Fechar">
        ×
      </button>
      {sheet && (
        <SheetContent
          key={sheet.type + sheet.id}
          sheet={sheet}
          open={open}
          close={close}
          month={month}
          setMonth={setMonth}
        />
      )}
    </dialog>
  );
}
function Field({
  label,
  name,
  children,
  ...props
}: {
  label: string;
  name: string;
  children?: ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <>
      <label htmlFor={'field-' + name}>{label}</label>
      {children || <input id={'field-' + name} name={name} {...props} />}
    </>
  );
}
function Select({
  name,
  label,
  values,
  value,
}: {
  name: string;
  label: string;
  values: string[];
  value?: string;
}) {
  return (
    <>
      <label htmlFor={'field-' + name}>{label}</label>
      <select id={'field-' + name} name={name} defaultValue={value}>
        {values.map(v => (
          <option key={v}>{v}</option>
        ))}
      </select>
    </>
  );
}
function SheetContent({
  sheet,
  open,
  close,
  month,
  setMonth,
}: {
  sheet: Sheet;
  open: OpenSheet;
  close: () => void;
  month: string;
  setMonth: (m: string) => void;
}) {
  const { state, dispatch, notify, capabilities, demo } = useForge(),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [loginEmail, setLoginEmail] = useState(''),
    st = stats(state);
  function submit(
    type: Command['type'],
    payload: (d: Record<string, string>) => unknown,
    message: string,
  ) {
    return (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      try {
        const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
        dispatch(type, payload(data));
        close();
        notify(message);
      } catch (e) {
        setError(
          e instanceof Error && !e.message.startsWith('[')
            ? e.message
            : 'Confira os campos informados.',
        );
      }
    };
  }
  const failure = error ? (
    <p role="alert" className="error-text">
      {error}
    </p>
  ) : null;
  if (sheet.type === 'quick')
    return (
      <>
        <h2>Faça o dia contar.</h2>
        <p>Escolha seu próximo passo.</p>
        {[
          ['habits', 'checkbox', 'Meus hábitos'],
          ['tasks', 'bars', 'Tarefas de hoje'],
          ['transaction', 'wallet', 'Registrar transação'],
          ['goal', 'target', 'Criar uma meta'],
          ['habit', 'plus', 'Adicionar hábito'],
        ].map(([type, icon, label]) => (
          <button
            key={type}
            className="quick-choice"
            onClick={() => open({ type: type as Sheet['type'] })}
          >
            <Icon name={icon} />
            {label}
            <Icon name="chevron" />
          </button>
        ))}
      </>
    );
  if (sheet.type === 'today')
    return (
      <>
        <h2>Hoje conta.</h2>
        <p>
          {new Date().toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </p>
        <p>
          {st.activeToday
            ? 'Sua sequência já está ativa hoje.'
            : 'Uma ação real mantém sua sequência: hábito, tarefa, meta ou registro financeiro.'}
        </p>
        <button className="primary-button" onClick={() => open({ type: 'habits' })}>
          Ver meus hábitos
        </button>
      </>
    );
  if (sheet.type === 'habits')
    return (
      <>
        <h2>Seus hábitos</h2>
        <p>Pequenas ações, progresso real.</p>
        {state.habits
          .filter(h => !h.archived)
          .map(h => {
            const done = h.doneDays.includes(st.day);
            return (
              <div className="habit-line" key={h.id}>
                <button
                  className={'activity-row ' + (done ? 'done' : '')}
                  aria-pressed={done}
                  onClick={() => {
                    dispatch('habit.toggle', { id: h.id, done: !done });
                    notify(done ? 'Hábito desmarcado.' : `+${h.xp} XP. Continue assim.`);
                  }}
                >
                  <span className="checkbox">{done && <Icon name="check" />}</span>
                  <Art name={h.art} />
                  <span className="activity-name">{h.name}</span>
                  <span className="reward">+{h.xp} XP</span>
                </button>
                <button className="text-button" onClick={() => open({ type: 'habit', id: h.id })}>
                  Editar
                </button>
              </div>
            );
          })}
        <button className="primary-button" onClick={() => open({ type: 'habit' })}>
          Adicionar hábito
        </button>
      </>
    );
  if (sheet.type === 'habit') {
    const h = state.habits.find(h => h.id === sheet.id);
    return (
      <>
        <h2>{h ? 'Editar' : 'Novo'} hábito</h2>
        <p>Uma ação que cabe no seu dia.</p>
        <form
          onSubmit={submit(
            h ? 'habit.edit' : 'habit.create',
            d => ({ ...(h ? { id: h.id } : {}), name: d.name, xp: Number(d.xp) }),
            'Hábito salvo.',
          )}
        >
          <Field
            name="name"
            label="Hábito e meta diária"
            defaultValue={h?.name}
            required
            maxLength={80}
            placeholder="Ex.: Ler 10 páginas"
          />
          <label htmlFor="habit-xp">Dificuldade</label>
          <select id="habit-xp" name="xp" defaultValue={h?.xp || 40}>
            {[
              [20, 'Leve'],
              [40, 'Moderada'],
              [60, 'Desafiadora'],
              [80, 'Intensa'],
            ].map(([v, n]) => (
              <option key={v} value={v}>
                {n} · {v} XP
              </option>
            ))}
          </select>
          {failure}
          <button className="primary-button">Salvar hábito</button>
        </form>
        {h && (
          <button
            className="danger-button"
            onClick={() => {
              dispatch('habit.archive', { id: h.id });
              close();
              notify('Hábito arquivado. Seu histórico foi preservado.');
            }}
          >
            Arquivar hábito
          </button>
        )}
      </>
    );
  }
  if (sheet.type === 'tasks')
    return (
      <>
        <h2>Tarefas de hoje</h2>
        <p>Uma coisa de cada vez. +20 XP por tarefa.</p>
        {state.tasks
          .filter(t => t.date === st.day)
          .map(t => (
            <button
              key={t.id}
              className={'activity-row ' + (t.done ? 'done' : '')}
              aria-pressed={t.done}
              onClick={() => dispatch('task.toggle', { id: t.id, done: !t.done })}
            >
              <span className="checkbox">{t.done && <Icon name="check" />}</span>
              <span className="activity-name">{t.name}</span>
            </button>
          ))}
        <button className="primary-button" onClick={() => open({ type: 'task' })}>
          Adicionar tarefa
        </button>
      </>
    );
  if (sheet.type === 'task')
    return (
      <>
        <h2>Sua próxima ação.</h2>
        <form
          onSubmit={submit('task.create', d => ({ name: d.name, date: d.date }), 'Tarefa criada.')}
        >
          <Field label="Tarefa" name="name" required maxLength={80} />
          <Field label="Dia" name="date" type="date" defaultValue={st.day} required />
          {failure}
          <button className="primary-button">Criar tarefa</button>
        </form>
      </>
    );
  if (sheet.type === 'goal')
    return (
      <>
        <h2>Sua próxima conquista.</h2>
        <p>Transforme uma intenção em algo que você consegue medir.</p>
        <form
          onSubmit={submit(
            'goal.create',
            d => ({ ...d, target: Number(d.target) }),
            'Meta criada. Um objetivo de cada vez.',
          )}
        >
          <Field
            label="Nome da meta"
            name="name"
            required
            maxLength={80}
            placeholder="Ex.: Guardar R$ 1.000"
          />
          <div className="form-row">
            <div>
              <Select label="Categoria" name="category" values={[...categories]} />
            </div>
            <div>
              <Field label="Prazo" name="deadline" type="date" required defaultValue={st.day} />
            </div>
          </div>
          <div className="form-row">
            <div>
              <Field
                label="Objetivo numérico"
                name="target"
                type="number"
                min="1"
                max="100000000"
                step="any"
                defaultValue="100"
                required
              />
            </div>
            <div>
              <Select
                label="Unidade"
                name="unit"
                values={['%', 'R$', 'horas', 'módulos', 'dias']}
              />
            </div>
          </div>
          {failure}
          <button className="primary-button">Criar meta · +300 XP ao concluir</button>
        </form>
      </>
    );
  if (sheet.type === 'progress') {
    const g = state.goals.find(g => g.id === sheet.id);
    if (!g) return <p>Meta não encontrada.</p>;
    return (
      <>
        <h2>{g.name}</h2>
        <p>
          {g.category} · +{g.reward} XP ao concluir
        </p>
        <div className="detail-progress">
          <Progress value={(g.current / g.target) * 100} />
        </div>
        <form
          onSubmit={submit(
            'goal.progress',
            d => ({ id: g.id, current: Number(d.current) }),
            'Progresso atualizado.',
          )}
        >
          <Field
            label={`Progresso acumulado (${g.unit})`}
            name="current"
            type="number"
            min="0"
            max={g.target}
            step="any"
            defaultValue={g.current}
            disabled={g.completed}
            required
          />
          <p className="field-help">
            Objetivo: {g.target} {g.unit}. Avançar rende 30 XP, uma vez por dia nesta meta.
          </p>
          {failure}
          <button className="primary-button" disabled={g.completed}>
            {g.completed ? 'Meta concluída' : 'Salvar progresso'}
          </button>
        </form>
        <button
          className="danger-button"
          onClick={() => {
            dispatch('goal.archive', { id: g.id });
            close();
          }}
        >
          Arquivar meta
        </button>
      </>
    );
  }
  if (sheet.type === 'transaction')
    return (
      <>
        <h2>Nova transação</h2>
        <p>Clareza sobre seu dinheiro. +10 XP por registro.</p>
        <form
          onSubmit={submit(
            'transaction.create',
            d => ({
              name: d.name,
              cents: parseMoney(d.amount),
              type: d.type,
              category: d.category,
              date: d.date,
            }),
            'Transação registrada. +10 XP.',
          )}
        >
          <div className="form-row">
            <div>
              <Field
                label="Valor (R$)"
                name="amount"
                inputMode="decimal"
                placeholder="0,00"
                required
              />
            </div>
            <div>
              <label htmlFor="tx-type">Tipo</label>
              <select id="tx-type" name="type">
                <option value="expense">Saída</option>
                <option value="income">Entrada</option>
              </select>
            </div>
          </div>
          <Field label="Descrição" name="name" required maxLength={80} placeholder="Ex.: Mercado" />
          <div className="form-row">
            <div>
              <Select
                label="Categoria"
                name="category"
                values={['Comida', 'Transporte', 'Estudos', 'Lazer', 'Outros', 'Salário']}
              />
            </div>
            <div>
              <Field label="Data" name="date" type="date" defaultValue={st.day} required />
            </div>
          </div>
          {failure}
          <button className="primary-button">Adicionar transação</button>
        </form>
      </>
    );
  if (sheet.type === 'transaction-detail') {
    const t = state.transactions.find(t => t.id === sheet.id);
    return t ? (
      <>
        <h2>{t.name}</h2>
        <p>
          {t.category} · {t.date}
        </p>
        <div className="transaction-detail-value">
          {t.type === 'income' ? '+' : '−'} {money(t.cents)}
        </div>
        <p>
          {t.source === 'pluggy'
            ? 'Importada do banco. A sincronização atualiza este registro.'
            : 'Registro manual.'}
        </p>
        {t.source === 'manual' && (
          <button
            className="danger-button"
            onClick={() => {
              dispatch('transaction.delete', { id: t.id });
              close();
              notify('Transação removida. Saldo e XP ajustados.');
            }}
          >
            Excluir transação
          </button>
        )}
      </>
    ) : (
      <p>Registro não encontrado.</p>
    );
  }
  if (sheet.type === 'profile')
    return (
      <>
        <h2>Seu personagem.</h2>
        <p>Do seu jeito.</p>
        <form onSubmit={submit('profile', d => d, 'Perfil atualizado.')}>
          <Field
            label="Nome"
            name="name"
            defaultValue={state.profile.name}
            maxLength={25}
            required
          />
          <Field
            label="Nome de usuário"
            name="handle"
            defaultValue={state.profile.handle}
            pattern="[a-zA-Z0-9_.]{1,25}"
            required
          />
          <Field label="Cidade" name="city" defaultValue={state.profile.city} maxLength={60} />
          <Field
            label="Fuso horário"
            name="timezone"
            defaultValue={state.profile.timezone}
            required
          />
          {failure}
          <button className="primary-button">Salvar perfil</button>
        </form>
      </>
    );
  if (sheet.type === 'month')
    return (
      <>
        <h2>Seu mês.</h2>
        <form
          onSubmit={e => {
            e.preventDefault();
            setMonth(String(new FormData(e.currentTarget).get('month')));
            close();
          }}
        >
          <Field
            label="Mês de referência"
            name="month"
            type="month"
            defaultValue={month}
            required
          />
          <button className="primary-button">Ver período</button>
        </form>
      </>
    );
  if (sheet.type === 'badge') {
    const b = achievements(state)[Number(sheet.id)];
    return b ? (
      <div className="badge-detail">
        <Badge type={b.type} locked={!b.unlocked} />
        <h2>{b.name}</h2>
        <p>
          {b.unlocked ? 'Conquista desbloqueada' : 'Próximo desafio'} · {b.criterion}
        </p>
      </div>
    ) : null;
  }
  if (sheet.type === 'banks') return <BankPanel />;
  if (sheet.type === 'account') {
    const client = browserSupabase();
    return (
      <>
        <h2>{capabilities.user ? 'Sua conta.' : 'Leve seu progresso com você.'}</h2>
        <p>
          {capabilities.user
            ? capabilities.user.email
            : 'Entre com um código enviado por email para sincronizar entre seus dispositivos.'}
        </p>
        {demo ? (
          <p>Saia do modo demonstração para conectar sua conta.</p>
        ) : !capabilities.cloud ? (
          <p>
            O app está salvando neste aparelho. A conexão com a nuvem precisa ser configurada neste
            projeto.
          </p>
        ) : capabilities.user ? (
          <button
            className="primary-button"
            onClick={async () => {
              await client?.auth.signOut();
              location.href = '/';
            }}
          >
            Sair da conta
          </button>
        ) : loginEmail ? (
          <form
            onSubmit={async e => {
              e.preventDefault();
              setBusy(true);
              try {
                const code = String(new FormData(e.currentTarget).get('code')).replace(/\s/g, '');
                const result = await client?.auth.verifyOtp({
                  email: loginEmail,
                  token: code,
                  type: 'email',
                });
                if (result?.error) throw result.error;
                location.href = '/';
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Código inválido ou expirado.');
              } finally {
                setBusy(false);
              }
            }}
          >
            <p>
              Digite o código enviado para <strong>{loginEmail}</strong>. Se o email trouxer apenas
              um link, abra-o neste mesmo navegador.
            </p>
            <Field
              label="Código"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              autoFocus
            />
            {failure}
            <button className="primary-button" disabled={busy}>
              {busy ? 'Confirmando…' : 'Confirmar código'}
            </button>
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={() => {
                setLoginEmail('');
                setError('');
              }}
            >
              Usar outro email
            </button>
          </form>
        ) : (
          <form
            onSubmit={async e => {
              e.preventDefault();
              setBusy(true);
              try {
                const email = String(new FormData(e.currentTarget).get('email'));
                const result = await client?.auth.signInWithOtp({
                  email,
                  options: { emailRedirectTo: location.origin + '/auth/callback' },
                });
                if (result?.error) throw result.error;
                setLoginEmail(email);
                setError('');
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Não foi possível enviar o código.');
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Seu email" name="email" type="email" required autoComplete="email" />
            {failure}
            <button className="primary-button" disabled={busy}>
              {busy ? 'Enviando…' : 'Receber código de acesso'}
            </button>
          </form>
        )}
      </>
    );
  }
  if (sheet.type === 'notifications')
    return (
      <>
        <h2>Um lembrete para você.</h2>
        <p>Check-in às 8h e aviso de sequência às 21h, no seu fuso horário.</p>
        {!capabilities.push || !capabilities.user || demo ? (
          <p>
            O envio de notificações precisa de uma conta conectada e do serviço de lembretes
            configurado. Seus hábitos funcionam normalmente neste aparelho.
          </p>
        ) : (
          <>
            <button
              className="primary-button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  if (
                    !('Notification' in window) ||
                    !('serviceWorker' in navigator) ||
                    !('PushManager' in window)
                  )
                    throw Error(
                      'Este navegador não oferece push. No iPhone, instale o app na Tela de Início.',
                    );
                  if ((await Notification.requestPermission()) !== 'granted')
                    throw Error('Permita notificações nas configurações do navegador.');
                  const registration = await navigator.serviceWorker.ready;
                  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
                  const bytes = Uint8Array.from(
                    atob(
                      publicKey
                        .replace(/-/g, '+')
                        .replace(/_/g, '/')
                        .padEnd(Math.ceil(publicKey.length / 4) * 4, '='),
                    ),
                    c => c.charCodeAt(0),
                  );
                  const subscription =
                    (await registration.pushManager.getSubscription()) ||
                    (await registration.pushManager.subscribe({
                      userVisibleOnly: true,
                      applicationServerKey: bytes,
                    }));
                  const response = await fetch('/api/push', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(subscription.toJSON()),
                  });
                  if (!response.ok) throw Error('Não foi possível ativar os lembretes.');
                  dispatch('notifications', true);
                  notify('Notificações ativadas.');
                  close();
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Não foi possível ativar.');
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy
                ? 'Ativando…'
                : state.notifications
                  ? 'Reativar neste aparelho'
                  : 'Ativar notificações'}
            </button>
            {state.notifications && (
              <button
                className="danger-button"
                onClick={() => {
                  dispatch('notifications', false);
                  close();
                  notify('Lembretes desativados.');
                }}
              >
                Desativar lembretes
              </button>
            )}
          </>
        )}
        {failure}
      </>
    );
  if (sheet.type === 'install')
    return (
      <>
        <h2>FORGE, sempre à mão.</h2>
        <p>
          No iPhone: abra no Safari, toque em Compartilhar e depois em Adicionar à Tela de Início.
        </p>
        <p>
          No Android: abra no Chrome e escolha Instalar aplicativo ou Adicionar à tela inicial no
          menu.
        </p>
        <p>
          Depois de instalado, você pode registrar suas ações mesmo sem conexão. A sincronização
          volta quando a internet retornar.
        </p>
      </>
    );
  return null;
}
