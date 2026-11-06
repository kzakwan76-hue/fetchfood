create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_role public.user_role;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select p.role into v_role from public.profiles p where p.id = v_user;
  if v_role in ('admin', 'restaurant_owner', 'rider') then raise exception 'role_blocked'; end if;
  if exists (select 1 from public.orders o where o.customer_id = v_user
             and o.status in ('placed', 'accepted', 'preparing', 'out_for_delivery')) then
    raise exception 'active_orders';
  end if;
  -- Orders are kept for the books, but the person's details are wiped from them.
  update public.orders
     set delivery_address = '[removed]', phone = '[removed]', note = null,
         delivery_lat = null, delivery_lng = null
   where customer_id = v_user;
  delete from auth.users where id = v_user;
end;
$$;

create function public.admin_set_restaurant_active(p_restaurant uuid, p_active boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_active is null then raise exception 'bad_input'; end if;
  perform 1 from public.restaurants r where r.id = p_restaurant for update;
  if not found then raise exception 'restaurant_not_found'; end if;
  if p_active is false and exists (
    select 1 from public.orders o where o.restaurant_id = p_restaurant
      and o.status in ('placed', 'accepted', 'preparing', 'out_for_delivery')) then
    raise exception 'has_open_orders';
  end if;
  update public.restaurants r
     set is_active = p_active, is_open = case when p_active then r.is_open else false end
   where r.id = p_restaurant;
end;
$$;

create function public.admin_update_restaurant(
  p_id uuid, p_name text, p_cuisine text, p_area text, p_eta integer, p_fee integer
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if char_length(trim(coalesce(p_name, ''))) not between 1 and 80 then raise exception 'bad_name'; end if;
  if char_length(trim(coalesce(p_cuisine, ''))) not between 1 and 40 then raise exception 'bad_cuisine'; end if;
  if char_length(trim(coalesce(p_area, ''))) not between 1 and 60 then raise exception 'bad_area'; end if;
  if p_eta is null or p_eta not between 5 and 180 then raise exception 'bad_eta'; end if;
  if p_fee is null or p_fee not between 0 and 2000 then raise exception 'bad_fee'; end if;
  update public.restaurants r
     set name = trim(p_name), cuisine = trim(p_cuisine), area = trim(p_area),
         eta_minutes = p_eta, delivery_fee_pkr = p_fee
   where r.id = p_id;
  if not found then raise exception 'restaurant_not_found'; end if;
end;
$$;

create function public.admin_set_restaurant_owner(p_restaurant uuid, p_email text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_new uuid;
  v_role public.user_role;
  v_old uuid;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  select r.owner_id into v_old from public.restaurants r where r.id = p_restaurant for update;
  if not found then raise exception 'restaurant_not_found'; end if;
  select u.id into v_new from auth.users u where lower(u.email) = lower(trim(p_email));
  if v_new is null then raise exception 'user_not_found'; end if;
  select p.role into v_role from public.profiles p where p.id = v_new for update;
  if v_role is null then raise exception 'user_not_found'; end if;
  if v_role in ('admin', 'rider') then raise exception 'owner_role_conflict'; end if;
  if v_role = 'customer' then
    update public.profiles set role = 'restaurant_owner' where id = v_new;
  end if;
  update public.restaurants set owner_id = v_new where id = p_restaurant;
  -- The previous owner goes back to being a customer if they own nothing else.
  if v_old is not null and v_old <> v_new
     and not exists (select 1 from public.restaurants r where r.owner_id = v_old) then
    update public.profiles p set role = 'customer' where p.id = v_old and p.role = 'restaurant_owner';
  end if;
end;
$$;

create function public.admin_update_zone(p_zone uuid, p_name text, p_active boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if char_length(trim(coalesce(p_name, ''))) not between 1 and 60 or p_active is null then
    raise exception 'bad_zone';
  end if;
  perform 1 from public.zones z where z.id = p_zone for update;
  if not found then raise exception 'zone_not_found'; end if;
  if p_active is false and exists (
    select 1 from public.restaurants r where r.zone_id = p_zone and r.is_active) then
    raise exception 'zone_in_use';
  end if;
  begin
    update public.zones set name = trim(p_name), is_active = p_active where id = p_zone;
  exception when unique_violation then
    raise exception 'zone_taken';
  end;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
revoke execute on function public.admin_set_restaurant_active(uuid, boolean) from public, anon;
revoke execute on function public.admin_update_restaurant(uuid, text, text, text, integer, integer) from public, anon;
revoke execute on function public.admin_set_restaurant_owner(uuid, text) from public, anon;
revoke execute on function public.admin_update_zone(uuid, text, boolean) from public, anon;
grant execute on function public.delete_my_account() to authenticated;
grant execute on function public.admin_set_restaurant_active(uuid, boolean) to authenticated;
grant execute on function public.admin_update_restaurant(uuid, text, text, text, integer, integer) to authenticated;
grant execute on function public.admin_set_restaurant_owner(uuid, text) to authenticated;
grant execute on function public.admin_update_zone(uuid, text, boolean) to authenticated;