alter table public.profiles
add column if not exists is_demo boolean default false;
