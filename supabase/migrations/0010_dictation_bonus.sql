-- Jumla: extra XP for typing with the letters hidden (dictation), and a daily
-- mission for it. Works with older app versions: they don't send "hidden", so
-- their events simply earn no bonus.

alter table public.progress_events add column if not exists hidden boolean not null default false;

-- Keep these numbers in sync with dictationBonus in lib/gamification.ts.
create or replace function public.dictation_bonus(p_kind text, p_accuracy real)
returns int
language sql immutable
as $$
  select case p_kind
    when 'sentence' then case when p_accuracy >= 0.95::real then 5 when p_accuracy >= 0.8::real then 3 else 1 end
    when 'word' then case when p_accuracy >= 0.95::real then 2 else 1 end
    else 0
  end;
$$;
revoke all on function public.dictation_bonus(text, real) from public, anon, authenticated;

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
    when 'dictation_5' then 20
    else 0
  end;
$$;

create or replace function public.mission_done(p_user uuid, p_date date, p_mission text)
returns boolean
language sql stable security definer set search_path = public
as $$
  with e as (
    select kind, accuracy, correct, xp, hidden
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
    when 'dictation_5' then (select count(*) from e where kind = 'sentence' and hidden) >= 5
    else false
  end;
$$;

-- Same as 0008, plus the "hidden" flag and its bonus (only while the item still earns XP).
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
  v_hidden boolean;
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
      v_hidden := k in ('sentence', 'word') and coalesce((e ->> 'hidden')::boolean, false);

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
      if k = 'mission' and not public.mission_done(uid, v_date, v_mission) then
        continue;
      end if;

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
      if v_hidden and v_xp > 0 then
        v_xp := v_xp + public.dictation_bonus(k, coalesce(acc, 0));
      end if;

      insert into public.progress_events (
        id, user_id, kind, item_id, unit_id, position, accuracy, wpm, word_count,
        correct, mission, xp, local_date, client_ts, hidden
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
        least(coalesce((e ->> 'client_ts')::timestamptz, now()), now() + interval '1 day'),
        v_hidden
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
