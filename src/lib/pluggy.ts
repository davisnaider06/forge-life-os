import 'server-only';
import { z } from 'zod';
import { admin, mutateDocument, HttpError } from './server';
import type { Transaction, BankAccount } from './domain';
const BASE = 'https://api.pluggy.ai';
let cached: { key: string; expires: number } | null = null;
async function apiKey() {
  if (cached && cached.expires > Date.now()) return cached.key;
  if (!process.env.PLUGGY_CLIENT_ID || !process.env.PLUGGY_CLIENT_SECRET)
    throw new HttpError(503, 'A integração bancária ainda não foi configurada.');
  const res = await fetch(BASE + '/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: process.env.PLUGGY_CLIENT_ID,
      clientSecret: process.env.PLUGGY_CLIENT_SECRET,
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new HttpError(502, 'O provedor bancário não autorizou a conexão.');
  const body = z.object({ apiKey: z.string() }).parse(await res.json());
  cached = { key: body.apiKey, expires: Date.now() + 90 * 60 * 1000 };
  return cached.key;
}
export async function pluggy(path: string, init: RequestInit = {}) {
  if (!path.startsWith('/') || path.startsWith('//')) throw new HttpError(400, 'Caminho inválido.');
  const key = await apiKey(),
    res = await fetch(BASE + path, {
      ...init,
      headers: { 'X-API-KEY': key, 'Content-Type': 'application/json', ...init.headers },
      cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    });
  if (!res.ok) {
    if (res.status === 401) cached = null;
    throw new HttpError(
      res.status === 404 ? 404 : 502,
      'Não foi possível obter os dados do provedor bancário.',
    );
  }
  return res.status === 204 ? null : res.json();
}
export async function connectToken(userId: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL,
    oauthRedirectUri = appUrl?.startsWith('https://') ? appUrl : undefined;
  return pluggy('/connect_token', {
    method: 'POST',
    body: JSON.stringify({
      options: {
        clientUserId: userId,
        avoidDuplicates: true,
        ...(oauthRedirectUri ? { oauthRedirectUri } : {}),
      },
    }),
  });
}
const itemSchema = z.object({
  id: z.string(),
  clientUserId: z.string().nullable(),
  connector: z.object({ name: z.string() }).optional(),
});
const accountSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  name: z.string(),
  type: z.string(),
  currencyCode: z.string(),
  balance: z.number().finite(),
});
const txSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  description: z.string(),
  date: z.string(),
  amount: z.number().finite(),
  amountInAccountCurrency: z.number().nullable().optional(),
  type: z.enum(['CREDIT', 'DEBIT']),
  status: z.string(),
  currencyCode: z.string(),
  category: z.string().nullable().optional(),
  providerId: z.string().nullable().optional(),
});
const rules: [RegExp, string][] = [
  [
    /food|grocer|restaurant|supermarket|padaria|mercado|superm|restaurante|lanche|pizza|ifood|burger|a[çc]a[íi]|caf[ée]|emp[óo]rio|hortifruti|a[çc]ougue|doceria|sorvete/i,
    'Comida',
  ],
  [
    /transport|fuel|taxi|ride|uber|99app|99pop|posto|combust[íi]vel|shell|ipiranga|petrobras|estacion|passagem|[ôo]nibus|metr[ôo]|pedagio|ped[áa]gio/i,
    'Transporte',
  ],
  [
    /education|school|course|curso|faculdade|fatec|udemy|alura|livraria|escola|educa|apostila/i,
    'Estudos',
  ],
  [
    /entertainment|leisure|netflix|spotify|cinema|steam|game|academia|smartfit|compassfit|show|ingresso|disney|hbo|max\b|prime\s*video|bar\b|pub\b/i,
    'Lazer',
  ],
  [/salary|sal[áa]rio|adiantamento|pro\s*labore|remunera[çc][ãa]o|vale\b/i, 'Salário'],
];
function category(value: string | null | undefined, description = '') {
  const text = `${value || ''} ${description}`;
  for (const [pattern, name] of rules) if (pattern.test(text)) return name;
  return 'Outros';
}
export async function syncItem(userId: string, itemId: string) {
  const item = itemSchema.parse(await pluggy('/items/' + encodeURIComponent(itemId)));
  if (item.clientUserId !== userId)
    throw new HttpError(403, 'Esta conexão não pertence à sua conta.');
  const db = admin(),
    { error: bindingError } = await db.from('forge_bank_items').upsert({
      item_id: itemId,
      user_id: userId,
      institution: item.connector?.name || 'Banco',
      updated_at: new Date().toISOString(),
    });
  if (bindingError) throw new HttpError(503, 'Não foi possível salvar a conexão.');
  const response = await pluggy('/accounts?itemId=' + encodeURIComponent(itemId));
  const rawAccounts = z.array(accountSchema).parse(response.results);
  const accounts: BankAccount[] = [],
    transactions: Transaction[] = [];
  for (const raw of rawAccounts) {
    if (raw.currencyCode !== 'BRL') continue;
    accounts.push({
      id: raw.id,
      itemId,
      name: raw.name,
      type: raw.type,
      currency: raw.currencyCode,
      balanceCents: Math.round(raw.balance * 100),
      updatedAt: new Date().toISOString(),
    });
    let path = '/v2/transactions?accountId=' + encodeURIComponent(raw.id),
      pages = 0;
    while (path) {
      if (++pages > 100)
        throw new HttpError(
          502,
          'O histórico é muito grande. A sincronização precisa ser dividida.',
        );
      const batch = await pluggy(path),
        items = z.array(txSchema).parse(batch.results);
      for (const tx of items) {
        if (tx.accountId !== raw.id)
          throw new HttpError(502, 'O provedor retornou uma conta inesperada.');
        const amount = tx.currencyCode === 'BRL' ? tx.amount : tx.amountInAccountCurrency;
        if (amount === null || amount === undefined) continue;
        transactions.push({
          id: 'pluggy:' + tx.id,
          providerId: tx.id,
          accountId: raw.id,
          name: tx.description.slice(0, 200),
          cents: Math.abs(Math.round(amount * 100)),
          type: tx.type === 'CREDIT' ? 'income' : 'expense',
          category: category(tx.category, tx.description),
          date: tx.date.slice(0, 10),
          source: 'pluggy',
          pending: tx.status === 'PENDING',
        });
      }
      if (batch.next) {
        const next = new URL(batch.next, BASE + '/v2/transactions');
        if (
          next.origin !== BASE ||
          next.pathname !== '/v2/transactions' ||
          next.searchParams.get('accountId') !== raw.id
        )
          throw new HttpError(502, 'Paginação bancária inválida.');
        path = next.pathname + next.search;
      } else path = '';
    }
  }
  await mutateDocument(userId, s => {
    const next = structuredClone(s),
      ids = new Set(accounts.map(a => a.id));
    next.accounts = [...next.accounts.filter(a => a.itemId !== itemId), ...accounts];
    next.transactions = [
      ...next.transactions.filter(t => !t.accountId || !ids.has(t.accountId)),
      ...transactions,
    ];
    return next;
  });
  return { accounts: accounts.length, transactions: transactions.length };
}
