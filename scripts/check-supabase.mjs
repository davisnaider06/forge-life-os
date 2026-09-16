import { existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// Never print credentials, raw provider errors, or user records.
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];
const missing = required.filter(name => !process.env[name]?.trim());
if (missing.length) {
  console.error('Preencha no .env.local: ' + missing.join(', '));
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, options);
const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, options);
let failed = false;
for (const table of [
  'forge_documents',
  'forge_bank_items',
  'forge_push_subscriptions',
  'forge_notification_receipts',
]) {
  const server = await admin.from(table).select('*', { head: true });
  // GET with zero rows preserves the provider error code; HEAD omits its body.
  const visitor = await anon.from(table).select('user_id').limit(0);
  const serverOk = !server.error;
  const visitorBlocked = visitor.error?.code === '42501';
  console.log(
    `${table}: servidor ${serverOk ? 'OK' : 'FALHOU'}; bloqueio anônimo ${visitorBlocked ? 'OK' : 'NÃO CONFIRMADO'}`,
  );
  if (!serverOk || !visitorBlocked) failed = true;
}
if (!failed)
  console.log(
    'Conexão e bloqueio anônimo verificados. Login e sincronização entre usuários ainda exigem validação separada.',
  );
process.exitCode = failed ? 1 : 0;
