import { z } from 'zod';

export const categories = ['Carreira', 'Finanças', 'Saúde', 'Estudos', 'Rotina'] as const;
export type Habit = {
  id: string;
  name: string;
  xp: number;
  art: string;
  doneDays: string[];
  archived?: boolean;
};
export type Goal = {
  id: string;
  name: string;
  category: string;
  deadline: string;
  target: number;
  current: number;
  highWater: number;
  unit: string;
  reward: number;
  art: string;
  completed: boolean;
  lastRewardDay?: string;
  archived?: boolean;
};
export type Transaction = {
  id: string;
  name: string;
  cents: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  source: 'manual' | 'pluggy';
  accountId?: string;
  providerId?: string;
  pending?: boolean;
};
export type Task = { id: string; name: string; date: string; done: boolean };
export type Award = { xp: number; day: string; active: boolean; qualifies: boolean };
export type BankAccount = {
  id: string;
  itemId: string;
  name: string;
  type: string;
  currency: string;
  balanceCents: number;
  updatedAt: string;
};
export type MemoryNote = { id: string; text: string; at: string };
export type AppState = {
  schema: 1;
  profile: { name: string; handle: string; city: string; timezone: string; onboarded: boolean };
  theme: 'dark' | 'light';
  notifications: boolean;
  habits: Habit[];
  tasks: Task[];
  goals: Goal[];
  transactions: Transaction[];
  accounts: BankAccount[];
  awards: Record<string, Award>;
  receipts: string[];
  memory?: MemoryNote[];
  demoBaseXp?: number;
};
export const commandTypes = [
  'onboard',
  'profile',
  'theme',
  'notifications',
  'habit.create',
  'habit.edit',
  'habit.toggle',
  'habit.archive',
  'task.create',
  'task.toggle',
  'goal.create',
  'goal.progress',
  'goal.archive',
  'transaction.create',
  'transaction.delete',
  'memory.save',
  'memory.forget',
  'checkin',
] as const;
export const commandSchema = z
  .object({
    id: z.string().uuid(),
    type: z.enum(commandTypes),
    payload: z.unknown(),
    at: z.iso.datetime(),
  })
  .strict();
export type Command = z.infer<typeof commandSchema>;
const name = z.string().trim().min(1, 'Informe um nome.').max(80);
const daySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    v =>
      !Number.isNaN(Date.parse(v + 'T12:00:00Z')) &&
      new Date(v + 'T12:00:00Z').toISOString().slice(0, 10) === v,
    'Data inválida.',
  );
const id = z.string().min(1).max(100);
const profileSchema = z.object({
  name: name.max(25),
  handle: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_.]{1,25}$/),
  city: z.string().trim().max(60),
  timezone: z
    .string()
    .max(80)
    .refine(v => {
      try {
        new Intl.DateTimeFormat('en', { timeZone: v });
        return true;
      } catch {
        return false;
      }
    }, 'Fuso inválido.'),
});
export const initialState = (): AppState => ({
  schema: 1,
  profile: { name: '', handle: '', city: '', timezone: 'America/Sao_Paulo', onboarded: false },
  theme: 'dark',
  notifications: false,
  habits: [],
  tasks: [],
  goals: [],
  transactions: [],
  accounts: [],
  awards: {},
  receipts: [],
});
export function dayInZone(timezone: string, now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
export function shiftDay(day: string, amount: number) {
  const d = new Date(day + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + amount);
  return d.toISOString().slice(0, 10);
}
export function levelTitle(level: number) {
  return level <= 5
    ? 'Iniciante'
    : level <= 10
      ? 'Construtor'
      : level <= 15
        ? 'Devbuilder'
        : level <= 20
          ? 'Executor'
          : 'Arquiteto';
}
export function stats(state: AppState, now = new Date()) {
  const day = dayInZone(state.profile.timezone, now),
    awards = Object.values(state.awards).filter(a => a.active),
    days = new Set(awards.filter(a => a.qualifies).map(a => a.day));
  const weekday = new Date(day + 'T12:00:00Z').getUTCDay(),
    monday = shiftDay(day, -((weekday + 6) % 7));
  const xp = awards.reduce((s, a) => s + a.xp, 0) + days.size * 10 + (state.demoBaseXp || 0);
  let streak = 0,
    cursor = days.has(day) ? day : shiftDay(day, -1);
  while (days.has(cursor)) {
    streak++;
    cursor = shiftDay(cursor, -1);
  }
  const level = Math.floor(xp / 500) + 1,
    weekXp =
      awards.filter(a => a.day >= monday && a.day <= day).reduce((s, a) => s + a.xp, 0) +
      [...days].filter(d => d >= monday && d <= day).length * 10;
  return {
    day,
    xp,
    weekXp,
    level,
    title: levelTitle(level),
    levelXp: xp % 500,
    streak,
    activeToday: days.has(day),
    days,
  };
}
// Movimentações entre contas do próprio dono não são ganho nem gasto; o pagamento da
// fatura repetiria compras já contadas no cartão.
const internalTransfer = /rende\s*f[áa]cil|aplica[çc][ãa]o|resgate|poupan[çc]a/i,
  cardPayment = /pgto\.?\s*cart[ãa]o|pagamento\s+(de\s+)?fatura|pgto\.?\s*fatura/i;
export function financeTotals(state: AppState, month: string) {
  const creditIds = new Set(state.accounts.filter(a => a.type === 'CREDIT').map(a => a.id)),
    bankAccounts = state.accounts.filter(a => a.type !== 'CREDIT'),
    onCard = (t: Transaction) => creditIds.has(t.accountId || '');
  // Compras no cartão ficam pendentes até a fatura fechar, mas já são gasto do mês.
  const counted = state.transactions.filter(
    t =>
      t.date.startsWith(month) &&
      !internalTransfer.test(t.name) &&
      !(!onCard(t) && cardPayment.test(t.name)),
  );
  const sum = (list: Transaction[]) => list.reduce((s, t) => s + t.cents, 0),
    income = sum(counted.filter(t => t.type === 'income' && !onCard(t))),
    cardSpend = sum(counted.filter(t => t.type === 'expense' && onCard(t))),
    cashSpend = sum(counted.filter(t => t.type === 'expense' && !onCard(t))),
    expense = cardSpend + cashSpend;
  const byCategory: Record<string, number> = {};
  for (const t of counted)
    if (t.type === 'expense') byCategory[t.category] = (byCategory[t.category] || 0) + t.cents;
  return {
    income,
    expense,
    cardSpend,
    cashSpend,
    byCategory,
    balance: bankAccounts.length
      ? bankAccounts.reduce((s, a) => s + a.balanceCents, 0)
      : income - expense,
    entries: counted.filter(t => t.type === 'expense' || !onCard(t)),
  };
}
function award(s: AppState, key: string, xp: number, day: string, qualifies = true, active = true) {
  s.awards[key] = { xp, day, qualifies, active };
}
function assertFound<T>(v: T | undefined): T {
  if (!v) throw new Error('Registro não encontrado.');
  return v;
}
export function applyCommand(current: AppState, raw: unknown, now = new Date()): AppState {
  const cmd = commandSchema.parse(raw);
  if (current.receipts.includes(cmd.id)) return current;
  const s = structuredClone(current);
  const day = dayInZone(s.profile.timezone, now);
  switch (cmd.type) {
    case 'onboard': {
      if (s.profile.onboarded) break;
      const p = z
        .object({
          profile: profileSchema,
          habits: z.array(name).min(1).max(10),
          goals: z.array(name).min(1).max(10),
        })
        .parse(cmd.payload);
      s.profile = { ...p.profile, onboarded: true };
      s.habits = p.habits.map((n, i) => ({
        id: `${cmd.id}-h${i}`,
        name: n,
        xp: [60, 40, 20][i % 3],
        art: ['dumbbell', 'book', 'flame'][i % 3],
        doneDays: [],
      }));
      s.goals = p.goals.map((n, i) => ({
        id: `${cmd.id}-g${i}`,
        name: n,
        category: categories[i % 5],
        deadline: shiftDay(day, 30),
        target: 100,
        current: 0,
        highWater: 0,
        unit: '%',
        reward: 300,
        art: ['laptop', 'coins', 'stack'][i % 3],
        completed: false,
      }));
      break;
    }
    case 'profile':
      s.profile = { ...profileSchema.parse(cmd.payload), onboarded: s.profile.onboarded };
      break;
    case 'theme':
      s.theme = z.enum(['dark', 'light']).parse(cmd.payload);
      break;
    case 'notifications':
      s.notifications = z.boolean().parse(cmd.payload);
      break;
    case 'habit.create': {
      const p = z
        .object({ name, xp: z.union([z.literal(20), z.literal(40), z.literal(60), z.literal(80)]) })
        .parse(cmd.payload);
      if (s.habits.length >= 100) throw Error('Limite de 100 hábitos atingido.');
      s.habits.push({ id: cmd.id, ...p, art: 'book', doneDays: [] });
      break;
    }
    case 'habit.edit': {
      const p = z
          .object({
            id,
            name,
            xp: z.union([z.literal(20), z.literal(40), z.literal(60), z.literal(80)]),
          })
          .parse(cmd.payload),
        h = assertFound(s.habits.find(h => h.id === p.id));
      h.name = p.name;
      h.xp = p.xp;
      break;
    }
    case 'habit.toggle': {
      const p = z.object({ id, done: z.boolean() }).parse(cmd.payload),
        h = assertFound(s.habits.find(h => h.id === p.id && !h.archived));
      const key = `habit:${h.id}:${day}`;
      if (p.done) {
        if (!h.doneDays.includes(day)) h.doneDays.push(day);
        award(s, key, s.awards[key]?.xp ?? h.xp, day, true);
      } else {
        h.doneDays = h.doneDays.filter(d => d !== day);
        if (s.awards[key]) s.awards[key].active = false;
      }
      break;
    }
    case 'habit.archive': {
      const p = z.object({ id }).parse(cmd.payload);
      assertFound(s.habits.find(h => h.id === p.id)).archived = true;
      break;
    }
    case 'task.create': {
      const p = z.object({ name, date: daySchema }).parse(cmd.payload);
      s.tasks.push({ id: cmd.id, ...p, done: false });
      break;
    }
    case 'task.toggle': {
      const p = z.object({ id, done: z.boolean() }).parse(cmd.payload),
        t = assertFound(s.tasks.find(t => t.id === p.id));
      t.done = p.done;
      const key = `task:${t.id}`;
      if (p.done) award(s, key, 20, s.awards[key]?.day || day, true);
      else if (s.awards[key]) s.awards[key].active = false;
      break;
    }
    case 'goal.create': {
      const p = z
        .object({
          name,
          category: z.enum(categories),
          deadline: daySchema,
          target: z.number().positive().max(100000000),
          unit: z.enum(['%', 'R$', 'horas', 'módulos', 'dias']),
        })
        .parse(cmd.payload);
      if (s.goals.length >= 200) throw Error('Limite de metas atingido.');
      s.goals.push({
        id: cmd.id,
        ...p,
        current: 0,
        highWater: 0,
        reward: 300,
        art: p.category === 'Finanças' ? 'coins' : p.category === 'Estudos' ? 'stack' : 'laptop',
        completed: false,
      });
      break;
    }
    case 'goal.progress': {
      const p = z.object({ id, current: z.number().min(0).max(100000000) }).parse(cmd.payload),
        g = assertFound(s.goals.find(g => g.id === p.id && !g.archived));
      if (g.completed) throw Error('Esta meta já foi concluída.');
      if (p.current > g.target) throw Error('O progresso não pode ultrapassar o objetivo.');
      const advanced = p.current > g.highWater;
      g.current = p.current;
      if (advanced) {
        g.highWater = p.current;
        award(s, `goal-progress:${g.id}:${day}`, 30, day);
        g.lastRewardDay = day;
      }
      if (p.current === g.target) {
        g.completed = true;
        award(s, `goal-complete:${g.id}`, g.reward, day);
      }
      break;
    }
    case 'goal.archive': {
      const p = z.object({ id }).parse(cmd.payload);
      assertFound(s.goals.find(g => g.id === p.id)).archived = true;
      break;
    }
    case 'transaction.create': {
      const p = z
        .object({
          name,
          cents: z.number().int().positive().max(10000000000),
          type: z.enum(['income', 'expense']),
          category: name,
          date: daySchema,
        })
        .parse(cmd.payload);
      s.transactions.push({ id: cmd.id, ...p, source: 'manual' });
      award(s, `transaction:${cmd.id}`, 10, day);
      break;
    }
    case 'transaction.delete': {
      const p = z.object({ id }).parse(cmd.payload),
        t = assertFound(s.transactions.find(t => t.id === p.id));
      if (t.source !== 'manual') throw Error('Transações importadas são gerenciadas pelo banco.');
      s.transactions = s.transactions.filter(t => t.id !== p.id);
      if (s.awards[`transaction:${p.id}`]) s.awards[`transaction:${p.id}`].active = false;
      break;
    }
    case 'memory.save': {
      const p = z.object({ text: z.string().trim().min(1).max(500) }).parse(cmd.payload);
      s.memory = [...(s.memory || []), { id: cmd.id, text: p.text, at: cmd.at }].slice(-200);
      break;
    }
    case 'memory.forget': {
      const p = z.object({ id }).parse(cmd.payload);
      assertFound(s.memory?.find(m => m.id === p.id));
      s.memory = s.memory!.filter(m => m.id !== p.id);
      break;
    }
    case 'checkin':
      if (s.profile.onboarded) award(s, `checkin:${day}`, 5, day, false);
      break;
  }
  s.receipts.push(cmd.id);
  if (s.receipts.length > 10000)
    throw Error('Faça uma exportação e entre em contato para ampliar seu histórico.');
  return s;
}
export function makeCommand(type: Command['type'], payload: unknown): Command {
  return { id: crypto.randomUUID(), type, payload, at: new Date().toISOString() };
}
export function parseMoney(value: string) {
  const normalized = value.trim().replace(/\s|R\$/g, '');
  if (!/^\d+([,.]\d{1,2})?$/.test(normalized))
    throw Error('Use um valor como 120,50, sem separador de milhar.');
  const [integer, decimal = ''] = normalized.replace(',', '.').split('.');
  const cents = Number(integer) * 100 + Number(decimal.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > 10000000000)
    throw Error('Valor inválido.');
  return cents;
}
export const money = (cents: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
export function demoState(now = new Date()): AppState {
  const s = initialState(),
    today = dayInZone(s.profile.timezone, now);
  s.profile = { ...s.profile, name: 'Davi', handle: 'davi', city: 'Jacareí, SP', onboarded: true };
  s.habits = [
    { id: 'train', name: 'Treinar 45 min', xp: 60, art: 'dumbbell', doneDays: [] },
    { id: 'study', name: 'Estudar 30 min', xp: 40, art: 'book', doneDays: [today] },
    { id: 'water', name: 'Beber 2 L de água', xp: 20, art: 'flame', doneDays: [today] },
  ];
  for (let i = 0; i < 7; i++) award(s, `demo:${i}`, 0, shiftDay(today, -i));
  award(s, 'study', 40, today);
  award(s, 'water', 20, today);
  s.demoBaseXp = 5710;
  s.goals = [
    {
      id: 'saas',
      name: 'Lançar meu SaaS',
      category: 'Carreira',
      deadline: shiftDay(today, 15),
      target: 100,
      current: 68,
      highWater: 68,
      unit: '%',
      reward: 500,
      art: 'laptop',
      completed: false,
    },
    {
      id: 'save',
      name: 'Guardar R$ 500',
      category: 'Finanças',
      deadline: shiftDay(today, 15),
      target: 500,
      current: 240,
      highWater: 240,
      unit: 'R$',
      reward: 300,
      art: 'coins',
      completed: false,
    },
    {
      id: 'fatec',
      name: 'Estudar para a FATEC',
      category: 'Estudos',
      deadline: shiftDay(today, 5),
      target: 5,
      current: 3,
      highWater: 3,
      unit: 'módulos',
      reward: 200,
      art: 'stack',
      completed: false,
    },
  ];
  s.tasks = Array.from({ length: 5 }, (_, i) => ({
    id: 'task' + i,
    name: [
      'Revisar meu SaaS',
      'Organizar a semana',
      'Anotações da FATEC',
      'Finalizar landing page',
      'Planejar sprint',
    ][i],
    date: today,
    done: i < 3,
  }));
  s.transactions = [
    {
      id: 'salary',
      name: 'Salário',
      cents: 320000,
      type: 'income',
      category: 'Salário',
      date: today,
      source: 'manual',
    },
    ...(
      [
        ['Mercado', 42000, 'Comida'],
        ['Transporte', 18000, 'Transporte'],
        ['Curso', 25000, 'Estudos'],
        ['Lazer', 16000, 'Lazer'],
        ['Outras despesas', 35000, 'Outros'],
      ] as const
    ).map(([name, cents, category], i) => ({
      id: 'expense' + i,
      name,
      cents,
      type: 'expense' as const,
      category,
      date: today,
      source: 'manual' as const,
    })),
  ];
  return s;
}
