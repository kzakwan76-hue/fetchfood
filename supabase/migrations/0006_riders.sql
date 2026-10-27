alter table public.orders
  add column rider_id uuid references auth.users (id) on delete set null;
create index orders_rider_id_idx on public.orders (rider_id);

create function public.is_rider() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'rider'
  );
$$;

-- Owner steps out_for_delivery and delivered only apply when no rider is assigned.
create or replace function public.update_order_status(p_order_id uuid, p_new public.order_status)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_order public.orders%rowtype;
  v_is_owner boolean;
  v_ok boolean;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;

  v_is_owner := exists (
    select 1 from public.restaurants r
    where r.id = v_order.restaurant_id and r.owner_id = v_user
  );
  if not v_is_owner and v_order.customer_id <> v_user then
    raise exception 'order_not_found';
  end if;

  if v_is_owner then
    v_ok := (v_order.status::text, p_new::text) in (
      ('placed', 'accepted'), ('placed', 'cancelled'),
      ('accepted', 'preparing'), ('accepted', 'cancelled')
    ) or (
      v_order.rider_id is null
      and (v_order.status::text, p_new::text) in (
        ('preparing', 'out_for_delivery'), ('out_for_delivery', 'delivered')
      )
    );
  else
    v_ok := v_order.status = 'placed' and p_new = 'cancelled';
  end if;
  if not v_ok then raise exception 'invalid_transition'; end if;

  update public.orders set status = p_new where id = p_order_id;
end;
$$;

-- Orders ready for pickup. No customer address or phone yet.
create function public.rider_available_orders()
returns table (o_id uuid, o_restaurant text, o_area text, o_total integer, o_created timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_rider() then raise exception 'not_rider'; end if;
  return query
    select o.id, r.name, r.area, o.total_pkr, o.created_at
    from public.orders o
    join public.restaurants r on r.id = o.restaurant_id
    where o.status = 'preparing' and o.rider_id is null
    order by o.created_at
    limit 50;
end;
$$;

-- The rider's own deliveries, with address and phone.
create function public.rider_my_orders()
returns table (
  o_id uuid, o_restaurant text, o_area text, o_status text, o_address text,
  o_phone text, o_note text, o_total integer, o_created timestamptz, o_items text
)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_rider() then raise exception 'not_rider'; end if;
  return query
    select o.id, r.name, r.area, o.status::text, o.delivery_address, o.phone, o.note,
           o.total_pkr, o.created_at,
           (select string_agg(i.quantity::text || ' x ' || i.item_name, ', ' order by i.item_name)
              from public.order_items i where i.order_id = o.id)
    from public.orders o
    join public.restaurants r on r.id = o.restaurant_id
    where o.rider_id = (select auth.uid())
    order by o.created_at desc
    limit 20;
end;
$$;

create function public.rider_claim_order(p_order_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_order public.orders%rowtype;
begin
  if not public.is_rider() then raise exception 'not_rider'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if v_order.status <> 'preparing' or v_order.rider_id is not null then
    raise exception 'not_available';
  end if;
  if (select count(*) from public.orders
      where rider_id = v_user and status = 'out_for_delivery') >= 3 then
    raise exception 'too_many';
  end if;
  update public.orders set rider_id = v_user, status = 'out_for_delivery' where id = p_order_id;
end;
$$;

create function public.rider_release_order(p_order_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_order public.orders%rowtype;
begin
  if not public.is_rider() then raise exception 'not_rider'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.rider_id is distinct from v_user then raise exception 'order_not_found'; end if;
  if v_order.status <> 'out_for_delivery' then raise exception 'invalid_transition'; end if;
  update public.orders set rider_id = null, status = 'preparing' where id = p_order_id;
end;
$$;

create function public.rider_mark_delivered(p_order_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_order public.orders%rowtype;
begin
  if not public.is_rider() then raise exception 'not_rider'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.rider_id is distinct from v_user then raise exception 'order_not_found'; end if;
  if v_order.status <> 'out_for_delivery' then raise exception 'invalid_transition'; end if;
  update public.orders set status = 'delivered' where id = p_order_id;
end;
$$;

revoke execute on function public.is_rider() from public, anon;
revoke execute on function public.rider_available_orders() from public, anon;
revoke execute on function public.rider_my_orders() from public, anon;
revoke execute on function public.rider_claim_order(uuid) from public, anon;
revoke execute on function public.rider_release_order(uuid) from public, anon;
revoke execute on function public.rider_mark_delivered(uuid) from public, anon;
grant execute on function public.is_rider() to authenticated;
grant execute on function public.rider_available_orders() to authenticated;
grant execute on function public.rider_my_orders() to authenticated;
grant execute on function public.rider_claim_order(uuid) to authenticated;
grant execute on function public.rider_release_order(uuid) to authenticated;
grant execute on function public.rider_mark_delivered(uuid) to authenticated;