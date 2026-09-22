import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  initialState,
  applyCommand,
  stats,
  parseMoney,
  financeTotals,
  shiftDay,
  type Command,
  type AppState,
} from '../src/lib/domain';
const now = new Date('2026-09-15T15:00:00Z');
function cmd(type: Command['type'], payload: unknown, at = now): Command {
  return { id: randomUUID(), at: at.toISOString(), type, payload };
}
function ready() {
  return applyCommand(
    initialState(),
    cmd('onboard', {
      profile: { name: 'Davi', handle: 'davi', city: 'Jacareí', timezone: 'America/Sao_Paulo' },
      habits: ['Treinar', 'Ler', 'Água'],
      goals: ['Estudar'],
    }),
    now,
  );
}
test('Money uses exact integer cents and rejects malformed input', () => {
  assert.equal(parseMoney('12,50'), 1250);
  assert.equal(parseMoney('0.01'), 1);
  assert.equal(parseMoney('120'), 12000);
  for (const v of ['-1', 'NaN', '0', '1,000', '1.234,50', 'Infinity'])
    assert.throws(() => parseMoney(v));
});
test('Repeated commands and habit toggles do not multiply XP', () => {
  let s = ready(),
    h = s.habits[0],
    c = cmd('habit.toggle', { id: h.id, done: true });
  s = applyCommand(s, c, now);
  assert.equal(stats(s, now).xp, 70);
  s = applyCommand(s, c, now);
  assert.equal(stats(s, now).xp, 70);
  s = applyCommand(s, cmd('habit.toggle', { id: h.id, done: false }), now);
  assert.equal(stats(s, now).xp, 0);
  s = applyCommand(s, cmd('habit.toggle', { id: h.id, done: true }), now);
  assert.equal(stats(s, now).xp, 70);
});
test('Daily bonus only once across multiple actions; check-in alone does not sustain a streak', () => {
  let s = ready();
  s = applyCommand(s, cmd('checkin', {}), now);
  assert.equal(stats(s, now).xp, 5);
  assert.equal(stats(s, now).streak, 0);
  s = applyCommand(s, cmd('habit.toggle', { id: s.habits[0].id, done: true }), now);
  s = applyCommand(s, cmd('habit.toggle', { id: s.habits[1].id, done: true }), now);
  assert.equal(stats(s, now).xp, 115);
  assert.equal(stats(s, now).streak, 1);
});
test('Streak respects timezone and a missed day resets it', () => {
  let s = ready();
  for (let i = 0; i < 3; i++) {
    const date = new Date(now.getTime() + i * 86400000);
    s = applyCommand(s, cmd('habit.toggle', { id: s.habits[0].id, done: true }, date), date);
  }
  assert.equal(stats(s, new Date('2026-09-18T01:00:00Z')).streak, 3);
  assert.equal(stats(s, new Date('2026-09-19T15:00:00Z')).streak, 0);
});
test('Correcting goal progress and replaying cannot farm XP; daily cap and unique completion', () => {
  let s = ready(),
    id = s.goals[0].id;
  s = applyCommand(s, cmd('goal.progress', { id, current: 20 }), now);
  assert.equal(stats(s, now).xp, 40);
  s = applyCommand(s, cmd('goal.progress', { id, current: 5 }), now);
  s = applyCommand(s, cmd('goal.progress', { id, current: 20 }), now);
  assert.equal(stats(s, now).xp, 40);
  s = applyCommand(s, cmd('goal.progress', { id, current: 50 }), now);
  assert.equal(stats(s, now).xp, 40);
  s = applyCommand(s, cmd('goal.progress', { id, current: 100 }), now);
  assert.equal(stats(s, now).xp, 340);
  assert.throws(() => applyCommand(s, cmd('goal.progress', { id, current: 100 }), now));
});
test('Transactions sum cents; deleting manual data adjusts ledger', () => {
  let s = ready();
  const c = cmd('transaction.create', {
    name: 'Café',
    cents: 1250,
    type: 'expense',
    category: 'Comida',
    date: '2026-09-15',
  });
  s = applyCommand(s, c, now);
  assert.equal(financeTotals(s, '2026-09').balance, -1250);
  s = applyCommand(s, c, now);
  assert.equal(s.transactions.length, 1);
  s = applyCommand(s, cmd('transaction.delete', { id: c.id }), now);
  assert.equal(financeTotals(s, '2026-09').balance, 0);
  assert.equal(stats(s, now).xp, 0);
});
test('Card charges are separated from cashflow to avoid double counting bill payments', () => {
  const s = ready();
  s.accounts.push({
    id: 'credit',
    itemId: 'item',
    name: 'Cartão BB',
    type: 'CREDIT',
    currency: 'BRL',
    balanceCents: 10000,
    updatedAt: now.toISOString(),
  });
  s.transactions.push(
    {
      id: 'tx1',
      name: 'Compra cartão',
      cents: 10000,
      type: 'expense',
      category: 'Outros',
      date: '2026-09-15',
      source: 'pluggy',
      accountId: 'credit',
    },
    {
      id: 'tx2',
      name: 'Pagamento fatura',
      cents: 10000,
      type: 'expense',
      category: 'Outros',
      date: '2026-09-15',
      source: 'pluggy',
      accountId: 'bank',
    },
  );
  assert.equal(financeTotals(s, '2026-09').expense, 10000);
});
test('Saldo vem das contas; gastos separam cartão de pix/débito e ignoram transferências', () => {
  const s = ready();
  s.accounts.push(
    {
      id: 'bank',
      itemId: 'item',
      name: 'Conta',
      type: 'BANK',
      currency: 'BRL',
      balanceCents: 7200,
      updatedAt: now.toISOString(),
    },
    {
      id: 'credit',
      itemId: 'item',
      name: 'Cartão',
      type: 'CREDIT',
      currency: 'BRL',
      balanceCents: 757100,
      updatedAt: now.toISOString(),
    },
  );
  const tx = (over: Partial<(typeof s.transactions)[number]>) => ({
    id: 'tx' + s.transactions.length,
    name: 'Compra',
    cents: 1000,
    type: 'expense' as const,
    category: 'Outros',
    date: '2026-09-15',
    source: 'pluggy' as const,
    ...over,
  });
  s.transactions.push(
    tx({ accountId: 'credit', cents: 5000 }),
    tx({ accountId: 'bank', cents: 2000 }),
    tx({ accountId: 'bank', cents: 90000, name: 'PGTO CARTAO' }),
    tx({ accountId: 'bank', cents: 31200, name: 'RENDE FACIL     Rende Facil' }),
    tx({ accountId: 'bank', cents: 100000, type: 'income', name: 'ADIANTAMENTO' }),
    tx({ accountId: 'bank', cents: 49050, type: 'income', name: 'REND.FACIL Rende Facil' }),
    tx({ accountId: 'credit', cents: 47700, type: 'income', name: 'PGTO. CASH AG.' }),
    tx({ accountId: 'credit', cents: 900, pending: true }),
  );
  const f = financeTotals(s, '2026-09');
  assert.equal(f.balance, 7200, 'saldo é o da conta, não o fluxo do mês');
  assert.equal(f.cardSpend, 5900, 'compra pendente no cartão já conta como gasto');
  assert.equal(f.cashSpend, 2000, 'pagamento de fatura e aplicação ficam de fora');
  assert.equal(f.expense, 7900);
  assert.equal(f.income, 100000, 'resgate não conta como entrada');
  assert.equal(f.byCategory.Outros, 7900);
  assert.equal(f.entries.length, 4, 'lista traz gastos dos dois e entradas reais');
});
test('Invalid actions never mutate original state', () => {
  const s = ready(),
    before = JSON.stringify(s);
  assert.throws(() =>
    applyCommand(
      s,
      cmd('transaction.create', {
        name: '',
        cents: 1.5,
        type: 'expense',
        category: 'Outros',
        date: '2026-02-31',
      }),
      now,
    ),
  );
  assert.equal(JSON.stringify(s), before);
});
test('Calendar handles year boundaries', () => {
  assert.equal(shiftDay('2026-01-01', -1), '2025-12-31');
});
test('Agent memory saves durable notes, forgets by id and rejects empty text', () => {
  let s = ready();
  const save = cmd('memory.save', { text: '  Prefere treinar de manhã.  ' });
  s = applyCommand(s, save, now);
  assert.deepEqual(s.memory, [{ id: save.id, text: 'Prefere treinar de manhã.', at: save.at }]);
  assert.throws(() => applyCommand(s, cmd('memory.save', { text: '   ' }), now));
  s = applyCommand(s, cmd('memory.forget', { id: save.id }), now);
  assert.deepEqual(s.memory, []);
  assert.throws(() => applyCommand(s, cmd('memory.forget', { id: save.id }), now), /encontrado/);
});
test('Commands built elsewhere keep their ids so later commands can reference them', () => {
  const create = cmd('habit.create', { name: 'Ler 10 páginas', xp: 20 });
  let s = applyCommand(ready(), create, now);
  s = applyCommand(s, cmd('habit.toggle', { id: create.id, done: true }), now);
  assert.equal(s.habits.find(h => h.id === create.id)?.doneDays.length, 1);
});
