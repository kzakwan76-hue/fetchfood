-- Orders currently held by a rider, so an admin can free one if the rider vanishes.
create function public.admin_active_deliveries()
returns table (
  o_id uuid, o_restaurant text, o_rider_email text, o_rider_name text,
  o_total integer, o_created timestamptz
)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query
    select o.id, r.name, u.email::text, p.full_name, o.total_pkr, o.created_at
    from public.orders o
    join public.restaurants r on r.id = o.restaurant_id
    left join auth.users u on u.id = o.rider_id
    left join public.profiles p on p.id = o.rider_id
    where o.status = 'out_for_delivery' and o.rider_id is not null
    order by o.created_at
    limit 50;
end;
$$;

-- Puts a rider-held order back in the available list.
create function public.admin_release_order(p_order_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders%rowtype;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if v_order.status <> 'out_for_delivery' or v_order.rider_id is null then
    raise exception 'invalid_transition';
  end if;
  update public.orders set rider_id = null, status = 'preparing' where id = p_order_id;
end;
$$;

revoke execute on function public.admin_active_deliveries() from public, anon;
revoke execute on function public.admin_release_order(uuid) from public, anon;
grant execute on function public.admin_active_deliveries() to authenticated;
grant execute on function public.admin_release_order(uuid) to authenticated;