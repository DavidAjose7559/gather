create table public.profiles (
  id uuid references auth.users primary key,
  full_name text not null,
  display_name text,
  avatar_url text,
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz default now()
);

create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles not null,
  check_in_date date not null default current_date,
  spiritual_life text check (spiritual_life in ('strong','okay','struggling')),
  word_time text check (word_time in ('yes','a_little','no')),
  prayer_life text check (prayer_life in ('strong','somewhat','weak')),
  emotional_state text check (emotional_state in ('peaceful','okay','anxious','overwhelmed','low','joyful')),
  physical_state text check (physical_state in ('good','tired','sick','low_energy')),
  struggles text,
  gratitude text,
  notes text,
  support_requested boolean default false,
  visibility_type text not null default 'everyone' check (visibility_type in ('everyone','specific','one_person')),
  created_at timestamptz default now(),
  unique (user_id, check_in_date)
);

create table public.visibility_grants (
  id uuid primary key default gen_random_uuid(),
  check_in_id uuid references public.check_ins on delete cascade not null,
  granted_to uuid references public.profiles not null,
  unique (check_in_id, granted_to)
);

create table public.responses (
  id uuid primary key default gen_random_uuid(),
  check_in_id uuid references public.check_ins on delete cascade not null,
  responder_id uuid references public.profiles not null,
  body text not null,
  is_anonymous boolean default false,
  created_at timestamptz default now()
);

create table public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles not null,
  body text not null,
  is_resolved boolean default false,
  created_at timestamptz default now()
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.check_ins enable row level security;
alter table public.visibility_grants enable row level security;
alter table public.responses enable row level security;
alter table public.prayer_requests enable row level security;

-- Profiles: members can read all profiles, only edit their own
create policy "profiles_read_all" on public.profiles for select using (true);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Check-ins: visibility logic enforced in app layer; allow authenticated users to read
create policy "checkins_insert_own" on public.check_ins for insert with check (auth.uid() = user_id);
create policy "checkins_update_own" on public.check_ins for update using (auth.uid() = user_id);
create policy "checkins_select_authenticated" on public.check_ins for select using (auth.uid() is not null);

-- Visibility grants
create policy "vgrants_select_authenticated" on public.visibility_grants for select using (auth.uid() is not null);
create policy "vgrants_insert_own" on public.visibility_grants for insert with check (
  auth.uid() = (select user_id from public.check_ins where id = check_in_id)
);
create policy "vgrants_delete_own" on public.visibility_grants for delete using (
  auth.uid() = (select user_id from public.check_ins where id = check_in_id)
);

-- Responses
create policy "responses_select_authenticated" on public.responses for select using (auth.uid() is not null);
create policy "responses_insert_authenticated" on public.responses for insert with check (auth.uid() = responder_id);

-- Prayer requests
create policy "prayer_select_authenticated" on public.prayer_requests for select using (auth.uid() is not null);
create policy "prayer_insert_own" on public.prayer_requests for insert with check (auth.uid() = user_id);
create policy "prayer_update_own" on public.prayer_requests for update using (auth.uid() = user_id);
