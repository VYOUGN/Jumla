-- Jumla: let an admin remove a member's account.
-- The login and profile go (profiles cascade from auth.users). Progress rows have
-- no foreign key, so they stay in the database and can be re-linked by hand if a
-- deletion was a mistake. Admins (including yourself) can't be deleted here:
-- make them a member first, which also protects the last admin.

create or replace function public.admin_delete_user(p_user uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'only an admin can delete members';
  end if;
  if p_user = auth.uid() then
    raise exception 'cannot delete yourself';
  end if;
  if exists (select 1 from public.profiles where id = p_user and role = 'admin') then
    raise exception 'cannot delete an admin';
  end if;
  delete from auth.users where id = p_user;
  if not found then
    raise exception 'member not found';
  end if;
end;
$$;

revoke all on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_delete_user(uuid) to authenticated;
