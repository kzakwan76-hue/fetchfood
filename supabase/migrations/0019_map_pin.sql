alter table public.orders
  add column delivery_lat double precision check (delivery_lat is null or delivery_lat between 23.5 and 37.5),
  add column delivery_lng double precision check (delivery_lng is null or delivery_lng between 60.8 and 77.9),
  add constraint orders_pin_pair check ((delivery_lat is null) = (delivery_lng is null));
-- Not added to the column grants on purpose: only the functions below can read them.

alter table public.saved_addresses
  add column lat double precision check (lat is null or lat between 23.5 and 37.5),
  add column lng double precision check (lng is null or lng between 60.8 and 77.9),
  add constraint saved_addresses_pin_pair check ((lat is null) = (lng is null));

-- The customer sets or moves the pin until the order is on the road.
create function public.set_order_location(p_order_id uuid, p_lat double precision, p_lng double precision)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_order public.orders%rowtype;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if p_lat is null or p_lng is null
     or p_lat not between 23.5 and 37.5 or p_lng not between 60.8 and 77.9 then
    raise exception 'bad_location';
  end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.customer_id is distinct from v_user then raise exception 'order_not_found'; end if;
  if v_order.status not in ('placed', 'accepted', 'preparing') then raise exception 'invalid_transition'; end if;
  update public.orders
     set delivery_lat = round(p_lat::numeric, 6)::double precision,
         delivery_lng = round(p_lng::numeric, 6)::double precision
   where id = p_order_id;
end;
$$;

-- The rider sees the pin only for their own order, only after the handover.
create function public.rider_order_location(p_order_id uuid)
returns table (l_lat double precision, l_lng double precision)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_rider() then raise exception 'not_rider'; end if;
  return query
    select o.delivery_lat, o.delivery_lng from public.orders o
     where o.id = p_order_id and o.rider_id = (select auth.uid())
       and o.status = 'out_for_delivery' and o.delivery_lat is not null;
end;
$$;

create function public.admin_order_location(p_id uuid)
returns table (l_lat double precision, l_lng double precision)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query select o.delivery_lat, o.delivery_lng from public.orders o where o.id = p_id;
end;
$$;

-- Saved addresses remember their pin. Same name, so the old two-argument version is replaced.
drop function public.save_address(text, text);
create function public.save_address(
  p_label text, p_address text, p_lat double precision default null, p_lng double precision default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_label text := left(trim(coalesce(p_label, '')), 30);
  v_address text := trim(coalesce(p_address, ''));
  v_lat double precision := p_lat;
  v_lng double precision := p_lng;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if v_label = '' then v_label := 'Saved'; end if;
  if char_length(v_address) not between 10 and 300 then raise exception 'bad_address'; end if;
  if v_lat is null or v_lng is null
     or v_lat not between 23.5 and 37.5 or v_lng not between 60.8 and 77.9 then
    v_lat := null;
    v_lng := null;
  end if;
  if exists (select 1 from public.saved_addresses a
             where a.user_id = v_user and lower(a.address) = lower(v_address)) then
    if v_lat is not null then
      update public.saved_addresses a set lat = v_lat, lng = v_lng
       where a.user_id = v_user and lower(a.address) = lower(v_address);
    end if;
    return;
  end if;
  if (select count(*) from public.saved_addresses a where a.user_id = v_user) >= 5 then
    raise exception 'too_many';
  end if;
  insert into public.saved_addresses (user_id, label, address, lat, lng)
  values (v_user, v_label, v_address, v_lat, v_lng);
end;
$$;

revoke execute on function public.set_order_location(uuid, double precision, double precision) from public, anon;
revoke execute on function public.rider_order_location(uuid) from public, anon;
revoke execute on function public.admin_order_location(uuid) from public, anon;
revoke execute on function public.save_address(text, text, double precision, double precision) from public, anon;
grant execute on function public.set_order_location(uuid, double precision, double precision) to authenticated;
grant execute on function public.rider_order_location(uuid) to authenticated;
grant execute on function public.admin_order_location(uuid) to authenticated;
grant execute on function public.save_address(text, text, double precision, double precision) to authenticated;