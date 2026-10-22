-- Jumla: helper functions, progress triggers and RPCs.

-- ---------------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_admin_email(p_email text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.app_settings s,
         unnest(string_to_array(s.value, ',')) as e(addr)
    where s.key = 'admin_emails'
      and lower(trim(e.addr)) <> ''
      and lower(trim(e.addr)) = lower(trim(p_email))
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists units_updated_at on public.units;
create trigger units_updated_at before update on public.units
  for each row execute function public.set_updated_at();
drop trigger if exists sentences_updated_at on public.sentences;
create trigger sentences_updated_at before update on public.sentences
  for each row execute function public.set_updated_at();
drop trigger if exists questions_updated_at on public.questions;
create trigger questions_updated_at before update on public.questions
  for each row execute function public.set_updated_at();
drop trigger if exists words_updated_at on public.words;
create trigger words_updated_at before update on public.words
  for each row execute function public.set_updated_at();

-- A member can rename themselves but never change roles; the last admin cannot be demoted.
create or replace function public.protect_profile()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.id <> old.id then
    raise exception 'profile id cannot change';
  end if;
  if new.role is distinct from old.role then
    if auth.uid() is not null and not public.is_admin() then
      raise exception 'only an admin can change roles';
    end if;
    if old.role = 'admin' and (select count(*) from public.profiles where role = 'admin') <= 1 then
      raise exception 'cannot remove the last admin';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect on public.profiles;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile();

-- ---------------------------------------------------------------------------
-- Sign-up: invite code check and profile creation
-- ---------------------------------------------------------------------------

create or replace function public.check_invite_code(p_code text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select value = '' or value = trim(p_code) from public.app_settings where key = 'invite_code'),
    true
  );
$$;

create or replace function public.enforce_invite_code()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin_email(new.email)
     and not public.check_invite_code(coalesce(new.raw_user_meta_data ->> 'invite_code', '')) then
    raise exception 'invalid_invite_code';
  end if;
  -- The code has done its job; don't keep it in the user's metadata.
  new.raw_user_meta_data := coalesce(new.raw_user_meta_data, '{}'::jsonb) - 'invite_code';
  return new;
end;
$$;

drop trigger if exists jumla_enforce_invite_code on auth.users;
create trigger jumla_enforce_invite_code before insert on auth.users
  for each row execute function public.enforce_invite_code();

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)),
    case when public.is_admin_email(new.email) then 'admin' else 'member' end
  )
  on conflict (id) do nothing;
  insert into public.user_stats (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists jumla_on_auth_user_created on auth.users;
create trigger jumla_on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- XP. Keep these numbers in sync with lib/gamification.ts.
-- ---------------------------------------------------------------------------

create or replace function public.mission_xp(p_mission text)
returns int
language sql immutable
as $$
  select case p_mission
    when 'sentences_10' then 15
    when 'sentences_25' then 30
    when 'accurate_5' then 20
    when 'finish_unit' then 25
    when 'words_10' then 15
    when 'questions_3' then 15
    when 'xp_100' then 25
    else 0
  end;
$$;

create or replace function public.xp_for(p_kind text, p_accuracy real, p_correct boolean, p_mission text)
returns int
language sql immutable
as $$
  select case p_kind
    when 'sentence' then case when p_accuracy >= 0.95 then 10 when p_accuracy >= 0.8 then 7 else 5 end
    when 'word' then case when p_accuracy >= 0.95 then 4 else 2 end
    when 'question' then case when p_correct then 5 else 1 end
    when 'unit_complete' then 20
    when 'mission' then public.mission_xp(p_mission)
    else 0
  end;
$$;

-- ---------------------------------------------------------------------------
-- Derived progress. Runs once per *new* event (duplicates are skipped by
-- ON CONFLICT DO NOTHING, so they never fire this). Counters only grow,
-- best_accuracy only rises, and the resume cursor follows the newest client time.
-- ---------------------------------------------------------------------------

create or replace function public.apply_progress_event()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  s public.user_stats%rowtype;
  gap int;
begin
  if new.item_id is not null and new.kind in ('sentence', 'word', 'question') then
    insert into public.item_progress as ip (user_id, item_id, kind, unit_id, best_accuracy, completions, first_at, last_at)
    values (
      new.user_id, new.item_id, new.kind, new.unit_id,
      coalesce(new.accuracy, case when new.correct then 1 else 0 end),
      1, new.client_ts, new.client_ts
    )
    on conflict (user_id, item_id) do update set
      best_accuracy = greatest(ip.best_accuracy, excluded.best_accuracy),
      completions = ip.completions + 1,
      first_at = least(ip.first_at, excluded.first_at),
      last_at = greatest(ip.last_at, excluded.last_at);
  end if;

  if new.unit_id is not null and new.kind in ('sentence', 'word', 'unit_complete') then
    insert into public.unit_progress as up (user_id, unit_id, cursor, cursor_ts, completions, last_at)
    values (
      new.user_id, new.unit_id,
      coalesce(new.position, 0),
      case when new.kind = 'unit_complete' then null else new.client_ts end,
      case when new.kind = 'unit_complete' then 1 else 0 end,
      new.client_ts
    )
    on conflict (user_id, unit_id) do update set
      cursor = case
        when excluded.cursor_ts is not null and (up.cursor_ts is null or excluded.cursor_ts >= up.cursor_ts)
          then excluded.cursor
        else up.cursor
      end,
      cursor_ts = case
        when excluded.cursor_ts is not null and (up.cursor_ts is null or excluded.cursor_ts >= up.cursor_ts)
          then excluded.cursor_ts
        else up.cursor_ts
      end,
      completions = up.completions + excluded.completions,
      last_at = greatest(up.last_at, excluded.last_at);
  end if;

  insert into public.user_stats (user_id) values (new.user_id) on conflict (user_id) do nothing;
  select * into s from public.user_stats where user_id = new.user_id for update;

  s.xp := s.xp + new.xp;
  if new.kind in ('sentence', 'word') then
    s.words_typed := s.words_typed + greatest(new.word_count, 0);
  end if;
  if new.kind = 'sentence' then
    s.sentences_done := s.sentences_done + 1;
  end if;
  if new.kind = 'unit_complete' then
    s.sessions := s.sessions + 1;
  end if;

  -- Streak (mirrors nextStreak in lib/gamification.ts). An event dated on or
  -- before the last active day (a late offline sync) leaves the streak alone.
  if s.last_active_date is null then
    s.current_streak := 1;
    s.last_active_date := new.local_date;
  elsif new.local_date > s.last_active_date then
    gap := new.local_date - s.last_active_date - 1;
    if gap = 0 then
      s.current_streak := s.current_streak + 1;
    elsif s.freezes >= gap then
      s.freezes := s.freezes - gap;
      s.current_streak := s.current_streak + 1;
    else
      s.current_streak := 1;
    end if;
    if s.current_streak % 7 = 0 then
      s.freezes := least(s.freezes + 1, 2);
    end if;
    s.last_active_date := new.local_date;
  end if;
  s.longest_streak := greatest(s.longest_streak, s.current_streak);

  update public.user_stats set
    xp = s.xp,
    words_typed = s.words_typed,
    sentences_done = s.sentences_done,
    sessions = s.sessions,
    current_streak = s.current_streak,
    longest_streak = s.longest_streak,
    last_active_date = s.last_active_date,
    freezes = s.freezes,
    updated_at = now()
  where user_id = new.user_id;

  return new;
end;
$$;

drop trigger if exists progress_events_apply on public.progress_events;
create trigger progress_events_apply after insert on public.progress_events
  for each row execute function public.apply_progress_event();

-- ---------------------------------------------------------------------------
-- record_events: the only way progress gets written. The server decides the
-- user, the XP and the sane ranges. A malformed event is skipped instead of
-- failing the batch, so one bad row can never block a device's queue.
-- ---------------------------------------------------------------------------

create or replace function public.record_events(p_events jsonb)
returns int
language plpgsql security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  e jsonb;
  k text;
  acc real;
  ok boolean;
  n int;
  inserted int := 0;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_events is null or jsonb_typeof(p_events) <> 'array' then
    return 0;
  end if;

  for e in select value from jsonb_array_elements(p_events) loop
    begin
      k := e ->> 'kind';
      if k is null or k not in ('sentence', 'word', 'question', 'unit_complete', 'mission') then
        continue;
      end if;
      acc := case when e ->> 'accuracy' is null then null
                  else least(greatest((e ->> 'accuracy')::real, 0), 1) end;
      ok := (e ->> 'correct')::boolean;

      insert into public.progress_events (
        id, user_id, kind, item_id, unit_id, position, accuracy, wpm, word_count,
        correct, mission, xp, local_date, client_ts
      ) values (
        (e ->> 'id')::uuid,
        uid,
        k,
        nullif(e ->> 'item_id', '')::uuid,
        nullif(e ->> 'unit_id', '')::uuid,
        round((e ->> 'position')::numeric)::int,
        acc,
        least(greatest(coalesce((e ->> 'wpm')::real, 0), 0), 400),
        least(greatest(coalesce(round((e ->> 'word_count')::numeric)::int, 0), 0), 80),
        ok,
        nullif(e ->> 'mission', ''),
        public.xp_for(k, coalesce(acc, 0), coalesce(ok, false), e ->> 'mission'),
        least(greatest(coalesce((e ->> 'local_date')::date, current_date), current_date - 60), current_date + 1),
        least(coalesce((e ->> 'client_ts')::timestamptz, now()), now() + interval '1 day')
      )
      on conflict do nothing;

      get diagnostics n = row_count;
      inserted := inserted + n;
    exception when others then
      raise warning 'record_events skipped event %: %', e ->> 'id', sqlerrm;
    end;
  end loop;

  return inserted;
end;
$$;

-- ---------------------------------------------------------------------------
-- Leaderboard and admin views
-- ---------------------------------------------------------------------------

create or replace function public.weekly_leaderboard(p_from date)
returns table (
  user_id uuid,
  display_name text,
  xp bigint,
  current_streak int,
  last_active_date date,
  freezes int
)
language sql stable security definer set search_path = public
as $$
  select p.id, p.display_name, coalesce(w.xp, 0), coalesce(s.current_streak, 0), s.last_active_date, coalesce(s.freezes, 0)
  from public.profiles p
  left join (
    select e.user_id, sum(e.xp) as xp
    from public.progress_events e
    where e.local_date >= p_from
    group by e.user_id
  ) w on w.user_id = p.id
  left join public.user_stats s on s.user_id = p.id
  where auth.uid() is not null
  order by 3 desc, p.display_name;
$$;

create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  display_name text,
  role text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  xp int,
  sentences_done int,
  sessions int,
  current_streak int,
  last_active_date date
)
language sql stable security definer set search_path = public
as $$
  select p.id, u.email::text, p.display_name, p.role, p.created_at, u.last_sign_in_at,
         coalesce(s.xp, 0), coalesce(s.sentences_done, 0), coalesce(s.sessions, 0),
         coalesce(s.current_streak, 0), s.last_active_date
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.user_stats s on s.user_id = p.id
  where public.is_admin()
  order by p.created_at;
$$;

-- Per-unit item counts and the caller's progress, for lesson cards.
-- security invoker: it sees exactly what the caller's RLS allows.
create or replace function public.unit_summaries(p_type text default null)
returns table (unit_id uuid, total int, done int, completions int, last_at timestamptz)
language sql stable security invoker set search_path = public
as $$
  with items as (
    select s.unit_id, s.id from public.sentences s where not s.archived
    union all
    select w.unit_id, w.id from public.words w where not w.archived
  )
  select
    u.id,
    (select count(*) from items i where i.unit_id = u.id)::int,
    (select count(*) from items i
       join public.item_progress ip on ip.item_id = i.id and ip.user_id = auth.uid()
     where i.unit_id = u.id)::int,
    coalesce(up.completions, 0),
    up.last_at
  from public.units u
  left join public.unit_progress up on up.unit_id = u.id and up.user_id = auth.uid()
  where (p_type is null or u.type = p_type) and u.published and not u.archived;
$$;

revoke all on function public.unit_summaries(text) from public, anon;
grant execute on function public.unit_summaries(text) to authenticated;
revoke all on function public.record_events(jsonb) from public, anon;
grant execute on function public.record_events(jsonb) to authenticated;
revoke all on function public.weekly_leaderboard(date) from public, anon;
grant execute on function public.weekly_leaderboard(date) to authenticated;
revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.check_invite_code(text) to anon, authenticated;
