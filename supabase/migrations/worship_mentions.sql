create table if not exists public.worship_note_mentions (
  id uuid primary key default gen_random_uuid(),
  note_id uuid references public.worship_notes on delete cascade not null,
  profile_id uuid references public.profiles not null,
  created_at timestamptz default now()
);

alter table public.worship_note_mentions enable row level security;

create policy "worship_note_mentions_access" on public.worship_note_mentions
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and (is_worship_team = true or role = 'admin'))
  ) with check (
    exists (select 1 from public.profiles where id = auth.uid() and (is_worship_team = true or role = 'admin'))
  );
