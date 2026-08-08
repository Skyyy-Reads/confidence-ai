-- Stores each finished quiz "session" for a logged-in user.
-- Run this in the Supabase SQL editor, or via `supabase db push`.

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text,
  total int not null,
  correct_count int not null,
  blindspots int not null,
  answers jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists sessions_user_id_created_at_idx
  on public.sessions (user_id, created_at desc);

alter table public.sessions enable row level security;

-- Users can only ever see, insert, or delete their own sessions. Without
-- these policies, RLS blocks everything by default, so nothing here is
-- optional if you want the history feature to work.
create policy "Users can read their own sessions"
  on public.sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own sessions"
  on public.sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own sessions"
  on public.sessions for delete
  using (auth.uid() = user_id);
