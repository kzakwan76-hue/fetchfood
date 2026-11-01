-- 1. Keep orders and reviews when an account is deleted.
do $$
declare c text;
begin
  for c in select conname from pg_constraint
    where conrelid = 'public.orders'::regclass and contype = 'f'
      and pg_get_constraintdef(oid) like 'FOREIGN KEY (customer_id)%'
  loop execute format('alter table public.orders drop constraint %I', c); end loop;
  for c in select conname from pg_constraint
    where conrelid = 'public.reviews'::regclass and contype = 'f'
      and pg_get_constraintdef(oid) like 'FOREIGN KEY (customer_id)%'
  loop execute format('alter table public.reviews drop constraint %I', c); end loop;
end $$;
alter table public.orders alter column customer_id drop not null;
alter table public.orders add constraint orders_customer_id_fkey
  foreign key (customer_id) references auth.users (id) on delete set null;
alter table public.reviews alter column customer_id drop not null;
alter table public.reviews add constraint reviews_customer_id_fkey
  foreign key (customer_id) references auth.users (id) on delete set null;

-- 2. Settings, commission, ledger columns, settlement tables.
create table public.platform_settings (
  id integer primary key check (id = 1),
  default_commission_bps integer not null check (default_commission_bps between 0 and 5000),
  rider_share_bps integer not null check (rider_share_bps between 0 and 10000),
  rider_cash_limit_pkr integer not null check (rider_cash_limit_pkr between 0 and 1000000)
);
insert into public.platform_settings values (1, 1500, 8000, 5000);
alter table public.platform_settings enable row level security;
revoke all on public.platform_settings from anon, authenticated;

alter table public.restaurants
  add column commission_bps integer check (commission_bps is null or commission_bps between 0 and 5000);

alter table public.orders
  add column ready_at timestamptz,
  add column delivered_at timestamptz,
  add column commission_bps integer,
  add column commission_pkr integer,
  add column restaurant_share_pkr integer,
  add column rider_pay_pkr integer,
  add column platform_delivery_pkr integer,
  add constraint orders_ledger_sums check (
    delivered_at is null or (
      commission_pkr + restaurant_share_pkr = subtotal_pkr
      and rider_pay_pkr + platform_delivery_pkr = delivery_fee_pkr));

create table public.restaurant_payouts (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id),
  amount_pkr integer not null check (amount_pkr between 1 and 10000000),
  note text check (note is null or char_length(note) <= 200),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create table public.rider_deposits (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid references auth.users (id) on delete set null,
  amount_pkr integer not null check (amount_pkr between 1 and 10000000),
  note text check (note is null or char_length(note) <= 200),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.restaurant_payouts enable row level security;
alter table public.rider_deposits enable row level security;
revoke all on public.restaurant_payouts, public.rider_deposits from anon, authenticated;
grant select on public.restaurant_payouts to authenticated;
create policy "owners read own payouts" on public.restaurant_payouts
  for select to authenticated
  using (exists (select 1 from public.restaurants r
                 where r.id = restaurant_payouts.restaurant_id and r.owner_id = (select auth.uid())));

-- 3. Hide money columns: public and customers can read only the columns they always could.
revoke select on public.restaurants from anon, authenticated;
grant select (id, slug, name, cuisine, area, eta_minutes, delivery_fee_pkr, min_order_pkr,
              is_open, is_active, owner_id, created_at, zone_id, image_path)
  on public.restaurants to anon, authenticated;
revoke select on public.orders from authenticated;
grant select (id, customer_id, restaurant_id, status, payment_method, subtotal_pkr, delivery_fee_pkr,
              total_pkr, delivery_address, phone, note, created_at, rider_id, idempotency_key,
              ready_at, delivered_at)
  on public.orders to authenticated;

-- 4. Internal balance helpers (not callable from the browser).
create function public.rider_cash_held(p_rider uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select (coalesce((select sum(o.total_pkr - o.rider_pay_pkr) from public.orders o
                    where o.rider_id = p_rider and o.delivered_at is not null), 0)
        - coalesce((select sum(d.amount_pkr) from public.rider_deposits d
                    where d.rider_id = p_rider), 0))::integer;
$$;
create function public.restaurant_balance(p_restaurant uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select (coalesce((select sum(o.restaurant_share_pkr) from public.orders o
                    where o.restaurant_id = p_restaurant and o.delivered_at is not null), 0)
        - coalesce((select sum(pa.amount_pkr) from public.restaurant_payouts pa
                    where pa.restaurant_id = p_restaurant), 0))::integer;
$$;
revoke execute on function public.rider_cash_held(uuid) from public, anon, authenticated;
revoke execute on function public.restaurant_balance(uuid) from public, anon, authenticated;

-- 5. Owner: ready for pickup. Owners can no longer move an order to out_for_delivery or delivered.
create function public.owner_mark_ready(p_order_id uuid) returns void
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
  if v_order.status <> 'preparing' or v_order.ready_at is not null then
    raise exception 'invalid_transition';
  end if;
  update public.orders set ready_at = now() where id = p_order_id;
end;
$$;

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
    where r.id = v_order.restaurant_id and r.owner_id = v_user);
  if not v_is_owner and v_order.customer_id is distinct from v_user then
    raise exception 'order_not_found';
  end if;

  if v_is_owner then
    -- Delivery steps belong to riders only.
    v_ok := (v_order.status::text, p_new::text) in (
      ('placed', 'accepted'), ('placed', 'cancelled'),
      ('accepted', 'preparing'), ('accepted', 'cancelled'));
  else
    v_ok := v_order.status = 'placed' and p_new = 'cancelled';
  end if;
  if not v_ok then raise exception 'invalid_transition'; end if;
  update public.orders set status = p_new where id = p_order_id;
end;
$$;

-- 6. Riders: only ready orders; cash limit; the breakdown is written on delivery.
create or replace function public.rider_available_orders()
returns table (o_id uuid, o_restaurant text, o_area text, o_total integer, o_created timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_rider() then raise exception 'not_rider'; end if;
  return query
    select o.id, r.name, r.area, o.total_pkr, o.created_at
    from public.orders o
    join public.restaurants r on r.id = o.restaurant_id
    where o.status = 'preparing' and o.ready_at is not null and o.rider_id is null
      and r.zone_id is not null
      and r.zone_id = (select p.zone_id from public.profiles p where p.id = (select auth.uid()))
    order by o.created_at
    limit 50;
end;
$$;

create or replace function public.rider_claim_order(p_order_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_order public.orders%rowtype;
begin
  if not public.is_rider() then raise exception 'not_rider'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if v_order.status <> 'preparing' or v_order.ready_at is null or v_order.rider_id is not null then
    raise exception 'not_available';
  end if;
  if not exists (
    select 1 from public.restaurants r
    join public.profiles p on p.id = v_user
    where r.id = v_order.restaurant_id and r.zone_id is not null and r.zone_id = p.zone_id) then
    raise exception 'wrong_zone';
  end if;
  if public.rider_cash_held(v_user) >=
     (select s.rider_cash_limit_pkr from public.platform_settings s where s.id = 1) then
    raise exception 'cash_limit';
  end if;
  if (select count(*) from public.orders
      where rider_id = v_user and status = 'out_for_delivery') >= 3 then
    raise exception 'too_many';
  end if;
  update public.orders set rider_id = v_user, status = 'out_for_delivery' where id = p_order_id;
end;
$$;

create or replace function public.rider_mark_delivered(p_order_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_order public.orders%rowtype;
  v_bps integer;
  v_share integer;
  v_commission integer;
  v_rider_pay integer;
begin
  if not public.is_rider() then raise exception 'not_rider'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.rider_id is distinct from v_user then raise exception 'order_not_found'; end if;
  if v_order.status <> 'out_for_delivery' then raise exception 'invalid_transition'; end if;

  select coalesce(r.commission_bps, s.default_commission_bps), s.rider_share_bps
    into v_bps, v_share
    from public.restaurants r cross join public.platform_settings s
   where r.id = v_order.restaurant_id and s.id = 1;
  v_commission := (v_order.subtotal_pkr * v_bps + 5000) / 10000;   -- rounded to the nearest rupee
  v_rider_pay := (v_order.delivery_fee_pkr * v_share) / 10000;     -- rounded down

  update public.orders set
    status = 'delivered', delivered_at = now(),
    commission_bps = v_bps, commission_pkr = v_commission,
    restaurant_share_pkr = v_order.subtotal_pkr - v_commission,
    rider_pay_pkr = v_rider_pay,
    platform_delivery_pkr = v_order.delivery_fee_pkr - v_rider_pay
  where id = p_order_id;
end;
$$;

create function public.rider_wallet()
returns table (w_delivered integer, w_earned integer, w_held integer, w_limit integer)
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid());
begin
  if not public.is_rider() then raise exception 'not_rider'; end if;
  return query select
    (select count(*) from public.orders o where o.rider_id = v_uid and o.delivered_at is not null)::integer,
    coalesce((select sum(o.rider_pay_pkr) from public.orders o
              where o.rider_id = v_uid and o.delivered_at is not null), 0)::integer,
    public.rider_cash_held(v_uid),
    (select s.rider_cash_limit_pkr from public.platform_settings s where s.id = 1);
end;
$$;

-- 7. Owner earnings.
create function public.owner_earnings()
returns table (e_restaurant_id uuid, e_name text, e_orders integer, e_sales integer,
               e_commission integer, e_paid integer, e_owed integer, e_bps integer)
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
      coalesce((select sum(pa.amount_pkr) from public.restaurant_payouts pa
                where pa.restaurant_id = r.id), 0)::integer,
      public.restaurant_balance(r.id),
      coalesce(r.commission_bps, st.default_commission_bps)
    from public.restaurants r cross join public.platform_settings st
    where r.owner_id = v_uid
    order by r.name;
end;
$$;

-- 8. Admin: settings and settlements.
create function public.admin_get_settings()
returns table (c_commission_bps integer, c_rider_bps integer, c_limit integer)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query select s.default_commission_bps, s.rider_share_bps, s.rider_cash_limit_pkr
    from public.platform_settings s where s.id = 1;
end;
$$;

create function public.admin_update_settings(p_commission_bps integer, p_rider_bps integer, p_limit integer)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_commission_bps is null or p_commission_bps not between 0 and 5000
     or p_rider_bps is null or p_rider_bps not between 0 and 10000
     or p_limit is null or p_limit not between 0 and 1000000 then
    raise exception 'bad_settings';
  end if;
  update public.platform_settings
     set default_commission_bps = p_commission_bps, rider_share_bps = p_rider_bps,
         rider_cash_limit_pkr = p_limit
   where id = 1;
end;
$$;

create function public.admin_set_commission(p_restaurant uuid, p_bps integer) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_bps is not null and p_bps not between 0 and 5000 then raise exception 'bad_commission'; end if;
  update public.restaurants set commission_bps = p_bps where id = p_restaurant;
  if not found then raise exception 'restaurant_not_found'; end if;
end;
$$;

create function public.admin_record_payout(p_restaurant uuid, p_amount integer, p_note text default null)
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
  if p_amount > public.restaurant_balance(p_restaurant) then raise exception 'exceeds_balance'; end if;
  insert into public.restaurant_payouts (restaurant_id, amount_pkr, note, created_by)
  values (p_restaurant, p_amount, v_note, v_user);
end;
$$;

create function public.admin_record_deposit(p_rider uuid, p_amount integer, p_note text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_note text := nullif(trim(coalesce(p_note, '')), '');
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_amount is null or p_amount < 1 or p_amount > 10000000 then raise exception 'bad_amount'; end if;
  if v_note is not null and char_length(v_note) > 200 then raise exception 'bad_note'; end if;
  perform 1 from public.profiles p where p.id = p_rider and p.role = 'rider' for update;
  if not found then raise exception 'not_a_rider'; end if;
  if p_amount > public.rider_cash_held(p_rider) then raise exception 'exceeds_balance'; end if;
  insert into public.rider_deposits (rider_id, amount_pkr, note, created_by)
  values (p_rider, p_amount, v_note, v_user);
end;
$$;

create function public.admin_recent_settlements()
returns table (g_kind text, g_who text, g_amount integer, g_note text, g_created timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query
    select x.k, x.w, x.a, x.n, x.c from (
      select 'payout'::text as k, r.name as w, pa.amount_pkr as a, pa.note as n, pa.created_at as c
        from public.restaurant_payouts pa join public.restaurants r on r.id = pa.restaurant_id
      union all
      select 'deposit'::text, coalesce(pr.full_name, u.email::text), d.amount_pkr, d.note, d.created_at
        from public.rider_deposits d
        left join public.profiles pr on pr.id = d.rider_id
        left join auth.users u on u.id = d.rider_id
    ) x order by x.c desc limit 30;
end;
$$;

-- 9. Admin: overview, orders, riders, restaurants.
create function public.admin_overview()
returns table (ov_orders_today integer, ov_delivered_today integer, ov_active integer, ov_sales_today integer,
               ov_revenue integer, ov_owed integer, ov_cash integer, ov_restaurants integer, ov_riders integer)
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
    coalesce((select sum(o.commission_pkr + o.platform_delivery_pkr) from public.orders o
              where o.delivered_at is not null), 0)::integer,
    (coalesce((select sum(o.restaurant_share_pkr) from public.orders o where o.delivered_at is not null), 0)
     - coalesce((select sum(pa.amount_pkr) from public.restaurant_payouts pa), 0))::integer,
    (coalesce((select sum(o.total_pkr - o.rider_pay_pkr) from public.orders o where o.delivered_at is not null), 0)
     - coalesce((select sum(d.amount_pkr) from public.rider_deposits d), 0))::integer,
    (select count(*) from public.restaurants)::integer,
    (select count(*) from public.profiles p where p.role = 'rider')::integer;
end;
$$;

create function public.admin_orders(
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
           o.total_pkr, coalesce(rp.full_name, ru.email::text)
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

create function public.admin_order_detail(p_id uuid)
returns table (d_id uuid, d_created timestamptz, d_status text, d_ready timestamptz, d_delivered timestamptz,
  d_restaurant text, d_restaurant_id uuid, d_customer text, d_customer_email text, d_phone text,
  d_address text, d_note text, d_items text, d_subtotal integer, d_fee integer, d_total integer,
  d_rider text, d_rider_email text, d_rider_id uuid, d_bps integer, d_commission integer,
  d_rest_share integer, d_rider_pay integer, d_platform_fee integer)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query
    select o.id, o.created_at, o.status::text, o.ready_at, o.delivered_at, r.name, r.id,
           coalesce(cp.full_name, case when o.customer_id is null then 'Deleted account' else 'Customer' end),
           cu.email::text, o.phone, o.delivery_address, o.note,
           (select string_agg(i.quantity::text || ' x ' || i.item_name, ', ' order by i.item_name)
              from public.order_items i where i.order_id = o.id),
           o.subtotal_pkr, o.delivery_fee_pkr, o.total_pkr,
           rp.full_name, ru.email::text, o.rider_id,
           o.commission_bps, o.commission_pkr, o.restaurant_share_pkr, o.rider_pay_pkr, o.platform_delivery_pkr
    from public.orders o
    join public.restaurants r on r.id = o.restaurant_id
    left join public.profiles cp on cp.id = o.customer_id
    left join auth.users cu on cu.id = o.customer_id
    left join public.profiles rp on rp.id = o.rider_id
    left join auth.users ru on ru.id = o.rider_id
    where o.id = p_id;
end;
$$;

create function public.admin_riders(p_id uuid default null)
returns table (r_id uuid, r_email text, r_name text, r_phone text, r_zone text,
               r_delivered integer, r_active integer, r_held integer)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query
    select p.id, u.email::text, p.full_name, p.phone, z.name,
      (select count(*) from public.orders o where o.rider_id = p.id and o.delivered_at is not null)::integer,
      (select count(*) from public.orders o where o.rider_id = p.id and o.status = 'out_for_delivery')::integer,
      public.rider_cash_held(p.id)
    from public.profiles p
    join auth.users u on u.id = p.id
    left join public.zones z on z.id = p.zone_id
    where p.role = 'rider' and (p_id is null or p.id = p_id)
    order by p.full_name;
end;
$$;

create function public.admin_restaurants(p_id uuid default null)
returns table (s_id uuid, s_slug text, s_name text, s_area text, s_owner text, s_zone text, s_open boolean,
               s_bps integer, s_custom boolean, s_orders integer, s_sales integer, s_commission integer,
               s_paid integer, s_owed integer)
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
      coalesce((select sum(pa.amount_pkr) from public.restaurant_payouts pa
                where pa.restaurant_id = r.id), 0)::integer,
      public.restaurant_balance(r.id)
    from public.restaurants r
    cross join public.platform_settings st
    left join auth.users ou on ou.id = r.owner_id
    left join public.zones z on z.id = r.zone_id
    where p_id is null or r.id = p_id
    order by r.name;
end;
$$;

-- 10. Who may call what.
revoke execute on function public.owner_mark_ready(uuid) from public, anon;
revoke execute on function public.rider_wallet() from public, anon;
revoke execute on function public.owner_earnings() from public, anon;
revoke execute on function public.admin_get_settings() from public, anon;
revoke execute on function public.admin_update_settings(integer, integer, integer) from public, anon;
revoke execute on function public.admin_set_commission(uuid, integer) from public, anon;
revoke execute on function public.admin_record_payout(uuid, integer, text) from public, anon;
revoke execute on function public.admin_record_deposit(uuid, integer, text) from public, anon;
revoke execute on function public.admin_recent_settlements() from public, anon;
revoke execute on function public.admin_overview() from public, anon;
revoke execute on function public.admin_orders(text, uuid, uuid, integer) from public, anon;
revoke execute on function public.admin_order_detail(uuid) from public, anon;
revoke execute on function public.admin_riders(uuid) from public, anon;
revoke execute on function public.admin_restaurants(uuid) from public, anon;
grant execute on function public.owner_mark_ready(uuid) to authenticated;
grant execute on function public.rider_wallet() to authenticated;
grant execute on function public.owner_earnings() to authenticated;
grant execute on function public.admin_get_settings() to authenticated;
grant execute on function public.admin_update_settings(integer, integer, integer) to authenticated;
grant execute on function public.admin_set_commission(uuid, integer) to authenticated;
grant execute on function public.admin_record_payout(uuid, integer, text) to authenticated;
grant execute on function public.admin_record_deposit(uuid, integer, text) to authenticated;
grant execute on function public.admin_recent_settlements() to authenticated;
grant execute on function public.admin_overview() to authenticated;
grant execute on function public.admin_orders(text, uuid, uuid, integer) to authenticated;
grant execute on function public.admin_order_detail(uuid) to authenticated;
grant execute on function public.admin_riders(uuid) to authenticated;
grant execute on function public.admin_restaurants(uuid) to authenticated;