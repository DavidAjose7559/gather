-- Add seen_at to existing note mentions table
alter table public.worship_note_mentions add column if not exists seen_at timestamptz;

-- Budget mentions table
create table if not exists public.worship_budget_mentions (
  id uuid primary key default gen_random_uuid(),
  budget_item_id uuid references public.worship_budget(id) on delete cascade not null,
  profile_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  seen_at timestamptz
);

alter table public.worship_budget_mentions enable row level security;

create policy "worship_budget_mentions_access" on public.worship_budget_mentions
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and (is_worship_team = true or role = 'admin'))
  ) with check (
    exists (select 1 from public.profiles where id = auth.uid() and (is_worship_team = true or role = 'admin'))
  );
