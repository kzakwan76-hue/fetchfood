-- 1. Riders keep the whole delivery fee.
update public.platform_settings set rider_share_bps = 10000 where id = 1;

create or replace function public.admin_update_settings(p_commission_bps integer, p_rider_bps integer, p_limit integer)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_commission_bps is null or p_commission_bps not between 0 and 5000
     or p_limit is null or p_limit not between 0 and 1000000 then
    raise exception 'bad_settings';
  end if;
  -- p_rider_bps is ignored on purpose: riders always keep 100% of the delivery fee.
  update public.platform_settings
     set default_commission_bps = p_commission_bps, rider_share_bps = 10000, rider_cash_limit_pkr = p_limit
   where id = 1;
end;
$$;

-- 2. Rider profiles (ID checks). Nobody reads this table directly: only the functions below.
create table public.rider_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  legal_name text not null check (char_length(legal_name) between 2 and 80),
  cnic text not null unique check (cnic ~ '^[0-9]{13}$'),
  father_name text not null check (char_length(father_name) between 2 and 80),
  dob date not null,
  address text not null check (char_length(address) between 10 and 250),
  emergency_name text not null check (char_length(emergency_name) between 2 and 80),
  emergency_phone text not null check (emergency_phone ~ '^[0-9+ -]{10,20}$'),
  vehicle_type text not null check (vehicle_type in ('bike', 'bicycle', 'car')),
  vehicle_reg text check (vehicle_reg is null or char_length(vehicle_reg) <= 20),
  guarantor_name text not null check (char_length(guarantor_name) between 2 and 80),
  guarantor_phone text not null check (guarantor_phone ~ '^[0-9+ -]{10,20}$'),
  cnic_front_path text not null,
  cnic_back_path text not null,
  selfie_path text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'suspended')),
  review_note text check (review_note is null or char_length(review_note) <= 300),
  security_deposit_pkr integer not null default 0 check (security_deposit_pkr between 0 and 1000000),
  cash_limit_pkr integer check (cash_limit_pkr is null or cash_limit_pkr between 0 and 1000000),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null
);
alter table public.rider_profiles enable row level security;
revoke all on public.rider_profiles from anon, authenticated;

-- Private bucket for ID photos: applicants upload into their own folder, only admins read or delete.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('rider-documents', 'rider-documents', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = 2097152,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

create policy "applicants upload own documents" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'rider-documents'
              and (storage.foldername(objects.name))[1] = (select auth.uid())::text);
create policy "admins and owners read rider documents" on storage.objects
  for select to authenticated
  using (bucket_id = 'rider-documents'
         and (public.is_admin() or (storage.foldername(objects.name))[1] = (select auth.uid())::text));
create policy "admins delete rider documents" on storage.objects
  for delete to authenticated
  using (bucket_id = 'rider-documents' and public.is_admin());

create function public.submit_rider_application(
  p_legal_name text, p_cnic text, p_father text, p_dob date, p_address text,
  p_em_name text, p_em_phone text, p_vehicle_type text, p_vehicle_reg text,
  p_g_name text, p_g_phone text, p_front text, p_back text, p_selfie text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_role public.user_role;
  v_cnic text := regexp_replace(coalesce(p_cnic, ''), '[^0-9]', '', 'g');
  v_status text;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select p.role into v_role from public.profiles p where p.id = v_user;
  if v_role is null or v_role not in ('customer', 'rider') then raise exception 'not_allowed'; end if;

  if char_length(trim(coalesce(p_legal_name, ''))) not between 2 and 80
     or char_length(trim(coalesce(p_father, ''))) not between 2 and 80
     or char_length(trim(coalesce(p_em_name, ''))) not between 2 and 80
     or char_length(trim(coalesce(p_g_name, ''))) not between 2 and 80 then raise exception 'bad_name'; end if;
  if char_length(v_cnic) <> 13 then raise exception 'bad_cnic'; end if;
  if p_dob is null or p_dob > (current_date - interval '18 years')::date
     or p_dob < (current_date - interval '70 years')::date then raise exception 'bad_dob'; end if;
  if char_length(trim(coalesce(p_address, ''))) not between 10 and 250 then raise exception 'bad_address'; end if;
  if coalesce(p_em_phone, '') !~ '^[0-9+ -]{10,20}$' or coalesce(p_g_phone, '') !~ '^[0-9+ -]{10,20}$' then
    raise exception 'bad_phone';
  end if;
  if p_vehicle_type is null or p_vehicle_type not in ('bike', 'bicycle', 'car')
     or char_length(coalesce(p_vehicle_reg, '')) > 20 then raise exception 'bad_vehicle'; end if;
  if coalesce(p_front, '') !~ ('^' || v_user::text || '/cnic-front-[0-9]{10,16}\.(jpg|png|webp)$')
     or coalesce(p_back, '') !~ ('^' || v_user::text || '/cnic-back-[0-9]{10,16}\.(jpg|png|webp)$')
     or coalesce(p_selfie, '') !~ ('^' || v_user::text || '/selfie-[0-9]{10,16}\.(jpg|png|webp)$') then
    raise exception 'bad_path';
  end if;

  select rp.status into v_status from public.rider_profiles rp where rp.user_id = v_user;
  if v_status in ('approved', 'suspended') then raise exception 'already_reviewed'; end if;

  begin
    insert into public.rider_profiles
      (user_id, legal_name, cnic, father_name, dob, address, emergency_name, emergency_phone,
       vehicle_type, vehicle_reg, guarantor_name, guarantor_phone,
       cnic_front_path, cnic_back_path, selfie_path)
    values
      (v_user, trim(p_legal_name), v_cnic, trim(p_father), p_dob, trim(p_address), trim(p_em_name),
       trim(p_em_phone), p_vehicle_type, nullif(trim(coalesce(p_vehicle_reg, '')), ''),
       trim(p_g_name), trim(p_g_phone), p_front, p_back, p_selfie)
    on conflict (user_id) do update set
      legal_name = excluded.legal_name, cnic = excluded.cnic, father_name = excluded.father_name,
      dob = excluded.dob, address = excluded.address, emergency_name = excluded.emergency_name,
      emergency_phone = excluded.emergency_phone, vehicle_type = excluded.vehicle_type,
      vehicle_reg = excluded.vehicle_reg, guarantor_name = excluded.guarantor_name,
      guarantor_phone = excluded.guarantor_phone, cnic_front_path = excluded.cnic_front_path,
      cnic_back_path = excluded.cnic_back_path, selfie_path = excluded.selfie_path,
      status = 'pending', review_note = null, submitted_at = now(), reviewed_at = null, reviewed_by = null;
  exception when unique_violation then
    raise exception 'cnic_used';
  end;
end;
$$;

create function public.rider_my_application()
returns table (m_status text, m_note text, m_name text)
language sql stable security definer set search_path = '' as $$
  select rp.status, rp.review_note, rp.legal_name
  from public.rider_profiles rp where rp.user_id = (select auth.uid());
$$;

create function public.admin_rider_applications()
returns table (a_id uuid, a_name text, a_email text, a_status text, a_submitted timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query
    select rp.user_id, rp.legal_name, u.email::text, rp.status, rp.submitted_at
    from public.rider_profiles rp join auth.users u on u.id = rp.user_id
    order by (rp.status = 'pending') desc, rp.submitted_at desc
    limit 100;
end;
$$;

create function public.admin_rider_kyc(p_id uuid)
returns table (k_id uuid, k_status text, k_legal_name text, k_cnic text, k_father text, k_dob date,
  k_address text, k_emergency_name text, k_emergency_phone text, k_vehicle_type text, k_vehicle_reg text,
  k_guarantor_name text, k_guarantor_phone text, k_front text, k_back text, k_selfie text, k_note text,
  k_deposit integer, k_limit integer, k_submitted timestamptz, k_reviewed timestamptz,
  k_earned integer, k_zone_id uuid, k_email text, k_phone text)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query
    select rp.user_id, rp.status, rp.legal_name, rp.cnic, rp.father_name, rp.dob, rp.address,
      rp.emergency_name, rp.emergency_phone, rp.vehicle_type, rp.vehicle_reg, rp.guarantor_name,
      rp.guarantor_phone, rp.cnic_front_path, rp.cnic_back_path, rp.selfie_path, rp.review_note,
      rp.security_deposit_pkr, rp.cash_limit_pkr, rp.submitted_at, rp.reviewed_at,
      coalesce((select sum(o.rider_pay_pkr) from public.orders o
                where o.rider_id = rp.user_id and o.delivered_at is not null), 0)::integer,
      pr.zone_id, u.email::text, pr.phone
    from public.rider_profiles rp
    join auth.users u on u.id = rp.user_id
    left join public.profiles pr on pr.id = rp.user_id
    where rp.user_id = p_id;
end;
$$;

create function public.admin_review_rider(
  p_user uuid, p_action text, p_zone uuid, p_limit integer, p_deposit integer, p_note text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_status text;
  v_role public.user_role;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  select rp.status into v_status from public.rider_profiles rp where rp.user_id = p_user for update;
  if not found then raise exception 'application_not_found'; end if;
  if v_note is not null and char_length(v_note) > 300 then raise exception 'bad_note'; end if;

  if p_action = 'approve' then
    if v_status <> 'pending' then raise exception 'invalid_transition'; end if;
    if p_zone is null or not exists (select 1 from public.zones z where z.id = p_zone and z.is_active) then
      raise exception 'zone_not_found';
    end if;
    if coalesce(p_deposit, 0) not between 0 and 1000000
       or (p_limit is not null and p_limit not between 0 and 1000000) then raise exception 'bad_amount'; end if;
    select p.role into v_role from public.profiles p where p.id = p_user for update;
    if v_role is null or v_role not in ('customer', 'rider') then raise exception 'owner_role_conflict'; end if;
    update public.profiles set role = 'rider', zone_id = p_zone where id = p_user;
    update public.rider_profiles
       set status = 'approved', security_deposit_pkr = coalesce(p_deposit, 0), cash_limit_pkr = p_limit,
           review_note = null, reviewed_at = now(), reviewed_by = (select auth.uid())
     where user_id = p_user;
  elsif p_action = 'reject' then
    if v_status <> 'pending' then raise exception 'invalid_transition'; end if;
    if v_note is null or char_length(v_note) < 3 then raise exception 'bad_note'; end if;
    update public.rider_profiles
       set status = 'rejected', review_note = v_note, reviewed_at = now(), reviewed_by = (select auth.uid())
     where user_id = p_user;
  elsif p_action = 'suspend' then
    if v_status <> 'approved' then raise exception 'invalid_transition'; end if;
    update public.rider_profiles
       set status = 'suspended', review_note = v_note, reviewed_at = now(), reviewed_by = (select auth.uid())
     where user_id = p_user;
  elsif p_action = 'reinstate' then
    if v_status <> 'suspended' then raise exception 'invalid_transition'; end if;
    update public.rider_profiles
       set status = 'approved', review_note = null, reviewed_at = now(), reviewed_by = (select auth.uid())
     where user_id = p_user;
  else
    raise exception 'bad_action';
  end if;
end;
$$;

-- Riders can only be created through an approved application; a rider holding cash cannot be demoted.
create or replace function public.admin_set_role(p_email text, p_role public.user_role)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_target uuid;
  v_current public.user_role;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_role not in ('customer', 'restaurant_owner', 'rider') then raise exception 'role_not_allowed'; end if;

  select u.id into v_target from auth.users u where lower(u.email) = lower(trim(p_email));
  if v_target is null then raise exception 'user_not_found'; end if;
  select p.role into v_current from public.profiles p where p.id = v_target for update;
  if v_current is null then raise exception 'user_not_found'; end if;
  if v_current = 'admin' then raise exception 'cannot_change_admin'; end if;

  if p_role = 'rider' and not exists (
    select 1 from public.rider_profiles rp where rp.user_id = v_target and rp.status = 'approved') then
    raise exception 'needs_application';
  end if;
  if v_current = 'rider' and p_role <> 'rider' and public.rider_cash_held(v_target) > 0 then
    raise exception 'rider_holds_cash';
  end if;
  if p_role <> 'restaurant_owner'
     and exists (select 1 from public.restaurants r where r.owner_id = v_target) then
    raise exception 'owns_restaurants';
  end if;

  update public.profiles set role = p_role where id = v_target;
end;
$$;

-- 3. Rider rules: approved riders only, personal cash limit, whole delivery fee to the rider.
alter table public.orders add column customer_called_at timestamptz;

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
      and exists (select 1 from public.rider_profiles rp
                  where rp.user_id = (select auth.uid()) and rp.status = 'approved')
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
  if not exists (select 1 from public.rider_profiles rp where rp.user_id = v_user and rp.status = 'approved') then
    raise exception 'kyc_required';
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
  if public.rider_cash_held(v_user) >= coalesce(
       (select rp.cash_limit_pkr from public.rider_profiles rp where rp.user_id = v_user),
       (select s.rider_cash_limit_pkr from public.platform_settings s where s.id = 1)) then
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
  v_commission integer;
begin
  if not public.is_rider() then raise exception 'not_rider'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.rider_id is distinct from v_user then raise exception 'order_not_found'; end if;
  if v_order.status <> 'out_for_delivery' then raise exception 'invalid_transition'; end if;

  select coalesce(r.commission_bps, s.default_commission_bps) into v_bps
    from public.restaurants r cross join public.platform_settings s
   where r.id = v_order.restaurant_id and s.id = 1;
  v_commission := (v_order.subtotal_pkr * v_bps + 5000) / 10000;

  update public.orders set
    status = 'delivered', delivered_at = now(),
    commission_bps = v_bps, commission_pkr = v_commission,
    restaurant_share_pkr = v_order.subtotal_pkr - v_commission,
    rider_pay_pkr = v_order.delivery_fee_pkr,   -- the rider keeps the whole delivery fee
    platform_delivery_pkr = 0
  where id = p_order_id;
end;
$$;

create or replace function public.rider_wallet()
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
    coalesce((select rp.cash_limit_pkr from public.rider_profiles rp where rp.user_id = v_uid),
             (select s.rider_cash_limit_pkr from public.platform_settings s where s.id = 1));
end;
$$;

drop function public.rider_my_orders();
create function public.rider_my_orders()
returns table (
  o_id uuid, o_restaurant text, o_area text, o_status text, o_address text, o_phone text,
  o_note text, o_total integer, o_created timestamptz, o_items text, o_called timestamptz
)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_rider() then raise exception 'not_rider'; end if;
  return query
    select o.id, r.name, r.area, o.status::text, o.delivery_address, o.phone, o.note,
           o.total_pkr, o.created_at,
           (select string_agg(i.quantity::text || ' x ' || i.item_name, ', ' order by i.item_name)
              from public.order_items i where i.order_id = o.id),
           o.customer_called_at
    from public.orders o
    join public.restaurants r on r.id = o.restaurant_id
    where o.rider_id = (select auth.uid())
    order by o.created_at desc
    limit 20;
end;
$$;

create function public.rider_confirm_call(p_order_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_order public.orders%rowtype;
begin
  if not public.is_rider() then raise exception 'not_rider'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.rider_id is distinct from v_user then raise exception 'order_not_found'; end if;
  if v_order.status <> 'out_for_delivery' then raise exception 'invalid_transition'; end if;
  update public.orders set customer_called_at = coalesce(customer_called_at, now()) where id = p_order_id;
end;
$$;

create function public.admin_order_call(p_id uuid) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare v_called timestamptz;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  select o.customer_called_at into v_called from public.orders o where o.id = p_id;
  return v_called;
end;
$$;

-- 4. Notifications (the in-app "automated reply").
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  link text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select (id, kind, title, body, link, created_at, read_at) on public.notifications to authenticated;
create policy "read own notifications" on public.notifications
  for select to authenticated using ((select auth.uid()) = user_id);

create function public.my_unread_notifications() returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.notifications n
  where n.user_id = (select auth.uid()) and n.read_at is null;
$$;

create function public.mark_notifications_read() returns void
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid());
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  update public.notifications set read_at = now() where user_id = v_user and read_at is null;
end;
$$;

-- Writes the alerts. A failure here must never break an order, so errors are swallowed.
create function public.orders_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
  v_name text;
  v_zone uuid;
  v_rider text;
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
      if new.status = 'cancelled' and old.status <> 'cancelled' and v_owner is not null then
        insert into public.notifications (user_id, kind, title, body, link)
        values (v_owner, 'cancelled', 'Order #' || v_short || ' was cancelled', 'No need to prepare it.', '/dashboard');
      end if;

      -- Ready for pickup (or handed back by a rider): tell every approved rider in the zone.
      if new.status = 'preparing' and new.ready_at is not null and new.rider_id is null
         and (old.ready_at is null or old.rider_id is not null) then
        insert into public.notifications (user_id, kind, title, body, link)
        select p.id, 'pickup', 'Order ready for pickup',
               v_name || ': Rs. ' || new.total_pkr || ' cash to collect.', '/rider'
        from public.profiles p
        join public.rider_profiles rp on rp.user_id = p.id
        where p.role = 'rider' and rp.status = 'approved' and v_zone is not null and p.zone_id = v_zone;
      end if;

      if new.rider_id is not null and old.rider_id is null then
        select coalesce(p.full_name, 'Your rider') into v_rider from public.profiles p where p.id = new.rider_id;
        if new.customer_id is not null then
          insert into public.notifications (user_id, kind, title, body, link)
          values (new.customer_id, 'on_the_way', 'Your order is on the way',
                  coalesce(v_rider, 'Your rider') || ' picked up your order from ' || v_name ||
                  ' and may call you to confirm your address.', '/orders/' || new.id);
        end if;
        if v_owner is not null then
          insert into public.notifications (user_id, kind, title, body, link)
          values (v_owner, 'picked_up', 'Order #' || v_short || ' picked up',
                  coalesce(v_rider, 'A rider') || ' has it.', '/dashboard');
        end if;
      end if;

      if new.status = 'delivered' and old.status <> 'delivered' and new.customer_id is not null then
        insert into public.notifications (user_id, kind, title, body, link)
        values (new.customer_id, 'delivered', 'Delivered. Enjoy!',
                'How was your order from ' || v_name || '? You can leave a review.', '/orders/' || new.id);
      end if;
    end if;
  exception when others then
    null;
  end;
  return null;
end;
$$;
create trigger orders_notify_trg after insert or update on public.orders
  for each row execute function public.orders_notify();

-- 5. Who may call what.
revoke execute on function public.orders_notify() from public, anon, authenticated;
revoke execute on function public.submit_rider_application(text, text, text, date, text, text, text, text, text, text, text, text, text, text) from public, anon;
revoke execute on function public.rider_my_application() from public, anon;
revoke execute on function public.admin_rider_applications() from public, anon;
revoke execute on function public.admin_rider_kyc(uuid) from public, anon;
revoke execute on function public.admin_review_rider(uuid, text, uuid, integer, integer, text) from public, anon;
revoke execute on function public.rider_my_orders() from public, anon;
revoke execute on function public.rider_confirm_call(uuid) from public, anon;
revoke execute on function public.admin_order_call(uuid) from public, anon;
revoke execute on function public.my_unread_notifications() from public, anon;
revoke execute on function public.mark_notifications_read() from public, anon;
grant execute on function public.submit_rider_application(text, text, text, date, text, text, text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.rider_my_application() to authenticated;
grant execute on function public.admin_rider_applications() to authenticated;
grant execute on function public.admin_rider_kyc(uuid) to authenticated;
grant execute on function public.admin_review_rider(uuid, text, uuid, integer, integer, text) to authenticated;
grant execute on function public.rider_my_orders() to authenticated;
grant execute on function public.rider_confirm_call(uuid) to authenticated;
grant execute on function public.admin_order_call(uuid) to authenticated;
grant execute on function public.my_unread_notifications() to authenticated;
grant execute on function public.mark_notifications_read() to authenticated;