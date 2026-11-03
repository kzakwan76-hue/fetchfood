-- 1. Settings and new columns.
alter table public.platform_settings
  add column require_rider_on_duty boolean not null default false,
  add column unclaimed_bonus_pkr integer not null default 50 check (unclaimed_bonus_pkr between 0 and 5000),
  add column cancel_after_minutes integer not null default 20 check (cancel_after_minutes between 15 and 120);

alter table public.orders
  add column pickup_code text check (pickup_code is null or pickup_code ~ '^[0-9]{4}$'),
  add column claimed_at timestamptz,
  add column handed_over_at timestamptz,
  add column handover_attempts integer not null default 0,
  add column bonus_pkr integer not null default 0 check (bonus_pkr between 0 and 5000),
  add column alert1_at timestamptz,
  add column alert2_at timestamptz,
  add column cancel_reason text check (cancel_reason is null or char_length(cancel_reason) <= 100);
-- These columns are NOT in the column grants, so customers and owners cannot read them (the code stays secret).

alter table public.rider_profiles
  add column on_duty boolean not null default false,
  add column duty_until timestamptz;

create table public.sweep_state (
  id integer primary key check (id = 1),
  last_run timestamptz not null
);
insert into public.sweep_state values (1, now() - interval '1 hour');
alter table public.sweep_state enable row level security;
revoke all on public.sweep_state from anon, authenticated;

create table public.rider_payouts (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid references auth.users (id) on delete set null,
  amount_pkr integer not null check (amount_pkr between 1 and 10000000),
  note text check (note is null or char_length(note) <= 200),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create table public.rider_credits (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid references auth.users (id) on delete set null,
  amount_pkr integer not null check (amount_pkr between 1 and 100000),
  note text not null check (char_length(note) between 3 and 200),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.rider_payouts enable row level security;
alter table public.rider_credits enable row level security;
revoke all on public.rider_payouts, public.rider_credits from anon, authenticated;

-- 2. Money: riders hand in ALL the cash; we owe them their fees, bonuses and incentives.
create or replace function public.rider_cash_held(p_rider uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select (coalesce((select sum(o.total_pkr) from public.orders o
                    where o.rider_id = p_rider and o.delivered_at is not null), 0)
        - coalesce((select sum(d.amount_pkr) from public.rider_deposits d
                    where d.rider_id = p_rider), 0))::integer;
$$;
create function public.rider_owed(p_rider uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select (coalesce((select sum(o.rider_pay_pkr + o.bonus_pkr) from public.orders o
                    where o.rider_id = p_rider and o.delivered_at is not null), 0)
        + coalesce((select sum(c.amount_pkr) from public.rider_credits c where c.rider_id = p_rider), 0)
        - coalesce((select sum(pa.amount_pkr) from public.rider_payouts pa where pa.rider_id = p_rider), 0))::integer;
$$;
revoke execute on function public.rider_cash_held(uuid) from public, anon, authenticated;
revoke execute on function public.rider_owed(uuid) from public, anon, authenticated;

-- 3. Customers cannot order where no rider is on duty (when the rule is switched on).
create function public.zones_open_for_orders() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select z.id from public.zones z
  where z.is_active and (
    not (select s.require_rider_on_duty from public.platform_settings s where s.id = 1)
    or exists (select 1 from public.profiles p
               join public.rider_profiles rp on rp.user_id = p.id
               where p.role = 'rider' and p.zone_id = z.id and rp.status = 'approved'
                 and rp.on_duty and rp.duty_until > now()));
$$;

create function public.orders_require_riders() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_zone uuid;
begin
  if (select s.require_rider_on_duty from public.platform_settings s where s.id = 1) then
    select r.zone_id into v_zone from public.restaurants r where r.id = new.restaurant_id;
    if not exists (select 1 from public.profiles p
                   join public.rider_profiles rp on rp.user_id = p.id
                   where p.role = 'rider' and p.zone_id = v_zone and rp.status = 'approved'
                     and rp.on_duty and rp.duty_until > now()) then
      raise exception 'no_riders';
    end if;
  end if;
  return new;
end;
$$;
create trigger orders_require_riders_trg before insert on public.orders
  for each row execute function public.orders_require_riders();

create function public.rider_set_duty(p_on boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid());
begin
  if not public.is_rider() then raise exception 'not_rider'; end if;
  if not exists (select 1 from public.rider_profiles rp where rp.user_id = v_user and rp.status = 'approved') then
    raise exception 'kyc_required';
  end if;
  if p_on is true then
    update public.rider_profiles set on_duty = true, duty_until = now() + interval '8 hours' where user_id = v_user;
  else
    if exists (select 1 from public.orders o where o.rider_id = v_user and o.status in ('preparing', 'out_for_delivery')) then
      raise exception 'has_active';
    end if;
    update public.rider_profiles set on_duty = false, duty_until = null where user_id = v_user;
  end if;
end;
$$;

create function public.rider_duty() returns table (d_on boolean, d_until timestamptz)
language sql stable security definer set search_path = '' as $$
  select coalesce(rp.on_duty and rp.duty_until > now(), false), rp.duty_until
  from public.rider_profiles rp where rp.user_id = (select auth.uid());
$$;

-- 4. Rider flow: claim (with a pickup code), release before handover, ready list, my orders, wallet.
create or replace function public.rider_claim_order(p_order_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_order public.orders%rowtype;
  v_limit integer;
  v_exposure integer;
begin
  if not public.is_rider() then raise exception 'not_rider'; end if;
  if not exists (select 1 from public.rider_profiles rp where rp.user_id = v_user and rp.status = 'approved') then
    raise exception 'kyc_required';
  end if;
  if not exists (select 1 from public.rider_profiles rp
                 where rp.user_id = v_user and rp.on_duty and rp.duty_until > now()) then
    raise exception 'off_duty';
  end if;
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
  v_limit := coalesce((select rp.cash_limit_pkr from public.rider_profiles rp where rp.user_id = v_user),
                      (select s.rider_cash_limit_pkr from public.platform_settings s where s.id = 1));
  -- Exposure = cash already held + orders already on the road. A rider carrying nothing can always take one order.
  v_exposure := public.rider_cash_held(v_user)
    + coalesce((select sum(o.total_pkr) from public.orders o
                where o.rider_id = v_user and o.status = 'out_for_delivery'), 0);
  if v_exposure > 0 and v_exposure + v_order.total_pkr > v_limit then raise exception 'cash_limit'; end if;
  if (select count(*) from public.orders o
      where o.rider_id = v_user and o.status in ('preparing', 'out_for_delivery')) >= 3 then
    raise exception 'too_many';
  end if;
  update public.orders
     set rider_id = v_user, claimed_at = now(), handover_attempts = 0,
         pickup_code = lpad(floor(random() * 10000)::integer::text, 4, '0')
   where id = p_order_id;
end;
$$;

-- A rider can give an order back only BEFORE the restaurant has handed it over.
create or replace function public.rider_release_order(p_order_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_order public.orders%rowtype;
begin
  if not public.is_rider() then raise exception 'not_rider'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.rider_id is distinct from v_user then raise exception 'order_not_found'; end if;
  if v_order.status <> 'preparing' then raise exception 'invalid_transition'; end if;
  update public.orders
     set rider_id = null, claimed_at = null, pickup_code = null, handover_attempts = 0,
         ready_at = now(), alert1_at = null, alert2_at = null
   where id = p_order_id;
end;
$$;

drop function public.rider_available_orders();
create function public.rider_available_orders()
returns table (o_id uuid, o_restaurant text, o_area text, o_total integer, o_created timestamptz, o_bonus integer)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_rider() then raise exception 'not_rider'; end if;
  return query
    select o.id, r.name, r.area, o.total_pkr, o.created_at, o.bonus_pkr
    from public.orders o
    join public.restaurants r on r.id = o.restaurant_id
    where o.status = 'preparing' and o.ready_at is not null and o.rider_id is null
      and r.zone_id is not null
      and r.zone_id = (select p.zone_id from public.profiles p where p.id = (select auth.uid()))
      and exists (select 1 from public.rider_profiles rp
                  where rp.user_id = (select auth.uid()) and rp.status = 'approved'
                    and rp.on_duty and rp.duty_until > now())
    order by o.created_at
    limit 50;
end;
$$;

drop function public.rider_my_orders();
create function public.rider_my_orders()
returns table (
  o_id uuid, o_restaurant text, o_area text, o_status text, o_address text, o_phone text,
  o_note text, o_total integer, o_created timestamptz, o_items text, o_called timestamptz,
  o_code text, o_bonus integer
)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_rider() then raise exception 'not_rider'; end if;
  return query
    select o.id, r.name, r.area, o.status::text,
           case when o.status in ('out_for_delivery', 'delivered') then o.delivery_address end,
           case when o.status in ('out_for_delivery', 'delivered') then o.phone end,
           case when o.status in ('out_for_delivery', 'delivered') then o.note end,
           o.total_pkr, o.created_at,
           (select string_agg(i.quantity::text || ' x ' || i.item_name, ', ' order by i.item_name)
              from public.order_items i where i.order_id = o.id),
           o.customer_called_at,
           case when o.status = 'preparing' then o.pickup_code end,
           o.bonus_pkr
    from public.orders o
    join public.restaurants r on r.id = o.restaurant_id
    where o.rider_id = (select auth.uid())
    order by o.created_at desc
    limit 20;
end;
$$;

drop function public.rider_wallet();
create function public.rider_wallet()
returns table (w_delivered integer, w_earned integer, w_held integer, w_limit integer, w_owed integer)
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid());
begin
  if not public.is_rider() then raise exception 'not_rider'; end if;
  return query select
    (select count(*) from public.orders o where o.rider_id = v_uid and o.delivered_at is not null)::integer,
    (coalesce((select sum(o.rider_pay_pkr + o.bonus_pkr) from public.orders o
               where o.rider_id = v_uid and o.delivered_at is not null), 0)
     + coalesce((select sum(c.amount_pkr) from public.rider_credits c where c.rider_id = v_uid), 0))::integer,
    public.rider_cash_held(v_uid),
    coalesce((select rp.cash_limit_pkr from public.rider_profiles rp where rp.user_id = v_uid),
             (select s.rider_cash_limit_pkr from public.platform_settings s where s.id = 1)),
    public.rider_owed(v_uid);
end;
$$;

-- 5. Owner: see who is coming, and hand over only against the right code.
create function public.owner_order_riders()
returns table (v_order uuid, v_name text, v_vehicle text, v_reg text, v_phone text)
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated'; end if;
  return query
    select o.id, coalesce(nullif(split_part(rp.legal_name, ' ', 1), ''), 'Rider'),
           rp.vehicle_type, rp.vehicle_reg, pr.phone
    from public.orders o
    join public.restaurants r on r.id = o.restaurant_id and r.owner_id = (select auth.uid())
    join public.rider_profiles rp on rp.user_id = o.rider_id
    left join public.profiles pr on pr.id = o.rider_id
    where o.status = 'preparing' and o.rider_id is not null;
end;
$$;

-- Returns 'ok', 'wrong_code' or 'locked' (a wrong attempt must be saved, so it is not an exception).
create function public.owner_handover(p_order_id uuid, p_code text) returns text
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
  if v_order.status <> 'preparing' or v_order.rider_id is null or v_order.pickup_code is null then
    raise exception 'invalid_transition';
  end if;
  if v_order.handover_attempts >= 5 then return 'locked'; end if;
  if trim(coalesce(p_code, '')) <> v_order.pickup_code then
    update public.orders set handover_attempts = handover_attempts + 1 where id = p_order_id;
    return 'wrong_code';
  end if;
  update public.orders set status = 'out_for_delivery', handed_over_at = now() where id = p_order_id;
  return 'ok';
end;
$$;

-- 6. Notifications: new wording for the new flow, and cancellations also tell the customer.
create or replace function public.orders_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
  v_name text;
  v_zone uuid;
  v_first text;
  v_short text := left(new.id::text, 8);
begin
  begin
    select r.owner_id, r.name, r.zone_id into v_owner, v_name, v_zone
      from public.restaurants r where r.id = new.restaurant_id;

    if tg_op = 'INSERT' then
      if v_owner is not null then
        insert into public.notifications (user_id, kind, title, body, link)
        values (v_owner, 'new_order', 'New order #' || v_short,
                'Rs. ' || new.total_pkr || ' to collect. Open your dashboard to accept it.', '/dashboard');
      end if;
    else
      if new.status = 'cancelled' and old.status <> 'cancelled' then
        if v_owner is not null then
          insert into public.notifications (user_id, kind, title, body, link)
          values (v_owner, 'cancelled', 'Order #' || v_short || ' was cancelled',
                  coalesce(new.cancel_reason, 'No need to prepare it.'), '/dashboard');
        end if;
        if new.customer_id is not null then
          insert into public.notifications (user_id, kind, title, body, link)
          values (new.customer_id, 'cancelled', 'Your order was cancelled',
                  'Your order from ' || v_name || ' was cancelled'
                  || case when new.cancel_reason is not null then ': ' || new.cancel_reason else '.' end,
                  '/orders/' || new.id::text);
        end if;
      end if;

      if new.status = 'preparing' and new.ready_at is not null and new.rider_id is null
         and (old.ready_at is null or old.rider_id is not null) then
        insert into public.notifications (user_id, kind, title, body, link)
        select p.id, 'pickup', 'Order ready for pickup',
               v_name || ': Rs. ' || new.total_pkr || ' cash to collect.', '/rider'
        from public.profiles p
        join public.rider_profiles rp on rp.user_id = p.id
        where p.role = 'rider' and rp.status = 'approved' and rp.on_duty and rp.duty_until > now()
          and v_zone is not null and p.zone_id = v_zone;
      end if;

      if new.rider_id is not null and old.rider_id is null and v_owner is not null then
        select nullif(split_part(rp.legal_name, ' ', 1), '') into v_first
          from public.rider_profiles rp where rp.user_id = new.rider_id;
        insert into public.notifications (user_id, kind, title, body, link)
        values (v_owner, 'rider_coming', 'A rider is coming for order #' || v_short,
                coalesce(v_first, 'A rider') || ' will collect it. Ask for the 4-digit code before you hand it over.',
                '/dashboard');
      end if;

      if new.status = 'out_for_delivery' and old.status <> 'out_for_delivery' and new.customer_id is not null then
        insert into public.notifications (user_id, kind, title, body, link)
        values (new.customer_id, 'on_the_way', 'Your order is on the way',
                'Your rider picked up your order from ' || v_name ||
                ' and may call you to confirm your address.', '/orders/' || new.id::text);
      end if;

      if new.status = 'delivered' and old.status <> 'delivered' and new.customer_id is not null then
        insert into public.notifications (user_id, kind, title, body, link)
        values (new.customer_id, 'delivered', 'Delivered. Enjoy!',
                'How was your order from ' || v_name || '? You can leave a review.', '/orders/' || new.id::text);
      end if;
    end if;
  exception when others then
    null;
  end;
  return null;
end;
$$;

-- 7. Stuck orders: alerts, bonus, automatic release and cancellation.
create function public.sweep_stuck_orders() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_cancel integer;
  v_bonus integer;
  v_count integer := 0;
  r record;
begin
  select s.cancel_after_minutes, s.unclaimed_bonus_pkr into v_cancel, v_bonus
    from public.platform_settings s where s.id = 1;

  -- The restaurant never accepted: cancel after 15 minutes.
  for r in select o.id from public.orders o
           where o.status = 'placed' and o.created_at < now() - interval '15 minutes'
           for update of o skip locked
  loop
    update public.orders set status = 'cancelled', cancel_reason = 'The restaurant did not respond in time.'
     where id = r.id;
    v_count := v_count + 1;
  end loop;

  -- A rider claimed it but did not collect it within 15 minutes: give it back to the pool.
  for r in select o.id from public.orders o
           where o.status = 'preparing' and o.rider_id is not null and o.handed_over_at is null
             and o.claimed_at < now() - interval '15 minutes'
           for update of o skip locked
  loop
    update public.orders
       set rider_id = null, claimed_at = null, pickup_code = null, handover_attempts = 0,
           ready_at = now(), alert1_at = null, alert2_at = null
     where id = r.id;
    v_count := v_count + 1;
  end loop;

  -- Ready for 5 minutes and nobody took it: add the bonus and alert the riders again.
  for r in select o.id from public.orders o
           where o.status = 'preparing' and o.ready_at is not null and o.rider_id is null
             and o.alert1_at is null and o.ready_at < now() - interval '5 minutes'
           for update of o skip locked
  loop
    update public.orders set alert1_at = now(), bonus_pkr = v_bonus where id = r.id;
    insert into public.notifications (user_id, kind, title, body, link)
    select p.id, 'pickup', 'Still waiting for a rider',
           rst.name || ': Rs. ' || o2.total_pkr || ' cash.'
             || case when v_bonus > 0 then ' Bonus Rs. ' || v_bonus || ' for taking it.' else '' end,
           '/rider'
    from public.orders o2
    join public.restaurants rst on rst.id = o2.restaurant_id
    join public.profiles p on p.role = 'rider' and p.zone_id = rst.zone_id
    join public.rider_profiles rp on rp.user_id = p.id and rp.status = 'approved'
                                 and rp.on_duty and rp.duty_until > now()
    where o2.id = r.id;
    v_count := v_count + 1;
  end loop;

  -- Ready for 10 minutes: tell the admins.
  for r in select o.id from public.orders o
           where o.status = 'preparing' and o.ready_at is not null and o.rider_id is null
             and o.alert2_at is null and o.ready_at < now() - interval '10 minutes'
           for update of o skip locked
  loop
    update public.orders set alert2_at = now() where id = r.id;
    insert into public.notifications (user_id, kind, title, body, link)
    select p.id, 'stuck', 'An order needs a rider',
           'Order #' || left(r.id::text, 8) || ' has waited 10 minutes for a rider.',
           '/admin/overview'
    from public.profiles p where p.role = 'admin';
    v_count := v_count + 1;
  end loop;

  -- Nobody took it in time: cancel and tell everyone.
  for r in select o.id from public.orders o
           where o.status = 'preparing' and o.ready_at is not null and o.rider_id is null
             and o.ready_at < now() - make_interval(mins => v_cancel)
           for update of o skip locked
  loop
    update public.orders set status = 'cancelled', cancel_reason = 'No rider was available. Sorry about that.'
     where id = r.id;
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- Safe for any logged-in page to call: it does real work at most once every 30 seconds.
create function public.run_sweep() returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.sweep_state set last_run = now()
   where id = 1 and last_run < now() - interval '30 seconds';
  if found then perform public.sweep_stuck_orders(); end if;
end;
$$;

-- Run it every minute with pg_cron when the extension is available.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('fetchfood-sweep', '* * * * *', 'select public.sweep_stuck_orders()');
exception when others then
  raise notice 'pg_cron is not available: stuck-order checks will run only while pages are open';
end $$;

-- 8. Admin: rules, cancel, release, attention, balances, payouts, incentives.
drop function public.admin_get_settings();
create function public.admin_get_settings()
returns table (c_commission_bps integer, c_rider_bps integer, c_limit integer,
               c_require_duty boolean, c_bonus integer, c_cancel integer)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query select s.default_commission_bps, s.rider_share_bps, s.rider_cash_limit_pkr,
                      s.require_rider_on_duty, s.unclaimed_bonus_pkr, s.cancel_after_minutes
    from public.platform_settings s where s.id = 1;
end;
$$;

create function public.admin_update_rules(p_require_duty boolean, p_bonus integer, p_cancel integer)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_require_duty is null or p_bonus is null or p_bonus not between 0 and 5000
     or p_cancel is null or p_cancel not between 15 and 120 then
    raise exception 'bad_settings';
  end if;
  update public.platform_settings
     set require_rider_on_duty = p_require_duty, unclaimed_bonus_pkr = p_bonus, cancel_after_minutes = p_cancel
   where id = 1;
end;
$$;

create function public.admin_cancel_order(p_order_id uuid, p_reason text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_order public.orders%rowtype;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if v_order.status in ('delivered', 'cancelled') then raise exception 'invalid_transition'; end if;
  update public.orders
     set status = 'cancelled',
         cancel_reason = left(coalesce(nullif(trim(coalesce(p_reason, '')), ''), 'Cancelled by FetchFood.'), 100)
   where id = p_order_id;
end;
$$;

-- Frees a rider-held order that has not been delivered yet (before or after the handover).
create or replace function public.admin_release_order(p_order_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_order public.orders%rowtype;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if v_order.rider_id is null or v_order.status not in ('preparing', 'out_for_delivery') then
    raise exception 'invalid_transition';
  end if;
  update public.orders
     set rider_id = null, status = 'preparing', claimed_at = null, handed_over_at = null,
         pickup_code = null, handover_attempts = 0, customer_called_at = null,
         ready_at = now(), alert1_at = null, alert2_at = null
   where id = p_order_id;
end;
$$;

create or replace function public.admin_active_deliveries()
returns table (o_id uuid, o_restaurant text, o_rider_email text, o_rider_name text, o_total integer, o_created timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query
    select o.id, r.name, u.email::text, p.full_name, o.total_pkr, o.created_at
    from public.orders o
    join public.restaurants r on r.id = o.restaurant_id
    left join auth.users u on u.id = o.rider_id
    left join public.profiles p on p.id = o.rider_id
    where o.rider_id is not null and o.status in ('preparing', 'out_for_delivery')
    order by o.created_at
    limit 50;
end;
$$;

create function public.admin_attention()
returns table (a_order uuid, a_kind text, a_restaurant text, a_minutes integer)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query
    select x.oid, x.kind, x.rname, x.mins from (
      select o.id as oid, 'The restaurant has not accepted it'::text as kind, r.name as rname,
             (extract(epoch from now() - o.created_at) / 60)::integer as mins
        from public.orders o join public.restaurants r on r.id = o.restaurant_id
       where o.status = 'placed' and o.created_at < now() - interval '5 minutes'
      union all
      select o.id, 'Ready, waiting for a rider'::text, r.name,
             (extract(epoch from now() - o.ready_at) / 60)::integer
        from public.orders o join public.restaurants r on r.id = o.restaurant_id
       where o.status = 'preparing' and o.ready_at is not null and o.rider_id is null
         and o.ready_at < now() - interval '5 minutes'
      union all
      select o.id, 'Rider has not collected it'::text, r.name,
             (extract(epoch from now() - o.claimed_at) / 60)::integer
        from public.orders o join public.restaurants r on r.id = o.restaurant_id
       where o.status = 'preparing' and o.rider_id is not null and o.claimed_at < now() - interval '8 minutes'
    ) x order by x.mins desc;
end;
$$;

-- Riders who have held cash for more than 24 hours.
create function public.admin_stale_riders()
returns table (s_rider uuid, s_name text, s_held integer, s_hours integer)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query
    select x.id, x.nm, x.held, x.hrs from (
      select p.id as id, coalesce(p.full_name, u.email::text) as nm,
             public.rider_cash_held(p.id) as held,
             (select (extract(epoch from now() - min(o.delivered_at)) / 3600)::integer
                from public.orders o
               where o.rider_id = p.id and o.delivered_at is not null
                 and o.delivered_at > coalesce((select max(d.created_at) from public.rider_deposits d
                                                where d.rider_id = p.id), '-infinity'::timestamptz)) as hrs
        from public.profiles p join auth.users u on u.id = p.id
       where p.role = 'rider'
    ) x
    where x.held > 0 and coalesce(x.hrs, 0) >= 24
    order by x.hrs desc;
end;
$$;

drop function public.admin_riders(uuid);
create function public.admin_riders(p_id uuid default null)
returns table (r_id uuid, r_email text, r_name text, r_phone text, r_zone text,
               r_delivered integer, r_active integer, r_held integer, r_owed integer)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query
    select p.id, u.email::text, p.full_name, p.phone, z.name,
      (select count(*) from public.orders o where o.rider_id = p.id and o.delivered_at is not null)::integer,
      (select count(*) from public.orders o
        where o.rider_id = p.id and o.status in ('preparing', 'out_for_delivery'))::integer,
      public.rider_cash_held(p.id),
      public.rider_owed(p.id)
    from public.profiles p
    join auth.users u on u.id = p.id
    left join public.zones z on z.id = p.zone_id
    where p.role = 'rider' and (p_id is null or p.id = p_id)
    order by p.full_name;
end;
$$;

-- Pay a rider their fees and bonuses, but only after they have handed in ALL their cash.
create function public.admin_record_rider_payout(p_rider uuid, p_amount integer, p_note text default null)
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
  if public.rider_cash_held(p_rider) > 0 then raise exception 'deposit_first'; end if;
  if p_amount > public.rider_owed(p_rider) then raise exception 'exceeds_balance'; end if;
  insert into public.rider_payouts (rider_id, amount_pkr, note, created_by) values (p_rider, p_amount, v_note, v_user);
end;
$$;

-- A manual incentive: first-month guarantee, referral bonus, bad-weather bonus...
create function public.admin_add_credit(p_rider uuid, p_amount integer, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_note text := trim(coalesce(p_note, ''));
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_amount is null or p_amount < 1 or p_amount > 100000 then raise exception 'bad_amount'; end if;
  if char_length(v_note) not between 3 and 200 then raise exception 'bad_note'; end if;
  perform 1 from public.profiles p where p.id = p_rider and p.role = 'rider';
  if not found then raise exception 'not_a_rider'; end if;
  insert into public.rider_credits (rider_id, amount_pkr, note, created_by) values (p_rider, p_amount, v_note, v_user);
end;
$$;

create or replace function public.admin_recent_settlements()
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
      union all
      select 'rider_payout'::text, coalesce(pr.full_name, u.email::text), rpay.amount_pkr, rpay.note, rpay.created_at
        from public.rider_payouts rpay
        left join public.profiles pr on pr.id = rpay.rider_id
        left join auth.users u on u.id = rpay.rider_id
      union all
      select 'credit'::text, coalesce(pr.full_name, u.email::text), c.amount_pkr, c.note, c.created_at
        from public.rider_credits c
        left join public.profiles pr on pr.id = c.rider_id
        left join auth.users u on u.id = c.rider_id
    ) x order by x.c desc limit 30;
end;
$$;

drop function public.admin_overview();
create function public.admin_overview()
returns table (ov_orders_today integer, ov_delivered_today integer, ov_active integer, ov_sales_today integer,
               ov_revenue integer, ov_owed integer, ov_cash integer, ov_restaurants integer, ov_riders integer,
               ov_rider_owed integer, ov_on_duty integer)
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
               where o.delivered_at is not null), 0)
     - coalesce((select sum(c.amount_pkr) from public.rider_credits c), 0))::integer,
    (coalesce((select sum(o.restaurant_share_pkr) from public.orders o where o.delivered_at is not null), 0)
     - coalesce((select sum(pa.amount_pkr) from public.restaurant_payouts pa), 0))::integer,
    (coalesce((select sum(o.total_pkr) from public.orders o where o.delivered_at is not null), 0)
     - coalesce((select sum(d.amount_pkr) from public.rider_deposits d), 0))::integer,
    (select count(*) from public.restaurants)::integer,
    (select count(*) from public.profiles p where p.role = 'rider')::integer,
    (coalesce((select sum(o.rider_pay_pkr + o.bonus_pkr) from public.orders o where o.delivered_at is not null), 0)
     + coalesce((select sum(c.amount_pkr) from public.rider_credits c), 0)
     - coalesce((select sum(rp.amount_pkr) from public.rider_payouts rp), 0))::integer,
    (select count(*) from public.rider_profiles rp
      where rp.status = 'approved' and rp.on_duty and rp.duty_until > now())::integer;
end;
$$;

-- 9. Who may call what.
revoke execute on function public.orders_require_riders() from public, anon, authenticated;
revoke execute on function public.sweep_stuck_orders() from public, anon, authenticated;
revoke execute on function public.rider_set_duty(boolean) from public, anon;
revoke execute on function public.rider_duty() from public, anon;
revoke execute on function public.rider_available_orders() from public, anon;
revoke execute on function public.rider_my_orders() from public, anon;
revoke execute on function public.rider_wallet() from public, anon;
revoke execute on function public.owner_order_riders() from public, anon;
revoke execute on function public.owner_handover(uuid, text) from public, anon;
revoke execute on function public.run_sweep() from public, anon;
revoke execute on function public.admin_get_settings() from public, anon;
revoke execute on function public.admin_update_rules(boolean, integer, integer) from public, anon;
revoke execute on function public.admin_cancel_order(uuid, text) from public, anon;
revoke execute on function public.admin_attention() from public, anon;
revoke execute on function public.admin_stale_riders() from public, anon;
revoke execute on function public.admin_riders(uuid) from public, anon;
revoke execute on function public.admin_record_rider_payout(uuid, integer, text) from public, anon;
revoke execute on function public.admin_add_credit(uuid, integer, text) from public, anon;
revoke execute on function public.admin_overview() from public, anon;
grant execute on function public.zones_open_for_orders() to anon, authenticated;
grant execute on function public.rider_set_duty(boolean) to authenticated;
grant execute on function public.rider_duty() to authenticated;
grant execute on function public.rider_available_orders() to authenticated;
grant execute on function public.rider_my_orders() to authenticated;
grant execute on function public.rider_wallet() to authenticated;
grant execute on function public.owner_order_riders() to authenticated;
grant execute on function public.owner_handover(uuid, text) to authenticated;
grant execute on function public.run_sweep() to authenticated;
grant execute on function public.admin_get_settings() to authenticated;
grant execute on function public.admin_update_rules(boolean, integer, integer) to authenticated;
grant execute on function public.admin_cancel_order(uuid, text) to authenticated;
grant execute on function public.admin_attention() to authenticated;
grant execute on function public.admin_stale_riders() to authenticated;
grant execute on function public.admin_riders(uuid) to authenticated;
grant execute on function public.admin_record_rider_payout(uuid, integer, text) to authenticated;
grant execute on function public.admin_add_credit(uuid, integer, text) to authenticated;
grant execute on function public.admin_overview() to authenticated;