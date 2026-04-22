alter table public.profiles
add column if not exists is_worship_only boolean default false;
