-- Step 1: Update existing values first
update public.check_ins set prayer_life = 'not_today' where prayer_life = 'weak';
update public.check_ins set prayer_life = 'yes' where prayer_life = 'strong';
update public.check_ins set prayer_life = 'a_little' where prayer_life = 'somewhat';
update public.check_ins set prayer_life = null where prayer_life not in ('yes', 'a_little', 'not_today') and prayer_life is not null;

-- Step 2: Drop old constraint
alter table public.check_ins
drop constraint if exists check_ins_prayer_life_check;

-- Step 3: Add new constraint
alter table public.check_ins
add constraint check_ins_prayer_life_check
check (prayer_life in ('yes', 'a_little', 'not_today'));
