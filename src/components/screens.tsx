'use client';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { useForge } from './store';
import { Icon, Art, Dot, Progress, Badge, Gauge } from './visuals';
import { stats, financeTotals, money, type AppState } from '@/lib/domain';
export type Screen = 'inicio' | 'metas' | 'financas' | 'perfil';
export type Sheet = {
  type:
    | 'quick'
    | 'habits'
    | 'habit'
    | 'tasks'
    | 'task'
    | 'goal'
    | 'progress'
    | 'transaction'
    | 'transaction-detail'
    | 'profile'
    | 'notifications'
    | 'banks'
    | 'account'
    | 'month'
    | 'badge'
    | 'today'
    | 'install';
  id?: string;
};
export type OpenSheet = (s: Sheet) => void;
export function achievements(s: AppState) {
  const st = stats(s);
  return [
    {
      name: 'Primeiro passo',
      criterion: '1 registro',
      type: 'dumbbell',
      unlocked: s.transactions.length > 0,
    },
    { name: 'Em movimento', criterion: '3 dias', type: 'book', unlocked: st.streak >= 3 },
    { name: 'Uma semana', criterion: '7 dias', type: 'flame', unlocked: st.streak >= 7 },
    { name: 'Construtor', criterion: 'Nível 5', type: 'stack', unlocked: st.level >= 5 },
    { name: 'Consistência', criterion: '10 dias', type: 'flame', unlocked: st.streak >= 10 },
    { name: 'Executor', criterion: 'Nível 20', type: 'laptop', unlocked: st.level >= 20 },
  ];
}
const date = (v: string) =>
  new Date(v + 'T12:00:00')
    .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    .replace('.', '');
export function Stat({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="panel stat-card">
      <span className="stat-icon">
        <Icon name={icon} />
      </span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
export function BadgeButton({
  item,
  index,
  open,
  labels = false,
}: {
  item: ReturnType<typeof achievements>[number];
  index: number;
  open: OpenSheet;
  labels?: boolean;
}) {
  return (
    <button
      className="badge-button"
      onClick={() => open({ type: 'badge', id: String(index) })}
      aria-label={`${item.name}, ${item.unlocked ? 'desbloqueada' : 'bloqueada'}`}
    >
      <Badge type={item.type} locked={!item.unlocked} />
      {labels && (
        <>
          <span className="badge-name">{item.name}</span>
          <small>{item.criterion}</small>
        </>
      )}
    </button>
  );
}
export function HomeScreen({ open, month }: { open: OpenSheet; month: string }) {
  const { state, dispatch, notify, demo } = useForge(),
    st = stats(state),
    f = financeTotals(state, month),
    habits = state.habits.filter(h => !h.archived),
    tasks = state.tasks.filter(t => t.date === st.day);
  return (
    <>
      <section className="hero home-hero" aria-label="Sua sequência">
        <img
          className="hero-photo"
          src="/assets/home-hero.webp"
          alt="Atleta em silhueta com iluminação teal"
          fetchPriority="high"
        />
        <div className="home-copy">
          <p className="hero-eyebrow">Sua sequência</p>
          <h1>
            CADA DIA
            <br />
            CONTA.
          </h1>
          <button className="white-button" onClick={() => open({ type: 'quick' })}>
            Registrar ação
          </button>
        </div>
        <svg className="hero-arc" viewBox="0 0 160 275" aria-hidden="true">
          <path d="M157-15C-1 78-7 210 161 282" />
          <circle cx="42" cy="141" r="4.5" fill="white" />
        </svg>
        <div className="hero-streak">
          <Dot value={String(st.streak).padStart(2, '0')} />
          <p>
            dias
            <br />
            seguidos
          </p>
        </div>
        <div className="streak-footer">
          <div className="streak-days">
            {Array.from({ length: 10 }, (_, i) => (
              <i
                key={i}
                className={i < Math.min(st.streak, 10) ? 'lit' : ''}
                style={{ '--i': i } as CSSProperties}
              />
            ))}
          </div>
          <small>
            Próximo marco:{' '}
            {st.streak < 3 ? 3 : st.streak < 7 ? 7 : st.streak < 10 ? 10 : st.streak < 21 ? 21 : 30}{' '}
            dias
          </small>
        </div>
      </section>
      <section className="stats-grid" aria-label="Resumo do dia">
        <Stat label="Saldo em conta" value={money(f.balance)} icon="wallet" />
        <Stat label="XP da semana" value={'+' + (demo ? 640 : st.weekXp) + ' XP'} icon="star" />
        <button
          className="panel stat-card"
          data-action="tasks"
          onClick={() => open({ type: 'tasks' })}
        >
          <span className="stat-icon">
            <Icon name="checkbox" />
          </span>
          <span>
            <small>Tarefas do dia</small>
            <strong>
              {tasks.filter(t => t.done).length}/{tasks.length}
            </strong>
          </span>
        </button>
        <Stat
          label="Hábitos"
          value={`${habits.filter(h => h.doneDays.includes(st.day)).length}/${habits.length}`}
          icon="bars"
        />
      </section>
      <section className="panel today-panel">
        <div className="today-heading">
          <h2>Hoje</h2>
          <button className="text-button" onClick={() => open({ type: 'habits' })}>
            Ver todos <Icon name="chevron" />
          </button>
        </div>
        {habits.slice(0, 2).map(h => {
          const done = h.doneDays.includes(st.day);
          return (
            <button
              key={h.id}
              className={`activity-row ${done ? 'done' : ''}`}
              aria-pressed={done}
              onClick={() => {
                dispatch('habit.toggle', { id: h.id, done: !done });
                notify(done ? 'Hábito desmarcado.' : `+${h.xp} XP. Mais um passo dado!`);
              }}
            >
              <span className="checkbox">{done && <Icon name="check" />}</span>
              <Art name={h.art} />
              <span className="activity-name">{h.name}</span>
              <span className="reward">+{h.xp} XP</span>
              <Icon name="chevron" />
            </button>
          );
        })}
        {!habits.length && (
          <button className="activity-row" onClick={() => open({ type: 'habit' })}>
            <Icon name="plus" />
            Criar meu primeiro hábito
          </button>
        )}
      </section>
      <section className="panel achievements-panel">
        <div className="section-heading">
          <h2>Conquistas recentes</h2>
          <Link href={'/perfil' + (demo ? '?demo=1' : '')} className="text-button">
            Ver todas <Icon name="chevron" />
          </Link>
        </div>
        <div className="badges-row">
          {achievements(state)
            .slice(0, 3)
            .map((b, i) => (
              <BadgeButton key={b.name} item={b} index={i} open={open} />
            ))}
        </div>
      </section>
    </>
  );
}
export function GoalsScreen({ open }: { open: OpenSheet }) {
  const { state } = useForge(),
    st = stats(state),
    goals = state.goals.filter(g => !g.archived);
  return (
    <>
      <section className="hero goals-hero">
        <img
          className="hero-photo"
          src="/assets/workout-hero.webp"
          alt="Atleta na academia com iluminação cinematográfica"
          fetchPriority="high"
        />
        <div className="home-copy">
          <h1>
            CONSTRUA
            <br />
            SUA MELHOR
            <br />
            VERSÃO.
          </h1>
          <p>Um objetivo de cada vez.</p>
        </div>
      </section>
      <section className="panel level-panel">
        <div className="level-title">
          <div>
            <h2>Seu nível</h2>
            <p>{st.title}</p>
          </div>
          <span className="round-icon">
            <Icon name="bars" />
          </span>
        </div>
        <div className="level-number">
          <Dot value={st.level} />
        </div>
        <Progress value={st.levelXp / 5} />
        <div className="progress-meta">
          <span>{st.levelXp} / 500 XP</span>
          <span>Faltam {500 - st.levelXp} XP</span>
        </div>
      </section>
      <div className="section-heading">
        <h2>Suas metas</h2>
        <button className="text-button" onClick={() => open({ type: 'goal' })}>
          Criar meta <Icon name="plus" />
        </button>
      </div>
      <section className="goal-list">
        {goals.map(g => (
          <button
            className="panel goal-row"
            key={g.id}
            onClick={() => open({ type: 'progress', id: g.id })}
          >
            <span className="goal-art">
              <Art name={g.art} />
            </span>
            <span className="goal-info">
              <span className="goal-top">
                <span className="goal-name">{g.name}</span>
                <span className="reward">{g.completed ? 'Concluída' : `+${g.reward} XP`}</span>
              </span>
              <small>
                {g.category} · {date(g.deadline)}
              </small>
              <span className="goal-progress">
                <Progress value={(g.current / g.target) * 100} />
                <span>
                  {g.unit === 'R$'
                    ? money(Math.round(g.current * 100)) + ' / ' + g.target
                    : g.unit === '%'
                      ? Math.round((g.current / g.target) * 100) + '%'
                      : g.current + ' / ' + g.target + ' ' + g.unit}
                </span>
              </span>
            </span>
            <Icon name="chevron" />
          </button>
        ))}
        {!goals.length && (
          <button className="panel empty-state" onClick={() => open({ type: 'goal' })}>
            Sua próxima conquista começa com uma meta. +
          </button>
        )}
      </section>
    </>
  );
}
export function FinanceScreen({
  open,
  month,
  filter,
  setFilter,
}: {
  open: OpenSheet;
  month: string;
  filter: string | null;
  setFilter: (v: string | null) => void;
}) {
  const { state } = useForge(),
    f = financeTotals(state, month),
    used = f.income ? Math.round((f.expense / f.income) * 100) : 0,
    cats = [
      ['Comida', 'fork'],
      ['Transporte', 'bus'],
      ['Estudos', 'book'],
      ['Lazer', 'game'],
      ['Outros', 'more'],
    ],
    entries = f.entries
      .filter(t => !filter || t.category === filter)
      .sort((a, b) => b.date.localeCompare(a.date));
  return (
    <>
      <section className="finance-top">
        <div className="panel finance-small">
          <div className="card-label">
            Entradas <Icon name="arrow" />
          </div>
          <Dot value={money(f.income)} />
          <div className="tiny-bars" aria-hidden="true">
            {Array.from({ length: 23 }, (_, i) => (
              <i
                key={i}
                className={i < 16 && f.income ? 'lit' : ''}
                style={
                  {
                    '--i': i,
                    '--h': 28 + Math.round(72 * Math.abs(Math.sin(i * 0.7))) + '%',
                  } as CSSProperties
                }
              />
            ))}
          </div>
        </div>
        <div className="panel finance-small">
          <div className="card-label">
            Orçamento usado <Icon name="pie" />
          </div>
          <Gauge value={used} />
        </div>
      </section>
      <section className="panel balance-panel">
        <div className="balance-header">
          <div>
            <h2>Saldo em conta</h2>
            <p>
              {state.accounts.length ? 'Somando suas contas conectadas' : 'Pelos seus registros'}
            </p>
          </div>
          <span className="reserve-label">
            Agora <Icon name="coins" />
          </span>
        </div>
        <div className="balance-bottom">
          <Dot value={money(f.balance)} />
          <div className="capsules" role="img" aria-label="Quanto do mês já foi gasto">
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i} className="capsule">
                <i
                  className="liquid"
                  style={
                    {
                      '--i': i,
                      '--fill':
                        Math.min(
                          100,
                          Math.max(0, ((f.income ? f.expense / f.income : 0) * 6 - i) * 100),
                        ) + '%',
                    } as CSSProperties
                  }
                />
              </span>
            ))}
          </div>
        </div>
      </section>
      <section className="cashflow">
        <Stat label="Cartão de crédito" value={money(f.cardSpend)} icon="wallet" />
        <Stat label="Pix e débito" value={money(f.cashSpend)} icon="down" />
      </section>
      <div className="section-heading">
        <h2>Categorias</h2>
        <button className="text-button" onClick={() => setFilter(null)}>
          Ver todas <Icon name="chevron" />
        </button>
      </div>
      <section className="category-strip" aria-label="Filtrar transações">
        {cats.map(([c, i]) => (
          <button
            key={c}
            className={
              'category-pill ' + (filter === c || (!filter && c === 'Outros') ? 'selected' : '')
            }
            aria-pressed={filter === c}
            onClick={() => setFilter(filter === c ? null : c)}
          >
            <Icon name={i} />
            <span>{c}</span>
            <Dot value={money(f.byCategory[c] || 0)} />
          </button>
        ))}
      </section>
      <div className="section-heading">
        <h2>{filter || 'Transações'}</h2>
        <button className="add-pill" onClick={() => open({ type: 'transaction' })}>
          <Icon name="plus" />
          Adicionar
        </button>
      </div>
      <section className="transactions">
        {entries.map(t => (
          <button
            key={t.id}
            className="panel transaction-row"
            onClick={() => open({ type: 'transaction-detail', id: t.id })}
          >
            <span className="round-icon">
              <Icon
                name={
                  t.type === 'income' ? 'briefcase' : t.category === 'Comida' ? 'cart' : 'wallet'
                }
              />
            </span>
            <span className="transaction-name">
              {t.name}{' '}
              <small>
                · {date(t.date)}
                {t.source === 'pluggy' ? ' · banco' : ''}
              </small>
            </span>
            <span className={'transaction-value ' + (t.type === 'income' ? 'income' : '')}>
              {t.type === 'income' ? '+' : '−'} {money(t.cents)}
            </span>
          </button>
        ))}
        {!entries.length && (
          <p className="panel empty-state">
            Seu mês começa aqui. Registre uma transação ou conecte seu banco.
          </p>
        )}
      </section>
      <button className="bank-connect-card panel" onClick={() => open({ type: 'banks' })}>
        <span className="round-icon">
          <Icon name="bank" />
        </span>
        <span>
          <strong>Bancos e carteiras</strong>
          <small>
            {state.accounts.length
              ? `${state.accounts.length} contas conectadas`
              : 'Seus saldos em um só lugar'}
          </small>
        </span>
        <Icon name="chevron" />
      </button>
    </>
  );
}
export function ProfileScreen({ open }: { open: OpenSheet }) {
  const { state, dispatch, syncStatus, retry, capabilities, exportData } = useForge(),
    st = stats(state),
    badges = achievements(state);
  return (
    <>
      <section className="hero profile-hero">
        <img className="hero-photo" src="/assets/home-hero.webp" alt="" />
        <span className="avatar">
          <img src="/assets/home-hero.webp" alt="Avatar ilustrativo" />
        </span>
        <h1>{state.profile.name}</h1>
        <p className="handle">
          @{state.profile.handle} · {state.profile.city}
        </p>
        <span className="level-pill">
          {st.title} · Nível {st.level}
        </span>
        <Progress value={st.levelXp / 5} />
        <div className="progress-meta">{st.levelXp} / 500 XP</div>
      </section>
      <section className="profile-stats">
        {[
          [String(st.streak).padStart(2, '0'), 'Sequência'],
          [String(badges.filter(b => b.unlocked).length).padStart(2, '0'), 'Conquistas'],
          [st.xp.toLocaleString('pt-BR'), 'XP total'],
        ].map(([n, label]) => (
          <div className="panel profile-stat" key={label}>
            <Dot value={n} />
            <p>{label}</p>
          </div>
        ))}
      </section>
      <div className="section-heading">
        <h2>Conquistas</h2>
        <span className="text-button">
          {badges.filter(b => b.unlocked).length} de {badges.length}
        </span>
      </div>
      <section className="panel badge-grid">
        {badges.map((b, i) => (
          <BadgeButton key={b.name} item={b} index={i} open={open} labels />
        ))}
      </section>
      <div className="section-heading">
        <h2>Configurações</h2>
      </div>
      <section className="panel settings-panel">
        {[
          ['profile', 'user', 'Editar perfil'],
          ['notifications', 'bell', 'Notificações'],
          ['banks', 'bank', 'Conectar banco'],
          ['account', 'user', 'Minha conta'],
          ['install', 'plus', 'Instalar FORGE'],
        ].map(([type, icon, label]) => (
          <button
            className="setting"
            key={type}
            onClick={() => open({ type: type as Sheet['type'] })}
          >
            <Icon name={icon} />
            <span>{label}</span>
            <Icon name="chevron" />
          </button>
        ))}
        <button
          className="setting"
          onClick={() => dispatch('theme', state.theme === 'dark' ? 'light' : 'dark')}
          role="switch"
          aria-checked={state.theme === 'dark'}
        >
          <Icon name="moon" />
          <span>Tema escuro</span>
          <span className={'toggle ' + (state.theme === 'dark' ? 'on' : '')} />
        </button>
        <button className="setting" onClick={exportData}>
          <Icon name="down" />
          <span>Exportar meus dados</span>
          <Icon name="chevron" />
        </button>
      </section>
      <button className="sync-status" onClick={retry}>
        {syncStatus}
      </button>
    </>
  );
}
