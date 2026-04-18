-- Unique constraint prevents double check-ins from same user on same day
create unique index if not exists check_ins_user_date_unique
  on check_ins (user_id, check_in_date);

-- check_ins query patterns
create index if not exists check_ins_check_in_date
  on check_ins (check_in_date);

create index if not exists check_ins_user_id
  on check_ins (user_id);

-- responses
create index if not exists responses_check_in_id
  on responses (check_in_id);

-- visibility_grants
create index if not exists visibility_grants_check_in_id
  on visibility_grants (check_in_id);

create index if not exists visibility_grants_granted_to
  on visibility_grants (granted_to);

-- prayer
create index if not exists prayer_requests_user_id
  on prayer_requests (user_id);

create index if not exists prayer_praying_prayer_id_user_id
  on prayer_praying (prayer_id, user_id);

-- sermon schedule and discussions
create index if not exists sermon_schedule_schedule_date
  on sermon_schedule (schedule_date);

create index if not exists sermon_discussions_schedule_id
  on sermon_discussions (schedule_id);

-- profiles
create index if not exists profiles_email
  on profiles (email);
