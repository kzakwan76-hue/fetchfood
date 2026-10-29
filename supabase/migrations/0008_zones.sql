create table public.zones (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null unique check (char_length(name) between 1 and 60),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.zones enable row level security;
revoke all on public.zones from anon, authenticated;
grant select on public.zones to anon, authenticated;
create policy "public reads active zones" on public.zones
  for select to anon, authenticated using (is_active);
create policy "admin reads all zones" on public.zones
  for select to authenticated using (public.is_admin());

alter table public.restaurants
  add column zone_id uuid references public.zones (id) on delete restrict;
alter table public.profiles
  add column zone_id uuid references public.zones (id) on delete set null;

insert into public.zones (slug, name)
values ('gulberg', 'Gulberg'), ('dha', 'DHA'), ('johar-town', 'Johar Town');
update public.restaurants
  set zone_id = (select id from public.zones where slug = 'gulberg')
  where zone_id is null;

create function public.admin_create_zone(p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_slug text;
  v_id uuid;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if char_length(trim(coalesce(p_name, ''))) not between 1 and 60 then raise exception 'bad_zone'; end if;
  v_slug := trim(both '-' from regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g'));
  if v_slug = '' or char_length(v_slug) > 40 then raise exception 'bad_zone'; end if;
  begin
    insert into public.zones (slug, name) values (v_slug, trim(p_name)) returning id into v_id;
  exception when unique_violation then
    raise exception 'zone_taken';
  end;
  return v_id;
end;
$$;

create function public.admin_set_restaurant_zone(p_restaurant_id uuid, p_zone_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if not exists (select 1 from public.zones where id = p_zone_id and is_active) then
    raise exception 'zone_not_found';
  end if;
  update public.restaurants set zone_id = p_zone_id where id = p_restaurant_id;
  if not found then raise exception 'restaurant_not_found'; end if;
end;
$$;

create function public.admin_set_rider_zone(p_email text, p_zone_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_target uuid;
  v_role public.user_role;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if not exists (select 1 from public.zones where id = p_zone_id and is_active) then
    raise exception 'zone_not_found';
  end if;
  select id into v_target from auth.users where lower(email) = lower(trim(p_email));
  if v_target is null then raise exception 'user_not_found'; end if;
  select role into v_role from public.profiles where id = v_target;
  if v_role is distinct from 'rider' then raise exception 'not_a_rider'; end if;
  update public.profiles set zone_id = p_zone_id where id = v_target;
end;
$$;

-- Riders now only see (and can only claim) orders from restaurants in their own zone.
create or replace function public.rider_available_orders()
returns table (o_id uuid, o_restaurant text, o_area text, o_total integer, o_created timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_rider() then raise exception 'not_rider'; end if;
  return query
    select o.id, r.name, r.area, o.total_pkr, o.created_at
    from public.orders o
    join public.restaurants r on r.id = o.restaurant_id
    where o.status = 'preparing' and o.rider_id is null
      and r.zone_id is not null
      and r.zone_id = (select p.zone_id from public.profiles p where p.id = (select auth.uid()))
    order by o.created_at
    limit 50;
end;
$$;

create or replace function public.rider_claim_order(p_order_id uuid)
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
  if not exists (
    select 1 from public.restaurants r
    join public.profiles p on p.id = v_user
    where r.id = v_order.restaurant_id and r.zone_id is not null and r.zone_id = p.zone_id
  ) then
    raise exception 'wrong_zone';
  end if;
  if (select count(*) from public.orders
      where rider_id = v_user and status = 'out_for_delivery') >= 3 then
    raise exception 'too_many';
  end if;
  update public.orders set rider_id = v_user, status = 'out_for_delivery' where id = p_order_id;
end;
$$;

revoke execute on function public.admin_create_zone(text) from public, anon;
revoke execute on function public.admin_set_restaurant_zone(uuid, uuid) from public, anon;
revoke execute on function public.admin_set_rider_zone(text, uuid) from public, anon;
grant execute on function public.admin_create_zone(text) to authenticated;
grant execute on function public.admin_set_restaurant_zone(uuid, uuid) to authenticated;
grant execute on function public.admin_set_rider_zone(text, uuid) to authenticated;