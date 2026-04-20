create table if not exists public.checkin_seen (
  id uuid primary key default gen_random_uuid(),
  check_in_id uuid references public.check_ins on delete cascade not null,
  user_id uuid references public.profiles not null,
  seen_at timestamptz default now(),
  unique(check_in_id, user_id)
);

alter table public.checkin_seen enable row level security;

create policy "Users can manage their own checkin_seen records" on public.checkin_seen
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
