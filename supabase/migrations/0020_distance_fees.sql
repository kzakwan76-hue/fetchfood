alter table public.restaurants
  add column lat double precision check (lat is null or lat between 23.5 and 37.5),
  add column lng double precision check (lng is null or lng between 60.8 and 77.9),
  add constraint restaurants_pin_pair check ((lat is null) = (lng is null));
-- Not in the column grants: only the functions below can read the coordinates.

alter table public.platform_settings
  add column fee_near_km numeric(4,1) not null default 2.5 check (fee_near_km between 0.5 and 10),
  add column fee_near_pkr integer not null default 150 check (fee_near_pkr between 0 and 2000),
  add column fee_mid_km numeric(4,1) not null default 4.0 check (fee_mid_km between 1 and 15),
  add column fee_mid_pkr integer not null default 200 check (fee_mid_pkr between 0 and 2000),
  add column fee_far_pkr integer not null default 250 check (fee_far_pkr between 0 and 2000),
  add column max_delivery_km numeric(4,1) not null default 7.0 check (max_delivery_km between 1 and 25);

-- Straight-line distance in km (haversine).
create function public.km_between(a_lat double precision, a_lng double precision, b_lat double precision, b_lng double precision)
returns double precision
language sql immutable set search_path = '' as $$
  select 2 * 6371 * asin(least(1, sqrt(
    power(sin(radians(b_lat - a_lat) / 2), 2) +
    cos(radians(a_lat)) * cos(radians(b_lat)) * power(sin(radians(b_lng - a_lng) / 2), 2))));
$$;

create function public.fee_for_km(p_km double precision) returns integer
language sql stable security definer set search_path = '' as $$
  select case when p_km <= s.fee_near_km then s.fee_near_pkr
              when p_km <= s.fee_mid_km then s.fee_mid_pkr
              else s.fee_far_pkr end
  from public.platform_settings s where s.id = 1;
$$;

-- What the checkout shows: 'flat' (restaurant has no location), 'no_pin', 'too_far' or 'ok'.
create function public.delivery_quote(p_restaurant uuid, p_lat double precision, p_lng double precision)
returns table (q_status text, q_km numeric, q_fee integer, q_max numeric)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_r public.restaurants%rowtype;
  v_max numeric;
  v_km double precision;
begin
  select * into v_r from public.restaurants r where r.id = p_restaurant and r.is_active;
  if not found then return; end if;
  select s.max_delivery_km into v_max from public.platform_settings s where s.id = 1;
  if v_r.lat is null then
    return query select 'flat'::text, null::numeric, v_r.delivery_fee_pkr, v_max;
    return;
  end if;
  if p_lat is null or p_lng is null or p_lat not between 23.5 and 37.5 or p_lng not between 60.8 and 77.9 then
    return query select 'no_pin'::text, null::numeric, null::integer, v_max;
    return;
  end if;
  v_km := public.km_between(v_r.lat, v_r.lng, p_lat, p_lng);
  if v_km > v_max then
    return query select 'too_far'::text, round(v_km::numeric, 1), null::integer, v_max;
    return;
  end if;
  return query select 'ok'::text, round(v_km::numeric, 1), public.fee_for_km(v_km), v_max;
end;
$$;

-- place_order now also takes the pin: the fee comes from the distance, and the pin is stored with the order.
drop function public.place_order(uuid, jsonb, text, text, text, uuid, uuid);

create function public.place_order(
  p_restaurant_id uuid,
  p_items jsonb,
  p_address text,
  p_phone text,
  p_note text default null,
  p_zone_id uuid default null,
  p_idem uuid default null,
  p_lat double precision default null,
  p_lng double precision default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_rest public.restaurants%rowtype;
  v_requested integer;
  v_found integer;
  v_badqty integer;
  v_subtotal integer;
  v_order uuid;
  v_existing uuid;
  v_fee integer;
  v_km double precision;
  v_pin_lat double precision;
  v_pin_lng double precision;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;

  if p_idem is not null then
    select o.id into v_existing from public.orders o
     where o.customer_id = v_user and o.idempotency_key = p_idem;
    if found then return v_existing; end if;
  end if;

  if length(trim(coalesce(p_address, ''))) < 10 then raise exception 'address_too_short'; end if;
  if length(trim(coalesce(p_phone, ''))) not between 10 and 20 then raise exception 'phone_invalid'; end if;
  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) not between 1 and 30 then
    raise exception 'bad_items';
  end if;

  select * into v_rest from public.restaurants
   where id = p_restaurant_id and is_active and is_open;
  if not found then raise exception 'restaurant_unavailable'; end if;

  if p_zone_id is null
     or v_rest.zone_id is distinct from p_zone_id
     or not exists (select 1 from public.zones z where z.id = p_zone_id and z.is_active) then
    raise exception 'wrong_zone';
  end if;

  -- Delivery fee: flat for restaurants without a location, by distance for the rest.
  v_fee := v_rest.delivery_fee_pkr;
  if p_lat is not null and p_lng is not null
     and p_lat between 23.5 and 37.5 and p_lng between 60.8 and 77.9 then
    v_pin_lat := round(p_lat::numeric, 6)::double precision;
    v_pin_lng := round(p_lng::numeric, 6)::double precision;
  end if;
  if v_rest.lat is not null then
    if v_pin_lat is null then raise exception 'pin_required'; end if;
    v_km := public.km_between(v_rest.lat, v_rest.lng, v_pin_lat, v_pin_lng);
    if v_km > (select s.max_delivery_km from public.platform_settings s where s.id = 1) then
      raise exception 'too_far';
    end if;
    v_fee := public.fee_for_km(v_km);
  end if;

  with req as (
    select (e ->> 'menu_item_id')::uuid as menu_item_id,
           coalesce(sum((e ->> 'quantity')::int), 0) as qty
    from jsonb_array_elements(p_items) as e
    group by 1
  )
  select (select count(*) from req),
         count(*),
         coalesce(sum(m.price_pkr * req.qty), 0)::integer,
         count(*) filter (where req.qty < 1 or req.qty > 20)
    into v_requested, v_found, v_subtotal, v_badqty
    from req
    join public.menu_items m
      on m.id = req.menu_item_id
     and m.restaurant_id = p_restaurant_id
     and m.is_available;

  if v_found <> v_requested or v_badqty > 0 then raise exception 'invalid_items'; end if;
  if v_subtotal < v_rest.min_order_pkr then raise exception 'below_minimum'; end if;

  begin
    insert into public.orders
      (customer_id, restaurant_id, subtotal_pkr, delivery_fee_pkr, total_pkr,
       delivery_address, phone, note, idempotency_key, delivery_lat, delivery_lng)
    values
      (v_user, p_restaurant_id, v_subtotal, v_fee, v_subtotal + v_fee,
       trim(p_address), trim(p_phone), nullif(trim(coalesce(p_note, '')), ''), p_idem,
       v_pin_lat, v_pin_lng)
    returning id into v_order;
  exception when unique_violation then
    select o.id into v_order from public.orders o
     where o.customer_id = v_user and o.idempotency_key = p_idem;
    return v_order;
  end;

  insert into public.order_items (order_id, menu_item_id, item_name, unit_price_pkr, quantity)
  select v_order, m.id, m.name, m.price_pkr, req.qty::integer
  from (
    select (e ->> 'menu_item_id')::uuid as menu_item_id, sum((e ->> 'quantity')::int) as qty
    from jsonb_array_elements(p_items) as e
    group by 1
  ) req
  join public.menu_items m on m.id = req.menu_item_id;

  return v_order;
end;
$$;

-- Admin: fee tiers and restaurant locations.
create function public.admin_get_fees()
returns table (f_near_km numeric, f_near_pkr integer, f_mid_km numeric, f_mid_pkr integer, f_far_pkr integer, f_max_km numeric)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query select s.fee_near_km, s.fee_near_pkr, s.fee_mid_km, s.fee_mid_pkr, s.fee_far_pkr, s.max_delivery_km
    from public.platform_settings s where s.id = 1;
end;
$$;

create function public.admin_update_fees(
  p_near_km numeric, p_near_pkr integer, p_mid_km numeric, p_mid_pkr integer, p_far_pkr integer, p_max_km numeric
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_near_km is null or p_mid_km is null or p_max_km is null
     or p_near_pkr is null or p_mid_pkr is null or p_far_pkr is null
     or p_near_km not between 0.5 and 10 or p_mid_km <= p_near_km or p_mid_km > 15
     or p_max_km < p_mid_km or p_max_km > 25
     or p_near_pkr not between 0 and 2000 or p_mid_pkr not between 0 and 2000 or p_far_pkr not between 0 and 2000
     or p_near_pkr > p_mid_pkr or p_mid_pkr > p_far_pkr then
    raise exception 'bad_fees';
  end if;
  update public.platform_settings
     set fee_near_km = p_near_km, fee_near_pkr = p_near_pkr, fee_mid_km = p_mid_km,
         fee_mid_pkr = p_mid_pkr, fee_far_pkr = p_far_pkr, max_delivery_km = p_max_km
   where id = 1;
end;
$$;

create function public.admin_set_restaurant_location(p_restaurant uuid, p_lat double precision, p_lng double precision)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if (p_lat is null) <> (p_lng is null)
     or (p_lat is not null and (p_lat not between 23.5 and 37.5 or p_lng not between 60.8 and 77.9)) then
    raise exception 'bad_location';
  end if;
  update public.restaurants r
     set lat = round(p_lat::numeric, 6)::double precision, lng = round(p_lng::numeric, 6)::double precision
   where r.id = p_restaurant;
  if not found then raise exception 'restaurant_not_found'; end if;
end;
$$;

create function public.admin_restaurant_locations()
returns table (l_id uuid, l_name text, l_lat double precision, l_lng double precision)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query select r.id, r.name, r.lat, r.lng from public.restaurants r order by r.name;
end;
$$;

revoke execute on function public.km_between(double precision, double precision, double precision, double precision) from public, anon, authenticated;
revoke execute on function public.fee_for_km(double precision) from public, anon, authenticated;
revoke execute on function public.delivery_quote(uuid, double precision, double precision) from public;
revoke execute on function public.place_order(uuid, jsonb, text, text, text, uuid, uuid, double precision, double precision) from public, anon;
revoke execute on function public.admin_get_fees() from public, anon;
revoke execute on function public.admin_update_fees(numeric, integer, numeric, integer, integer, numeric) from public, anon;
revoke execute on function public.admin_set_restaurant_location(uuid, double precision, double precision) from public, anon;
revoke execute on function public.admin_restaurant_locations() from public, anon;
grant execute on function public.delivery_quote(uuid, double precision, double precision) to anon, authenticated;
grant execute on function public.place_order(uuid, jsonb, text, text, text, uuid, uuid, double precision, double precision) to authenticated;
grant execute on function public.admin_get_fees() to authenticated;
grant execute on function public.admin_update_fees(numeric, integer, numeric, integer, integer, numeric) to authenticated;
grant execute on function public.admin_set_restaurant_location(uuid, double precision, double precision) to authenticated;
grant execute on function public.admin_restaurant_locations() to authenticated;