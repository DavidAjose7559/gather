create table public.birthdays (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  month integer not null check (month between 1 and 12),
  day integer not null check (day between 1 and 31),
  created_at timestamptz default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_date date not null,
  event_time text,
  location text,
  created_by uuid references public.profiles not null,
  created_at timestamptz default now()
);

create table public.event_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events on delete cascade not null,
  user_id uuid references public.profiles not null,
  status text not null check (status in ('going', 'not_going', 'maybe')),
  unique(event_id, user_id)
);

-- Pre-load all birthdays
insert into public.birthdays (name, month, day) values
  ('Fruitful', 2, 3),
  ('Kennedy', 2, 8),
  ('Rena', 2, 9),
  ('Amaka', 2, 21),
  ('Abraham', 3, 3),
  ('Michelle', 3, 14),
  ('Makeda', 3, 29),
  ('Boma', 4, 11),
  ('Lola', 4, 12),
  ('Corban', 4, 21),
  ('Abbie', 4, 30),
  ('Tovs', 5, 5),
  ('Kunle', 5, 12),
  ('Esther', 5, 16),
  ('Kiisi', 5, 20),
  ('Anita', 5, 28),
  ('Victor', 6, 1),
  ('David', 6, 30),
  ('Ebenezer', 7, 2),
  ('Momo', 7, 14),
  ('Grace', 8, 30),
  ('Femi', 9, 6),
  ('Yinka', 9, 10),
  ('Precious', 10, 31),
  ('Ella S', 11, 17),
  ('Sophia', 11, 21),
  ('Ella E', 11, 23),
  ('Daniel', 11, 24),
  ('Glory', 12, 12);
