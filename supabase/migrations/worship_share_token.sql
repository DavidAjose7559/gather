alter table public.worship_events
add column if not exists share_token text unique default null;

create index if not exists idx_worship_events_share_token
on public.worship_events(share_token);
