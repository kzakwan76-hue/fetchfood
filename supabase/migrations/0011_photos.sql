alter table public.restaurants
  add column image_path text check (image_path is null or char_length(image_path) <= 120);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('restaurant-photos', 'restaurant-photos', true, 2097152,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 2097152,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

create policy "photos are public" on storage.objects
  for select to anon, authenticated using (bucket_id = 'restaurant-photos');

create policy "owners add photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'restaurant-photos'
    and (public.is_admin() or exists (
      select 1 from public.restaurants r
      where r.id::text = (storage.foldername(name))[1] and r.owner_id = (select auth.uid())))
  );

create policy "owners replace photos" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'restaurant-photos'
    and (public.is_admin() or exists (
      select 1 from public.restaurants r
      where r.id::text = (storage.foldername(name))[1] and r.owner_id = (select auth.uid())))
  )
  with check (
    bucket_id = 'restaurant-photos'
    and (public.is_admin() or exists (
      select 1 from public.restaurants r
      where r.id::text = (storage.foldername(name))[1] and r.owner_id = (select auth.uid())))
  );

create policy "owners delete photos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'restaurant-photos'
    and (public.is_admin() or exists (
      select 1 from public.restaurants r
      where r.id::text = (storage.foldername(name))[1] and r.owner_id = (select auth.uid())))
  );

-- Sets (or clears, with null) a restaurant's photo path. Returns the old path so it can be deleted.
create function public.set_restaurant_photo(p_restaurant_id uuid, p_path text)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_old text;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select image_path into v_old from public.restaurants where id = p_restaurant_id for update;
  if not found then raise exception 'restaurant_not_found'; end if;
  if not (public.is_admin() or exists (
    select 1 from public.restaurants r where r.id = p_restaurant_id and r.owner_id = v_user)) then
    raise exception 'not_allowed';
  end if;
  if p_path is not null
     and p_path !~ ('^' || p_restaurant_id::text || '/[0-9]{10,16}\.(jpg|png|webp)$') then
    raise exception 'bad_path';
  end if;
  update public.restaurants set image_path = p_path where id = p_restaurant_id;
  return v_old;
end;
$$;
revoke execute on function public.set_restaurant_photo(uuid, text) from public, anon;
grant execute on function public.set_restaurant_photo(uuid, text) to authenticated;