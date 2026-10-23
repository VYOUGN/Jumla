-- Jumla: only signed-in people can call database functions, and only the ones the
-- app uses. Helpers (invite code check, admin email check, XP, missions) stay
-- private: they still work inside triggers and security-definer functions, which
-- run with their owner's rights. Run this after deploying the app version that
-- no longer calls check_invite_code from the sign-up page.

revoke execute on all functions in schema public from public, anon, authenticated;

-- Used inside row level security policies, which run as the caller.
grant execute on function public.is_admin() to authenticated;

-- Called by the app.
grant execute on function public.record_events(jsonb) to authenticated;
grant execute on function public.weekly_leaderboard(date) to authenticated;
grant execute on function public.unit_summaries(text) to authenticated;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;
