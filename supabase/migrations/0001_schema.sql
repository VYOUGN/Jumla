-- Jumla: tables for content, progress, reports and settings.
-- Every statement is re-runnable so the combined setup.sql can be pasted more than once.

-- gen_random_uuid() is built into Postgres 13+, no extension needed.

-- ---------------------------------------------------------------------------
-- Settings and people
-- ---------------------------------------------------------------------------

create table if not exists public.app_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value) values
  ('invite_code', ''),
  ('admin_emails', '')
on conflict (key) do nothing;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Content. A unit is a story, a listening passage or a word list.
-- Nothing here is ever hard-deleted from the app: "delete" means archived = true,
-- so progress that points at an item keeps pointing at something real.
-- ---------------------------------------------------------------------------

create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('story', 'passage', 'word_list')),
  slug text not null unique,
  title_en text not null,
  title_ar text not null default '',
  description_en text not null default '',
  description_ar text not null default '',
  level text not null default 'A1' check (level in ('A1', 'A2', 'B1', 'B2', 'C1')),
  theme text not null default 'teal',
  emoji text not null default '📖',
  cover_url text,
  sort_order int not null default 0,
  published boolean not null default true,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists units_type_order on public.units (type, sort_order);

create table if not exists public.sentences (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units (id) on delete restrict,
  position int not null default 0,
  text_en text not null,
  text_ar text not null default '',
  -- [{ "w": "walked", "ar": "مشى" }, ...] aligned with the words of text_en
  word_hints jsonb not null default '[]'::jsonb,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sentences_unit_position on public.sentences (unit_id, position);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units (id) on delete restrict,
  position int not null default 0,
  prompt_en text not null,
  prompt_ar text not null default '',
  options jsonb not null default '[]'::jsonb,
  correct_index int not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists questions_unit_position on public.questions (unit_id, position);

create table if not exists public.words (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units (id) on delete restrict,
  position int not null default 0,
  word text not null,
  translation_ar text not null default '',
  example_en text not null default '',
  example_ar text not null default '',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists words_unit_position on public.words (unit_id, position);

-- ---------------------------------------------------------------------------
-- Progress. progress_events is append-only; everything else is derived from it
-- by the apply_progress_event trigger. user_id deliberately has no foreign key:
-- even if an account is deleted, its history stays and can be re-linked.
-- ---------------------------------------------------------------------------

create table if not exists public.progress_events (
  id uuid primary key,
  user_id uuid not null,
  kind text not null check (kind in ('sentence', 'word', 'question', 'unit_complete', 'mission')),
  item_id uuid,
  unit_id uuid,
  position int,
  accuracy real,
  wpm real,
  word_count int not null default 0,
  correct boolean,
  mission text,
  xp int not null default 0,
  local_date date not null,
  client_ts timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists progress_events_user_date on public.progress_events (user_id, local_date);
create unique index if not exists progress_events_one_mission_per_day
  on public.progress_events (user_id, local_date, mission) where kind = 'mission';

create table if not exists public.item_progress (
  user_id uuid not null,
  item_id uuid not null,
  kind text not null,
  unit_id uuid,
  best_accuracy real not null default 0,
  completions int not null default 0,
  first_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  primary key (user_id, item_id)
);
create index if not exists item_progress_user_unit on public.item_progress (user_id, unit_id);

create table if not exists public.unit_progress (
  user_id uuid not null,
  unit_id uuid not null,
  cursor int not null default 0,
  cursor_ts timestamptz,
  completions int not null default 0,
  last_at timestamptz not null default now(),
  primary key (user_id, unit_id)
);

create table if not exists public.user_stats (
  user_id uuid primary key,
  xp int not null default 0,
  words_typed int not null default 0,
  sentences_done int not null default 0,
  sessions int not null default 0,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_active_date date,
  freezes int not null default 0,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Error reports from learners
-- ---------------------------------------------------------------------------

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  unit_id uuid,
  item_id uuid,
  item_type text not null default 'sentence' check (item_type in ('sentence', 'word', 'question', 'unit')),
  message text not null check (char_length(message) between 1 and 1000),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists reports_status on public.reports (status, created_at desc);
