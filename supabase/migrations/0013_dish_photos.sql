alter table public.menu_items
  add column image_path text check (image_path is null or char_length(image_path) <= 160);

-- Sets (or clears, with null) a dish photo. Returns the old path so it can be deleted.
-- The file must live in the restaurant's own folder: <restaurant id>/dishes/<item id>-<time>.<ext>
create function public.set_dish_photo(p_item_id uuid, p_path text)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_restaurant uuid;
  v_old text;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select m.restaurant_id, m.image_path into v_restaurant, v_old
    from public.menu_items m where m.id = p_item_id for update;
  if not found then raise exception 'item_not_found'; end if;
  if not (public.is_admin() or exists (
    select 1 from public.restaurants r where r.id = v_restaurant and r.owner_id = v_user)) then
    raise exception 'not_allowed';
  end if;
  if p_path is not null
     and p_path !~ ('^' || v_restaurant::text || '/dishes/' || p_item_id::text || '-[0-9]{10,16}\.(jpg|png|webp)$') then
    raise exception 'bad_path';
  end if;
  update public.menu_items m set image_path = p_path where m.id = p_item_id;
  return v_old;
end;
$$;
revoke execute on function public.set_dish_photo(uuid, text) from public, anon;
grant execute on function public.set_dish_photo(uuid, text) to authenticated;