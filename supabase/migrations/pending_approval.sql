alter table public.profiles add column if not exists is_approved boolean not null default false;

-- All existing accounts are already approved
update public.profiles set is_approved = true;
