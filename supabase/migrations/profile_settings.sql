alter table public.profiles add column if not exists reminder_enabled boolean default true;
alter table public.profiles add column if not exists default_visibility text default 'everyone';
