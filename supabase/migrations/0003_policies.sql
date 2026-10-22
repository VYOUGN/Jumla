-- Jumla: row level security. Content is readable by signed-in people and
-- writable only by admins. Progress can be read by its owner (and admins) and is
-- written only through record_events(); no policy anywhere allows a delete.

alter table public.app_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.units enable row level security;
alter table public.sentences enable row level security;
alter table public.questions enable row level security;
alter table public.words enable row level security;
alter table public.progress_events enable row level security;
alter table public.item_progress enable row level security;
alter table public.unit_progress enable row level security;
alter table public.user_stats enable row level security;
alter table public.reports enable row level security;

-- TRUNCATE ignores RLS, so take it away from the API roles entirely.
revoke truncate on all tables in schema public from anon, authenticated;
-- Progress tables are written only by security-definer functions.
revoke insert, update, delete on public.progress_events, public.item_progress,
  public.unit_progress, public.user_stats from anon, authenticated;

-- Settings ------------------------------------------------------------------
drop policy if exists "settings: admin read" on public.app_settings;
create policy "settings: admin read" on public.app_settings
  for select to authenticated using (public.is_admin());
drop policy if exists "settings: admin insert" on public.app_settings;
create policy "settings: admin insert" on public.app_settings
  for insert to authenticated with check (public.is_admin());
drop policy if exists "settings: admin update" on public.app_settings;
create policy "settings: admin update" on public.app_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Profiles ------------------------------------------------------------------
drop policy if exists "profiles: signed-in read" on public.profiles;
create policy "profiles: signed-in read" on public.profiles
  for select to authenticated using (true);
drop policy if exists "profiles: self or admin update" on public.profiles;
create policy "profiles: self or admin update" on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Content -------------------------------------------------------------------
drop policy if exists "units: read" on public.units;
create policy "units: read" on public.units
  for select to authenticated using (public.is_admin() or (published and not archived));
drop policy if exists "units: admin insert" on public.units;
create policy "units: admin insert" on public.units
  for insert to authenticated with check (public.is_admin());
drop policy if exists "units: admin update" on public.units;
create policy "units: admin update" on public.units
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "sentences: read" on public.sentences;
create policy "sentences: read" on public.sentences
  for select to authenticated using (
    public.is_admin() or (
      not archived and exists (
        select 1 from public.units u where u.id = unit_id and u.published and not u.archived
      )
    )
  );
drop policy if exists "sentences: admin insert" on public.sentences;
create policy "sentences: admin insert" on public.sentences
  for insert to authenticated with check (public.is_admin());
drop policy if exists "sentences: admin update" on public.sentences;
create policy "sentences: admin update" on public.sentences
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "questions: read" on public.questions;
create policy "questions: read" on public.questions
  for select to authenticated using (
    public.is_admin() or (
      not archived and exists (
        select 1 from public.units u where u.id = unit_id and u.published and not u.archived
      )
    )
  );
drop policy if exists "questions: admin insert" on public.questions;
create policy "questions: admin insert" on public.questions
  for insert to authenticated with check (public.is_admin());
drop policy if exists "questions: admin update" on public.questions;
create policy "questions: admin update" on public.questions
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "words: read" on public.words;
create policy "words: read" on public.words
  for select to authenticated using (
    public.is_admin() or (
      not archived and exists (
        select 1 from public.units u where u.id = unit_id and u.published and not u.archived
      )
    )
  );
drop policy if exists "words: admin insert" on public.words;
create policy "words: admin insert" on public.words
  for insert to authenticated with check (public.is_admin());
drop policy if exists "words: admin update" on public.words;
create policy "words: admin update" on public.words
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Progress ------------------------------------------------------------------
drop policy if exists "events: own or admin read" on public.progress_events;
create policy "events: own or admin read" on public.progress_events
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "item progress: own or admin read" on public.item_progress;
create policy "item progress: own or admin read" on public.item_progress
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "unit progress: own or admin read" on public.unit_progress;
create policy "unit progress: own or admin read" on public.unit_progress
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- XP and streaks are shared with friends for the leaderboard.
drop policy if exists "stats: signed-in read" on public.user_stats;
create policy "stats: signed-in read" on public.user_stats
  for select to authenticated using (true);

-- Reports -------------------------------------------------------------------
drop policy if exists "reports: own insert" on public.reports;
create policy "reports: own insert" on public.reports
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "reports: own or admin read" on public.reports;
create policy "reports: own or admin read" on public.reports
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists "reports: admin update" on public.reports;
create policy "reports: admin update" on public.reports
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
