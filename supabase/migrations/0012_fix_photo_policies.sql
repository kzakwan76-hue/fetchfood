drop policy "owners add photos" on storage.objects;
drop policy "owners replace photos" on storage.objects;
drop policy "owners delete photos" on storage.objects;

create policy "owners add photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'restaurant-photos'
    and (public.is_admin() or exists (
      select 1 from public.restaurants r
      where r.id::text = (storage.foldername(objects.name))[1]
        and r.owner_id = (select auth.uid())))
  );

create policy "owners replace photos" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'restaurant-photos'
    and (public.is_admin() or exists (
      select 1 from public.restaurants r
      where r.id::text = (storage.foldername(objects.name))[1]
        and r.owner_id = (select auth.uid())))
  )
  with check (
    bucket_id = 'restaurant-photos'
    and (public.is_admin() or exists (
      select 1 from public.restaurants r
      where r.id::text = (storage.foldername(objects.name))[1]
        and r.owner_id = (select auth.uid())))
  );

create policy "owners delete photos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'restaurant-photos'
    and (public.is_admin() or exists (
      select 1 from public.restaurants r
      where r.id::text = (storage.foldername(objects.name))[1]
        and r.owner_id = (select auth.uid())))
  );