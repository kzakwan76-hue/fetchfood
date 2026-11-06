-- 1. Columns, settings, ledger check.
alter table public.orders
  add column delivery_mode text not null default 'platform' check (delivery_mode in ('platform', 'own'));
alter table public.restaurants add column own_delivery boolean not null default false;
alter table public.platform_settings
  add column own_rider_discount_bps integer not null default 400 check (own_rider_discount_bps between 0 and 5000);
grant select (delivery_mode) on public.orders to authenticated;
-- restaurants.own_delivery is NOT granted: it is read only through functions.

alter table public.orders drop constraint orders_ledger_sums;
alter table public.orders add constraint orders_ledger_sums check (
  delivered_at is null or (
    commission_pkr + restaurant_share_pkr = subtotal_pkr
    and (delivery_mode = 'own' or rider_pay_pkr + platform_delivery_pkr = delivery_fee_pkr)));

-- 2. Orders from an own-rider restaurant are marked 'own' when they are placed.
create function public.orders_set_mode() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.restaurants r where r.id = new.restaurant_id and r.own_delivery) then
    new.delivery_mode := 'own';
  end if;
  return new;
end;
$$;
create trigger orders_set_mode_trg before insert on public.orders
  for each row execute function public.orders_set_mode();

-- Own-rider restaurants do not need FetchFood riders on duty.
create or replace function public.orders_require_riders() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_zone uuid;
  v_own boolean;
begin
  if (select s.require_rider_on_duty from public.platform_settings s where s.id = 1) then
    select r.zone_id, r.own_delivery into v_zone, v_own from public.restaurants r where r.id = new.restaurant_id;
    if not coalesce(v_own, false) and not exists (
      select 1 from public.profiles p
      join public.rider_profiles rp on rp.user_id = p.id
      where p.role = 'rider' and p.zone_id = v_zone and rp.status = 'approved'
        and rp.on_duty and rp.duty_until > now()) then
      raise exception 'no_riders';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.zones_open_for_orders() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select z.id from public.zones z
  where z.is_active and (
    not (select s.require_rider_on_duty from public.platform_settings s where s.id = 1)
    or exists (select 1 from public.restaurants r where r.zone_id = z.id and r.is_active and r.own_delivery)
    or exists (select 1 from public.profiles p
               join public.rider_profiles rp on rp.user_id = p.id
               where p.role = 'rider' and p.zone_id = z.id and rp.status = 'approved'
                 and rp.on_duty and rp.duty_until > now()));
$$;

-- 3. Money. One running balance per restaurant:
--    + what we owe for orders OUR riders delivered (their share)
--    - the commission they owe us on orders THEIR riders delivered (they kept the cash)
--    - payouts we made to them, + payments they made to us (remittances).
--    Negative = the restaurant owes us.
create table public.restaurant_remittances (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id),
  amount_pkr integer not null check (amount_pkr between 1 and 10000000),
  note text check (note is null or char_length(note) <= 200),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.restaurant_remittances enable row level security;
revoke all on public.restaurant_remittances from anon, authenticated;
grant select on public.restaurant_remittances to authenticated;
create policy "owners read own remittances" on public.restaurant_remittances
  for select to authenticated
  using (exists (select 1 from public.restaurants r
                 where r.id = restaurant_remittances.restaurant_id and r.owner_id = (select auth.uid())));

create or replace function public.restaurant_balance(p_restaurant uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select (coalesce((select sum(case when o.delivery_mode = 'own' then -o.commission_pkr else o.restaurant_share_pkr end)
                    from public.orders o
                    where o.restaurant_id = p_restaurant and o.delivered_at is not null), 0)
        - coalesce((select sum(pa.amount_pkr) from public.restaurant_payouts pa
                    where pa.restaurant_id = p_restaurant), 0)
        + coalesce((select sum(rm.amount_pkr) from public.restaurant_remittances rm
                    where rm.restaurant_id = p_restaurant), 0))::integer;
$$;

-- Commission rate for a restaurant's own-rider deliveries: the normal rate minus the discount.
create function public.own_commission_bps(p_restaurant uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select greatest(0, coalesce(r.commission_bps, s.default_commission_bps) - s.own_rider_discount_bps)
  from public.restaurants r cross join public.platform_settings s
  where r.id = p_restaurant and s.id = 1;
$$;
revoke execute on function public.orders_set_mode() from public, anon, authenticated;
revoke execute on function public.own_commission_bps(uuid) from public, anon, authenticated;

-- 4. Owner actions for own-rider orders (FetchFood riders and the pickup code are not involved).
create or replace function public.owner_mark_ready(p_order_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_order public.orders%rowtype;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or not exists (
    select 1 from public.restaurants r where r.id = v_order.restaurant_id and r.owner_id = v_user) then
    raise exception 'order_not_found';
  end if;
  if v_order.status <> 'preparing' or v_order.ready_at is not null or v_order.delivery_mode <> 'platform' then
    raise exception 'invalid_transition';
  end if;
  update public.orders set ready_at = now() where id = p_order_id;
end;
$$;

create function public.owner_own_dispatch(p_order_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_order public.orders%rowtype;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or not exists (
    select 1 from public.restaurants r where r.id = v_order.restaurant_id and r.owner_id = v_user) then
    raise exception 'order_not_found';
  end if;
  if v_order.delivery_mode <> 'own' or v_order.status <> 'preparing' then raise exception 'invalid_transition'; end if;
  update public.orders set status = 'out_for_delivery', handed_over_at = now() where id = p_order_id;
end;
$$;

create function public.owner_own_delivered(p_order_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_order public.orders%rowtype;
  v_bps integer;
  v_commission integer;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or not exists (
    select 1 from public.restaurants r where r.id = v_order.restaurant_id and r.owner_id = v_user) then
    raise exception 'order_not_found';
  end if;
  if v_order.delivery_mode <> 'own' or v_order.status <> 'out_for_delivery' then raise exception 'invalid_transition'; end if;
  v_bps := public.own_commission_bps(v_order.restaurant_id);
  v_commission := (v_order.subtotal_pkr * v_bps + 5000) / 10000;
  update public.orders set
    status = 'delivered', delivered_at = now(),
    commission_bps = v_bps, commission_pkr = v_commission,
    restaurant_share_pkr = v_order.subtotal_pkr - v_commission,
    rider_pay_pkr = 0, platform_delivery_pkr = 0   -- the restaurant keeps the delivery fee
  where id = p_order_id;
end;
$$;

-- 5. Owner earnings (new shape: they can owe us).
drop function public.owner_earnings();
create function public.owner_earnings()
returns table (e_restaurant_id uuid, e_name text, e_orders integer, e_sales integer, e_commission integer,
               e_paid integer, e_owed integer, e_bps integer, e_owes_us integer, e_own boolean,
               e_own_orders integer, e_remitted integer)
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  return query
    select r.id, r.name,
      (select count(*) from public.orders o where o.restaurant_id = r.id and o.delivered_at is not null)::integer,
      coalesce((select sum(o.subtotal_pkr) from public.orders o
                where o.restaurant_id = r.id and o.delivered_at is not null), 0)::integer,
      coalesce((select sum(o.commission_pkr) from public.orders o
                where o.restaurant_id = r.id and o.delivered_at is not null), 0)::integer,
      coalesce((select sum(pa.amount_pkr) from public.restaurant_payouts pa where pa.restaurant_id = r.id), 0)::integer,
      greatest(public.restaurant_balance(r.id), 0),
      case when r.own_delivery then public.own_commission_bps(r.id)
           else coalesce(r.commission_bps, st.default_commission_bps) end,
      greatest(-public.restaurant_balance(r.id), 0),
      r.own_delivery,
      (select count(*) from public.orders o
        where o.restaurant_id = r.id and o.delivered_at is not null and o.delivery_mode = 'own')::integer,
      coalesce((select sum(rm.amount_pkr) from public.restaurant_remittances rm where rm.restaurant_id = r.id), 0)::integer
    from public.restaurants r cross join public.platform_settings st
    where r.owner_id = v_uid
    order by r.name;
end;
$$;

-- 6. Admin: own-rider settings, balances, orders.
create function public.admin_set_own_delivery(p_restaurant uuid, p_on boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_on is null then raise exception 'bad_settings'; end if;
  update public.restaurants r set own_delivery = p_on where r.id = p_restaurant;
  if not found then raise exception 'restaurant_not_found'; end if;
end;
$$;

create function public.admin_get_own_discount() returns integer
language plpgsql security definer set search_path = '' as $$
declare v integer;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  select s.own_rider_discount_bps into v from public.platform_settings s where s.id = 1;
  return v;
end;
$$;

create function public.admin_update_own_discount(p_bps integer) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_bps is null or p_bps not between 0 and 5000 then raise exception 'bad_settings'; end if;
  update public.platform_settings set own_rider_discount_bps = p_bps where id = 1;
end;
$$;

create function public.admin_record_remittance(p_restaurant uuid, p_amount integer, p_note text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_note text := nullif(trim(coalesce(p_note, '')), '');
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_amount is null or p_amount < 1 or p_amount > 10000000 then raise exception 'bad_amount'; end if;
  if v_note is not null and char_length(v_note) > 200 then raise exception 'bad_note'; end if;
  perform 1 from public.restaurants r where r.id = p_restaurant for update;
  if not found then raise exception 'restaurant_not_found'; end if;
  if p_amount > greatest(-public.restaurant_balance(p_restaurant), 0) then raise exception 'exceeds_balance'; end if;
  insert into public.restaurant_remittances (restaurant_id, amount_pkr, note, created_by)
  values (p_restaurant, p_amount, v_note, v_user);
end;
$$;

create function public.admin_recent_remittances()
returns table (g_who text, g_amount integer, g_note text, g_created timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query
    select r.name, rm.amount_pkr, rm.note, rm.created_at
    from public.restaurant_remittances rm join public.restaurants r on r.id = rm.restaurant_id
    order by rm.created_at desc limit 20;
end;
$$;

create function public.admin_order_mode(p_id uuid)
returns table (m_mode text, m_dispatched timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query select o.delivery_mode, o.handed_over_at from public.orders o where o.id = p_id;
end;
$$;

create or replace function public.admin_orders(
  p_status text default null, p_restaurant uuid default null, p_rider uuid default null,
  p_limit integer default 50)
returns table (o_id uuid, o_created timestamptz, o_status text, o_restaurant text,
               o_customer text, o_total integer, o_rider text)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query
    select o.id, o.created_at, o.status::text, r.name,
           coalesce(cp.full_name, case when o.customer_id is null then 'Deleted account' else 'Customer' end),
           o.total_pkr,
           case when o.delivery_mode = 'own' then 'Restaurant''s own rider'
                else coalesce(rp.full_name, ru.email::text) end
    from public.orders o
    join public.restaurants r on r.id = o.restaurant_id
    left join public.profiles cp on cp.id = o.customer_id
    left join public.profiles rp on rp.id = o.rider_id
    left join auth.users ru on ru.id = o.rider_id
    where (p_status is null or o.status::text = p_status)
      and (p_restaurant is null or o.restaurant_id = p_restaurant)
      and (p_rider is null or o.rider_id = p_rider)
    order by o.created_at desc
    limit least(greatest(coalesce(p_limit, 50), 1), 200);
end;
$$;

create function public.admin_own_orders(p_restaurant uuid default null, p_limit integer default 100)
returns table (o_id uuid, o_created timestamptz, o_status text, o_restaurant text,
               o_customer text, o_total integer, o_rider text)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query
    select o.id, o.created_at, o.status::text, r.name,
           coalesce(cp.full_name, case when o.customer_id is null then 'Deleted account' else 'Customer' end),
           o.total_pkr, 'Restaurant''s own rider'::text
    from public.orders o
    join public.restaurants r on r.id = o.restaurant_id
    left join public.profiles cp on cp.id = o.customer_id
    where o.delivery_mode = 'own' and (p_restaurant is null or o.restaurant_id = p_restaurant)
    order by o.created_at desc
    limit least(greatest(coalesce(p_limit, 100), 1), 200);
end;
$$;

drop function public.admin_restaurants(uuid);
create function public.admin_restaurants(p_id uuid default null)
returns table (s_id uuid, s_slug text, s_name text, s_area text, s_owner text, s_zone text, s_open boolean,
               s_bps integer, s_custom boolean, s_orders integer, s_sales integer, s_commission integer,
               s_paid integer, s_owed integer, s_own boolean, s_eff_bps integer, s_owes_us integer,
               s_own_orders integer, s_platform_orders integer, s_made integer, s_remitted integer)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query
    select r.id, r.slug, r.name, r.area, ou.email::text, z.name, r.is_open,
      coalesce(r.commission_bps, st.default_commission_bps), r.commission_bps is not null,
      (select count(*) from public.orders o where o.restaurant_id = r.id and o.delivered_at is not null)::integer,
      coalesce((select sum(o.subtotal_pkr) from public.orders o
                where o.restaurant_id = r.id and o.delivered_at is not null), 0)::integer,
      coalesce((select sum(o.commission_pkr) from public.orders o
                where o.restaurant_id = r.id and o.delivered_at is not null), 0)::integer,
      coalesce((select sum(pa.amount_pkr) from public.restaurant_payouts pa where pa.restaurant_id = r.id), 0)::integer,
      greatest(public.restaurant_balance(r.id), 0),
      r.own_delivery,
      case when r.own_delivery then public.own_commission_bps(r.id)
           else coalesce(r.commission_bps, st.default_commission_bps) end,
      greatest(-public.restaurant_balance(r.id), 0),
      (select count(*) from public.orders o
        where o.restaurant_id = r.id and o.delivered_at is not null and o.delivery_mode = 'own')::integer,
      (select count(*) from public.orders o
        where o.restaurant_id = r.id and o.delivered_at is not null and o.delivery_mode = 'platform')::integer,
      coalesce((select sum(o.commission_pkr + o.platform_delivery_pkr) from public.orders o
                where o.restaurant_id = r.id and o.delivered_at is not null), 0)::integer,
      coalesce((select sum(rm.amount_pkr) from public.restaurant_remittances rm where rm.restaurant_id = r.id), 0)::integer
    from public.restaurants r
    cross join public.platform_settings st
    left join auth.users ou on ou.id = r.owner_id
    left join public.zones z on z.id = r.zone_id
    where p_id is null or r.id = p_id
    order by r.name;
end;
$$;

-- 7. Overview, split between FetchFood-rider restaurants and own-rider restaurants.
drop function public.admin_overview();
create function public.admin_overview()
returns table (ov_orders_today integer, ov_delivered_today integer, ov_active integer, ov_sales_today integer,
               ov_revenue_app integer, ov_revenue_own integer, ov_owed_app integer, ov_owed_own integer,
               ov_owes_us integer, ov_cash integer, ov_rider_owed integer, ov_on_duty integer, ov_riders integer,
               ov_rest_app integer, ov_rest_own integer)
language plpgsql security definer set search_path = '' as $$
declare
  v_start timestamptz := (date_trunc('day', now() at time zone 'Asia/Karachi')) at time zone 'Asia/Karachi';
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query select
    (select count(*) from public.orders o where o.created_at >= v_start)::integer,
    (select count(*) from public.orders o where o.delivered_at >= v_start)::integer,
    (select count(*) from public.orders o
      where o.status in ('placed', 'accepted', 'preparing', 'out_for_delivery'))::integer,
    coalesce((select sum(o.total_pkr) from public.orders o where o.delivered_at >= v_start), 0)::integer,
    (coalesce((select sum(o.commission_pkr + o.platform_delivery_pkr - o.bonus_pkr) from public.orders o
               where o.delivered_at is not null and o.delivery_mode = 'platform'), 0)
     - coalesce((select sum(c.amount_pkr) from public.rider_credits c), 0))::integer,
    coalesce((select sum(o.commission_pkr) from public.orders o
              where o.delivered_at is not null and o.delivery_mode = 'own'), 0)::integer,
    coalesce((select sum(greatest(public.restaurant_balance(r.id), 0)) from public.restaurants r
              where not r.own_delivery), 0)::integer,
    coalesce((select sum(greatest(public.restaurant_balance(r.id), 0)) from public.restaurants r
              where r.own_delivery), 0)::integer,
    coalesce((select sum(greatest(-public.restaurant_balance(r.id), 0)) from public.restaurants r), 0)::integer,
    (coalesce((select sum(o.total_pkr) from public.orders o
               where o.delivered_at is not null and o.delivery_mode = 'platform'), 0)
     - coalesce((select sum(d.amount_pkr) from public.rider_deposits d), 0))::integer,
    (coalesce((select sum(o.rider_pay_pkr + o.bonus_pkr) from public.orders o
               where o.delivered_at is not null and o.delivery_mode = 'platform'), 0)
     + coalesce((select sum(c.amount_pkr) from public.rider_credits c), 0)
     - coalesce((select sum(rp.amount_pkr) from public.rider_payouts rp), 0))::integer,
    (select count(*) from public.rider_profiles rp
      where rp.status = 'approved' and rp.on_duty and rp.duty_until > now())::integer,
    (select count(*) from public.profiles p where p.role = 'rider')::integer,
    (select count(*) from public.restaurants r where not r.own_delivery)::integer,
    (select count(*) from public.restaurants r where r.own_delivery)::integer;
end;
$$;

-- 8. Who may call what.
revoke execute on function public.owner_own_dispatch(uuid) from public, anon;
revoke execute on function public.owner_own_delivered(uuid) from public, anon;
revoke execute on function public.owner_earnings() from public, anon;
revoke execute on function public.admin_set_own_delivery(uuid, boolean) from public, anon;
revoke execute on function public.admin_get_own_discount() from public, anon;
revoke execute on function public.admin_update_own_discount(integer) from public, anon;
revoke execute on function public.admin_record_remittance(uuid, integer, text) from public, anon;
revoke execute on function public.admin_recent_remittances() from public, anon;
revoke execute on function public.admin_order_mode(uuid) from public, anon;
revoke execute on function public.admin_orders(text, uuid, uuid, integer) from public, anon;
revoke execute on function public.admin_own_orders(uuid, integer) from public, anon;
revoke execute on function public.admin_restaurants(uuid) from public, anon;
revoke execute on function public.admin_overview() from public, anon;
grant execute on function public.owner_own_dispatch(uuid) to authenticated;
grant execute on function public.owner_own_delivered(uuid) to authenticated;
grant execute on function public.owner_earnings() to authenticated;
grant execute on function public.admin_set_own_delivery(uuid, boolean) to authenticated;
grant execute on function public.admin_get_own_discount() to authenticated;
grant execute on function public.admin_update_own_discount(integer) to authenticated;
grant execute on function public.admin_record_remittance(uuid, integer, text) to authenticated;
grant execute on function public.admin_recent_remittances() to authenticated;
grant execute on function public.admin_order_mode(uuid) to authenticated;
grant execute on function public.admin_orders(text, uuid, uuid, integer) to authenticated;
grant execute on function public.admin_own_orders(uuid, integer) to authenticated;
grant execute on function public.admin_restaurants(uuid) to authenticated;
grant execute on function public.admin_overview() to authenticated;