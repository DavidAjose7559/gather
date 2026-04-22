-- Add worship team flag to profiles
alter table public.profiles
add column if not exists is_worship_team boolean default false;

-- Worship events
create table if not exists public.worship_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  venue text,
  expected_guests integer,
  theme text,
  notes text,
  status text default 'planning' check (status in ('planning', 'confirmed', 'done')),
  created_by uuid references public.profiles not null,
  created_at timestamptz default now()
);

-- Budget per event
create table if not exists public.worship_budget (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.worship_events on delete cascade not null,
  category text not null,
  allocated numeric default 0,
  spent numeric default 0,
  notes text,
  created_at timestamptz default now()
);

-- Order of service
create table if not exists public.worship_order_of_service (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.worship_events on delete cascade not null,
  position integer not null,
  item text not null,
  duration_minutes integer,
  assigned_to text,
  notes text
);

-- Guest list
create table if not exists public.worship_guests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.worship_events on delete cascade not null,
  name text not null,
  category text check (category in ('speaker', 'artist', 'vip', 'general')),
  rsvp_status text default 'invited' check (rsvp_status in ('invited', 'confirmed', 'declined')),
  notes text
);

-- Tasks per event
create table if not exists public.worship_tasks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.worship_events on delete cascade not null,
  title text not null,
  assigned_to uuid references public.profiles,
  due_date date,
  status text default 'todo' check (status in ('todo', 'in_progress', 'done')),
  notes text,
  created_at timestamptz default now()
);

-- Team notes / announcements
create table if not exists public.worship_notes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.worship_events on delete cascade not null,
  body text not null,
  created_by uuid references public.profiles not null,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.worship_events enable row level security;
alter table public.worship_budget enable row level security;
alter table public.worship_order_of_service enable row level security;
alter table public.worship_guests enable row level security;
alter table public.worship_tasks enable row level security;
alter table public.worship_notes enable row level security;

-- All worship tables: worship team + admin only
create policy "worship_events_access" on public.worship_events
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and (is_worship_team = true or role = 'admin'))
  ) with check (
    exists (select 1 from public.profiles where id = auth.uid() and (is_worship_team = true or role = 'admin'))
  );

create policy "worship_budget_access" on public.worship_budget
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and (is_worship_team = true or role = 'admin'))
  ) with check (
    exists (select 1 from public.profiles where id = auth.uid() and (is_worship_team = true or role = 'admin'))
  );

create policy "worship_order_access" on public.worship_order_of_service
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and (is_worship_team = true or role = 'admin'))
  ) with check (
    exists (select 1 from public.profiles where id = auth.uid() and (is_worship_team = true or role = 'admin'))
  );

create policy "worship_guests_access" on public.worship_guests
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and (is_worship_team = true or role = 'admin'))
  ) with check (
    exists (select 1 from public.profiles where id = auth.uid() and (is_worship_team = true or role = 'admin'))
  );

create policy "worship_tasks_access" on public.worship_tasks
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and (is_worship_team = true or role = 'admin'))
  ) with check (
    exists (select 1 from public.profiles where id = auth.uid() and (is_worship_team = true or role = 'admin'))
  );

create policy "worship_notes_access" on public.worship_notes
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and (is_worship_team = true or role = 'admin'))
  ) with check (
    exists (select 1 from public.profiles where id = auth.uid() and (is_worship_team = true or role = 'admin'))
  );
