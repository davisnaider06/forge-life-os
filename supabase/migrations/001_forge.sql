-- Execute once in the Supabase SQL editor. No financial data or credentials are seeded.
create table if not exists public.forge_documents (
 user_id uuid primary key references auth.users(id) on delete cascade,
 state jsonb not null, version bigint not null default 1,
 updated_at timestamptz not null default now()
);
create table if not exists public.forge_bank_items (
 item_id text primary key, user_id uuid not null references auth.users(id) on delete cascade,
 institution text not null default '', updated_at timestamptz not null default now()
);
create table if not exists public.forge_push_subscriptions (
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null unique, subscription jsonb not null,
 created_at timestamptz not null default now()
);
create table if not exists public.forge_notification_receipts (
 user_id uuid not null references auth.users(id) on delete cascade,
 day date not null, kind text not null, created_at timestamptz not null default now(),
 primary key (user_id, day, kind)
);
alter table public.forge_documents enable row level security;
alter table public.forge_bank_items enable row level security;
alter table public.forge_push_subscriptions enable row level security;
alter table public.forge_notification_receipts enable row level security;
revoke all on public.forge_documents, public.forge_bank_items, public.forge_push_subscriptions, public.forge_notification_receipts from anon, authenticated;
grant select on public.forge_documents, public.forge_bank_items to authenticated;
grant all on public.forge_documents, public.forge_bank_items, public.forge_push_subscriptions, public.forge_notification_receipts to service_role;
grant usage, select on sequence public.forge_push_subscriptions_id_seq to service_role;
create policy "Read own document" on public.forge_documents for select to authenticated using ((select auth.uid()) = user_id);
create policy "Read own bank items" on public.forge_bank_items for select to authenticated using ((select auth.uid()) = user_id);
create index if not exists forge_bank_items_user on public.forge_bank_items(user_id);
create index if not exists forge_push_user on public.forge_push_subscriptions(user_id);
