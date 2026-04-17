-- Sermon curriculum (named series/plans)
create table if not exists sermon_curriculum (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table sermon_curriculum enable row level security;

create policy "authenticated can read curriculum"
  on sermon_curriculum for select
  to authenticated using (true);

create policy "admin can insert curriculum"
  on sermon_curriculum for insert
  to authenticated
  with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "admin can update curriculum"
  on sermon_curriculum for update
  to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "admin can delete curriculum"
  on sermon_curriculum for delete
  to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Daily sermon schedule
create table if not exists sermon_schedule (
  id uuid primary key default gen_random_uuid(),
  schedule_date date not null unique,
  curriculum_id uuid references sermon_curriculum(id) on delete set null,
  episode_id text,
  episode_title text not null,
  episode_description text,
  episode_image_url text,
  episode_url text,
  source text not null default 'manual' check (source in ('spotify', 'manual')),
  youtube_url text,
  theme text,
  notes text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table sermon_schedule enable row level security;

create policy "authenticated can read schedule"
  on sermon_schedule for select
  to authenticated using (true);

create policy "admin can insert schedule"
  on sermon_schedule for insert
  to authenticated
  with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "admin can update schedule"
  on sermon_schedule for update
  to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "admin can delete schedule"
  on sermon_schedule for delete
  to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Discussion posts on sermon schedule entries
create table if not exists sermon_discussions (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references sermon_schedule(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table sermon_discussions enable row level security;

create policy "authenticated can read discussions"
  on sermon_discussions for select
  to authenticated using (true);

create policy "authenticated can insert own discussion"
  on sermon_discussions for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "owner can delete own discussion"
  on sermon_discussions for delete
  to authenticated
  using (auth.uid() = user_id);
