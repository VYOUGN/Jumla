-- Jumla: security review fixes. Compatible with the app versions before and after it.

-- ---------------------------------------------------------------------------
-- XP: compare REAL accuracy with REAL constants. "0.95" alone is numeric, and a
-- REAL 0.95 is slightly below it, so a sentence at exactly 95% earned 7 XP, not 10.
-- ---------------------------------------------------------------------------

create or replace function public.xp_for(p_kind text, p_accuracy real, p_correct boolean, p_mission text)
returns int
language sql immutable
as $$
  select case p_kind
    when 'sentence' then case when p_accuracy >= 0.95::real then 10 when p_accuracy >= 0.8::real then 7 else 5 end
    when 'word' then case when p_accuracy >= 0.95::real then 4 else 2 end
    when 'question' then case when p_correct then 5 else 1 end
    when 'unit_complete' then 20
    when 'mission' then public.mission_xp(p_mission)
    else 0
  end;
$$;

-- Whether a person's practice on a day meets a mission (mirrors MISSIONS in lib/gamification.ts).
create or replace function public.mission_done(p_user uuid, p_date date, p_mission text)
returns boolean
language sql stable security definer set search_path = public
as $$
  with e as (
    select kind, accuracy, correct, xp
    from public.progress_events
    where user_id = p_user and local_date = p_date
  )
  select case p_mission
    when 'sentences_10' then (select count(*) from e where kind = 'sentence') >= 10
    when 'sentences_25' then (select count(*) from e where kind = 'sentence') >= 25
    when 'accurate_5' then (select count(*) from e where kind = 'sentence' and accuracy >= 0.95::real) >= 5
    when 'finish_unit' then (select count(*) from e where kind = 'unit_complete') >= 1
    when 'words_10' then (select count(*) from e where kind = 'word') >= 10
    when 'questions_3' then (select count(*) from e where kind = 'question' and correct) >= 3
    when 'xp_100' then (select coalesce(sum(xp), 0) from e where kind <> 'mission') >= 100
    else false
  end;
$$;

-- ---------------------------------------------------------------------------
-- record_events: progress must point at real content, missions must be earned,
-- repeats stop paying XP, and one call can't flood the database.
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
  v_item uuid;
  v_unit uuid;
  v_mission text;
  v_date date;
  v_xp int;
  n int;
  inserted int := 0;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_events is null or jsonb_typeof(p_events) <> 'array' then
    return 0;
  end if;
  if jsonb_array_length(p_events) > 500 then
    raise exception 'too many events in one batch';
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
      v_item := nullif(e ->> 'item_id', '')::uuid;
      v_unit := nullif(e ->> 'unit_id', '')::uuid;
      v_mission := nullif(e ->> 'mission', '');
      v_date := least(greatest(coalesce((e ->> 'local_date')::date, current_date), current_date - 60), current_date + 1);

      -- Practice has to be on content that exists (archived content still counts).
      if k = 'sentence' and not exists (select 1 from public.sentences s where s.id = v_item and s.unit_id = v_unit) then
        continue;
      end if;
      if k = 'word' and not exists (select 1 from public.words w where w.id = v_item and w.unit_id = v_unit) then
        continue;
      end if;
      if k = 'question' and not exists (select 1 from public.questions q where q.id = v_item and q.unit_id = v_unit) then
        continue;
      end if;
      if k = 'unit_complete' and not exists (select 1 from public.units u where u.id = v_unit) then
        continue;
      end if;
      -- A mission pays only when that day's recorded practice really meets it.
      if k = 'mission' and not public.mission_done(uid, v_date, v_mission) then
        continue;
      end if;

      -- Repeats still count as practice, but stop earning XP.
      v_xp := public.xp_for(k, coalesce(acc, 0), coalesce(ok, false), v_mission);
      if k in ('sentence', 'word') and (
        select count(*) from public.progress_events p
        where p.user_id = uid and p.item_id = v_item and p.local_date = v_date
      ) >= 3 then
        v_xp := 0;
      end if;
      if k = 'question' and exists (
        select 1 from public.progress_events p
        where p.user_id = uid and p.item_id = v_item and p.local_date = v_date
      ) then
        v_xp := 0;
      end if;
      if k = 'unit_complete' and exists (
        select 1 from public.progress_events p
        where p.user_id = uid and p.kind = 'unit_complete' and p.unit_id = v_unit and p.local_date = v_date
      ) then
        v_xp := 0;
      end if;

      insert into public.progress_events (
        id, user_id, kind, item_id, unit_id, position, accuracy, wpm, word_count,
        correct, mission, xp, local_date, client_ts
      ) values (
        (e ->> 'id')::uuid,
        uid,
        k,
        v_item,
        v_unit,
        round((e ->> 'position')::numeric)::int,
        acc,
        least(greatest(coalesce((e ->> 'wpm')::real, 0), 0), 400),
        least(greatest(coalesce(round((e ->> 'word_count')::numeric)::int, 0), 0), 80),
        ok,
        v_mission,
        v_xp,
        v_date,
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
-- Streaks only move for practice dated close to when the server receives it,
-- so a backdated batch can't build a long streak in one go (two days of slack
-- cover time zones and a short time offline).
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

  if new.local_date >= (new.created_at at time zone 'utc')::date - 2 then
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
  end if;

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

-- ---------------------------------------------------------------------------
-- Admin by email only creates the very first admin. Afterwards a listed email
-- needs the invite code like everyone else and joins as a member; admins promote
-- each other from the Users page.
-- ---------------------------------------------------------------------------

create or replace function public.enforce_invite_code()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  first_admin boolean := public.is_admin_email(new.email)
    and not exists (select 1 from public.profiles where role = 'admin');
begin
  if not first_admin and not public.check_invite_code(coalesce(new.raw_user_meta_data ->> 'invite_code', '')) then
    raise exception 'invalid_invite_code';
  end if;
  new.raw_user_meta_data := coalesce(new.raw_user_meta_data, '{}'::jsonb) - 'invite_code';
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    left(coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'learner'
    ), 40),
    case
      when public.is_admin_email(new.email) and not exists (select 1 from public.profiles where role = 'admin')
        then 'admin'
      else 'member'
    end
  )
  on conflict (id) do nothing;
  insert into public.user_stats (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Display names: at most 40 characters, whichever way they are written.
-- ---------------------------------------------------------------------------

update public.profiles set display_name = left(display_name, 40) where char_length(display_name) > 40;
alter table public.profiles drop constraint if exists profiles_display_name_length;
alter table public.profiles add constraint profiles_display_name_length check (char_length(display_name) <= 40);

-- ---------------------------------------------------------------------------
-- Cover images: common image types only, up to 5 MB.
-- ---------------------------------------------------------------------------

do $$
begin
  update storage.buckets
     set file_size_limit = 5242880,
         allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
   where id = 'covers';
exception when others then
  raise notice 'Skipped cover bucket limits: %', sqlerrm;
end;
$$;
