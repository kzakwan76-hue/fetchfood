-- place_order now needs the customer's zone and rejects restaurants outside it.
drop function public.place_order(uuid, jsonb, text, text, text);

create function public.place_order(
  p_restaurant_id uuid,
  p_items jsonb,
  p_address text,
  p_phone text,
  p_note text default null,
  p_zone_id uuid default null
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
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
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

  insert into public.orders
    (customer_id, restaurant_id, subtotal_pkr, delivery_fee_pkr, total_pkr,
     delivery_address, phone, note)
  values
    (v_user, p_restaurant_id, v_subtotal, v_rest.delivery_fee_pkr,
     v_subtotal + v_rest.delivery_fee_pkr,
     trim(p_address), trim(p_phone), nullif(trim(coalesce(p_note, '')), ''))
  returning id into v_order;

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

revoke execute on function public.place_order(uuid, jsonb, text, text, text, uuid) from public, anon;
grant execute on function public.place_order(uuid, jsonb, text, text, text, uuid) to authenticated;