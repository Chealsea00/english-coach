-- ============================================================
-- Business English Coach — Supabase schema
-- Run this once in Supabase → SQL Editor → New query → Run.
-- Safe to re-run (uses "if not exists" / "drop policy if exists").
-- ============================================================

-- Each learner's records are stored as a JSONB blob so new fields
-- added later need NO schema change. user_id ties every row to the
-- signed-in user; Row Level Security keeps users' data separate.

create table if not exists public.vocab (
  id         text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.passages (
  id         text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_sentences (
  id         text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- One stats row per user.
create table if not exists public.stats (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists vocab_user_idx           on public.vocab(user_id);
create index if not exists passages_user_idx         on public.passages(user_id);
create index if not exists daily_sentences_user_idx  on public.daily_sentences(user_id);

-- ---------- Row Level Security: each user sees only their own rows ----------

alter table public.vocab            enable row level security;
alter table public.passages         enable row level security;
alter table public.daily_sentences  enable row level security;
alter table public.stats            enable row level security;

drop policy if exists "own vocab"     on public.vocab;
drop policy if exists "own passages"  on public.passages;
drop policy if exists "own sentences" on public.daily_sentences;
drop policy if exists "own stats"     on public.stats;

create policy "own vocab" on public.vocab
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own passages" on public.passages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own sentences" on public.daily_sentences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own stats" on public.stats
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
