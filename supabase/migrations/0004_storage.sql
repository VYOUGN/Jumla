-- Jumla: public bucket for cover images; only admins upload.
-- Wrapped so a project that restricts storage DDL still finishes setup
-- (covers then fall back to the built-in gradient + emoji).

do $$
begin
  insert into storage.buckets (id, name, public)
  values ('covers', 'covers', true)
  on conflict (id) do nothing;

  execute 'drop policy if exists "covers: admin upload" on storage.objects';
  execute $p$create policy "covers: admin upload" on storage.objects
    for insert to authenticated with check (bucket_id = 'covers' and public.is_admin())$p$;
  execute 'drop policy if exists "covers: admin update" on storage.objects';
  execute $p$create policy "covers: admin update" on storage.objects
    for update to authenticated using (bucket_id = 'covers' and public.is_admin())$p$;
exception when others then
  raise notice 'Skipped storage setup: %', sqlerrm;
end;
$$;
