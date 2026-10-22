-- Jumla: remember which guided tours each person has finished, across devices.
-- A learner updates their own row (RLS "profiles: self or admin update" and the
-- table-level UPDATE grant from 0005 already cover the new column).
alter table public.profiles add column if not exists tours_seen text[] not null default '{}';
