create table if not exists response_seen (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references responses(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  seen_at timestamptz not null default now(),
  unique(response_id, user_id)
);

alter table response_seen enable row level security;

create policy "Users can manage their own seen records" on response_seen
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
