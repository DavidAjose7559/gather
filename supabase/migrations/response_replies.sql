alter table public.responses
add column if not exists parent_id uuid references public.responses(id) on delete cascade;
