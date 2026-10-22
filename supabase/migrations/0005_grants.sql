-- Jumla: explicit API access.
-- Newer Supabase projects can be created without "automatically expose new tables",
-- which leaves the anon/authenticated roles with no access to tables created by
-- migrations (every query then fails with "permission denied"). Grant exactly what
-- the app uses; row level security (0003) still decides which rows each person
-- sees or changes. Signed-out visitors (anon) get no table access at all, and no
-- role gets DELETE on anything.

grant usage on schema public to anon, authenticated;

grant select on
  public.app_settings,
  public.profiles,
  public.units,
  public.sentences,
  public.questions,
  public.words,
  public.progress_events,
  public.item_progress,
  public.unit_progress,
  public.user_stats,
  public.reports
to authenticated;

-- Content and settings: changed by admins only (enforced by RLS).
grant insert, update on public.units, public.sentences, public.questions, public.words, public.app_settings
  to authenticated;
-- Learners rename themselves; the protect_profile trigger guards the role column.
grant update on public.profiles to authenticated;
-- Learners file reports; admins mark them resolved.
grant insert, update on public.reports to authenticated;

-- Functions used inside row level security policies run as the caller.
grant execute on function public.is_admin() to authenticated;
