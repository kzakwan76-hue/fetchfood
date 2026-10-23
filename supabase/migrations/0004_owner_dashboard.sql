-- Sanity limits on menu data
alter table public.menu_items
  add constraint menu_items_price_max check (price_pkr <= 100000),
  add constraint menu_items_name_len check (char_length(name) between 1 and 80),
  add constraint menu_items_category_len check (char_length(category) between 1 and 40),
  add constraint menu_items_description_len check (description is null or char_length(description) <= 200);

-- Restaurants: owners see their own (even inactive) and can edit three fields only.
create policy "owner reads own restaurants" on public.restaurants
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "owner updates own restaurants" on public.restaurants
  for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
grant update (is_open, eta_minutes, delivery_fee_pkr) on public.restaurants to authenticated;

-- Menu items: owners manage items of their own restaurants only.
create policy "owner reads own menu" on public.menu_items
  for select to authenticated
  using (exists (select 1 from public.restaurants r
                 where r.id = restaurant_id and r.owner_id = (select auth.uid())));
create policy "owner adds menu items" on public.menu_items
  for insert to authenticated
  with check (exists (select 1 from public.restaurants r
                      where r.id = restaurant_id and r.owner_id = (select auth.uid())));
create policy "owner edits menu items" on public.menu_items
  for update to authenticated
  using (exists (select 1 from public.restaurants r
                 where r.id = restaurant_id and r.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.restaurants r
                      where r.id = restaurant_id and r.owner_id = (select auth.uid())));
create policy "owner deletes menu items" on public.menu_items
  for delete to authenticated
  using (exists (select 1 from public.restaurants r
                 where r.id = restaurant_id and r.owner_id = (select auth.uid())));
grant insert (restaurant_id, name, description, price_pkr, category, tags, is_available)
  on public.menu_items to authenticated;
grant update (name, description, price_pkr, category, tags, is_available)
  on public.menu_items to authenticated;
grant delete on public.menu_items to authenticated;

-- Orders: owners can READ orders of their restaurants (to fulfil them). Never write directly.
create policy "owner reads restaurant orders" on public.orders
  for select to authenticated
  using (exists (select 1 from public.restaurants r
                 where r.id = restaurant_id and r.owner_id = (select auth.uid())));
create policy "owner reads restaurant order items" on public.order_items
  for select to authenticated
  using (exists (select 1 from public.orders o
                 join public.restaurants r on r.id = o.restaurant_id
                 where o.id = order_items.order_id and r.owner_id = (select auth.uid())));

-- The ONLY way an order's status changes.
create function public.update_order_status(p_order_id uuid, p_new public.order_status)
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
  -- Strangers get the same answer as "does not exist".
  if not v_is_owner and v_order.customer_id <> v_user then
    raise exception 'order_not_found';
  end if;

  if v_is_owner then
    v_ok := (v_order.status::text, p_new::text) in (
      ('placed', 'accepted'), ('placed', 'cancelled'),
      ('accepted', 'preparing'), ('accepted', 'cancelled'),
      ('preparing', 'out_for_delivery'), ('out_for_delivery', 'delivered')
    );
  else
    -- A customer may only cancel their own order while it is still "placed".
    v_ok := v_order.status = 'placed' and p_new = 'cancelled';
  end if;
  if not v_ok then raise exception 'invalid_transition'; end if;

  update public.orders set status = p_new where id = p_order_id;
end;
$$;
revoke execute on function public.update_order_status(uuid, public.order_status) from public, anon;
grant execute on function public.update_order_status(uuid, public.order_status) to authenticated;