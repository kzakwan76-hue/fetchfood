-- Admin can see every restaurant (including inactive) in the admin screen.
create policy "admin reads all restaurants" on public.restaurants
  for select to authenticated using (public.is_admin());

-- Users with their email (email lives in auth.users, not profiles).
create function public.admin_list_users()
returns table (u_id uuid, u_email text, u_name text, u_role public.user_role)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query
    select p.id, u.email::text, p.full_name, p.role
    from public.profiles p
    join auth.users u on u.id = p.id
    order by p.created_at desc
    limit 200;
end;
$$;

-- Set a role by email. Admins can only be made by hand in SQL.
create function public.admin_set_role(p_email text, p_role public.user_role)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_target uuid;
  v_current public.user_role;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_role not in ('customer', 'restaurant_owner', 'rider') then
    raise exception 'role_not_allowed';
  end if;

  select id into v_target from auth.users where lower(email) = lower(trim(p_email));
  if v_target is null then raise exception 'user_not_found'; end if;

  select role into v_current from public.profiles where id = v_target for update;
  if v_current is null then raise exception 'user_not_found'; end if;
  if v_current = 'admin' then raise exception 'cannot_change_admin'; end if;

  if p_role <> 'restaurant_owner'
     and exists (select 1 from public.restaurants where owner_id = v_target) then
    raise exception 'owns_restaurants';
  end if;

  update public.profiles set role = p_role where id = v_target;
end;
$$;

-- Create a restaurant for an existing account (the owner signs up first).
create function public.admin_create_restaurant(
  p_slug text, p_name text, p_cuisine text, p_area text,
  p_eta integer, p_fee integer, p_owner_email text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
  v_role public.user_role;
  v_id uuid;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;

  if p_slug is null or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
     or char_length(p_slug) not between 3 and 40 then raise exception 'bad_slug'; end if;
  if char_length(trim(coalesce(p_name, ''))) not between 1 and 80 then raise exception 'bad_name'; end if;
  if char_length(trim(coalesce(p_cuisine, ''))) not between 1 and 40 then raise exception 'bad_cuisine'; end if;
  if char_length(trim(coalesce(p_area, ''))) not between 1 and 60 then raise exception 'bad_area'; end if;
  if p_eta is null or p_eta not between 5 and 180 then raise exception 'bad_eta'; end if;
  if p_fee is null or p_fee not between 0 and 2000 then raise exception 'bad_fee'; end if;

  select id into v_owner from auth.users where lower(email) = lower(trim(p_owner_email));
  if v_owner is null then raise exception 'user_not_found'; end if;
  select role into v_role from public.profiles where id = v_owner for update;
  if v_role is null then raise exception 'user_not_found'; end if;
  if v_role in ('admin', 'rider') then raise exception 'owner_role_conflict'; end if;
  if v_role = 'customer' then
    update public.profiles set role = 'restaurant_owner' where id = v_owner;
  end if;

  begin
    insert into public.restaurants
      (slug, name, cuisine, area, eta_minutes, delivery_fee_pkr, min_order_pkr, is_open, owner_id)
    values
      (p_slug, trim(p_name), trim(p_cuisine), trim(p_area), p_eta, p_fee, 150, false, v_owner)
    returning id into v_id;
  exception when unique_violation then
    raise exception 'slug_taken';
  end;

  return v_id;
end;
$$;

revoke execute on function public.admin_list_users() from public, anon;
revoke execute on function public.admin_set_role(text, public.user_role) from public, anon;
revoke execute on function public.admin_create_restaurant(text, text, text, text, integer, integer, text) from public, anon;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_set_role(text, public.user_role) to authenticated;
grant execute on function public.admin_create_restaurant(text, text, text, text, integer, integer, text) to authenticated;