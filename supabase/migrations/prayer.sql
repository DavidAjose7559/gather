-- Drop and recreate prayer_requests with full schema
-- (original table in schema.sql only had id, user_id, body, is_resolved, created_at)
drop table if exists public.prayer_requests cascade;

create table public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles not null,
  body text not null,
  is_answered boolean default false,
  answered_note text,
  praying_count integer default 0,
  created_at timestamptz default now(),
  answered_at timestamptz
);

create table if not exists public.prayer_praying (
  id uuid primary key default gen_random_uuid(),
  prayer_id uuid references public.prayer_requests on delete cascade not null,
  user_id uuid references public.profiles not null,
  unique(prayer_id, user_id)
);

create table if not exists public.prayer_comments (
  id uuid primary key default gen_random_uuid(),
  prayer_id uuid references public.prayer_requests on delete cascade not null,
  user_id uuid references public.profiles not null,
  body text not null,
  created_at timestamptz default now()
);

-- RLS
alter table public.prayer_requests enable row level security;
alter table public.prayer_praying enable row level security;
alter table public.prayer_comments enable row level security;

create policy "prayer_requests_select" on public.prayer_requests for select using (auth.uid() is not null);
create policy "prayer_requests_insert" on public.prayer_requests for insert with check (auth.uid() = user_id);
create policy "prayer_requests_update_own" on public.prayer_requests for update using (auth.uid() = user_id);
create policy "prayer_requests_delete_own" on public.prayer_requests for delete using (auth.uid() = user_id);

create policy "prayer_praying_select" on public.prayer_praying for select using (auth.uid() is not null);
create policy "prayer_praying_insert" on public.prayer_praying for insert with check (auth.uid() = user_id);
create policy "prayer_praying_delete_own" on public.prayer_praying for delete using (auth.uid() = user_id);

create policy "prayer_comments_select" on public.prayer_comments for select using (auth.uid() is not null);
create policy "prayer_comments_insert" on public.prayer_comments for insert with check (auth.uid() = user_id);
create policy "prayer_comments_delete_own" on public.prayer_comments for delete using (auth.uid() = user_id);
