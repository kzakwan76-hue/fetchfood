create table public.saved_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 30),
  address text not null check (char_length(address) between 10 and 300),
  created_at timestamptz not null default now()
);
create index saved_addresses_user_idx on public.saved_addresses (user_id, created_at desc);
alter table public.saved_addresses enable row level security;
revoke all on public.saved_addresses from anon, authenticated;
grant select, delete on public.saved_addresses to authenticated;
create policy "read own addresses" on public.saved_addresses
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "delete own addresses" on public.saved_addresses
  for delete to authenticated using ((select auth.uid()) = user_id);

create function public.save_address(p_label text, p_address text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_label text := left(trim(coalesce(p_label, '')), 30);
  v_address text := trim(coalesce(p_address, ''));
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if v_label = '' then v_label := 'Saved'; end if;
  if char_length(v_address) not between 10 and 300 then raise exception 'bad_address'; end if;
  -- Saving the same address twice is not an error, it just does nothing.
  if exists (select 1 from public.saved_addresses
             where user_id = v_user and lower(address) = lower(v_address)) then
    return;
  end if;
  if (select count(*) from public.saved_addresses where user_id = v_user) >= 5 then
    raise exception 'too_many';
  end if;
  insert into public.saved_addresses (user_id, label, address) values (v_user, v_label, v_address);
end;
$$;

create table public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, restaurant_id)
);
alter table public.favorites enable row level security;
revoke all on public.favorites from anon, authenticated;
grant select on public.favorites to authenticated;
create policy "read own favorites" on public.favorites
  for select to authenticated using ((select auth.uid()) = user_id);

-- Returns true when the restaurant is now a favourite, false when it was removed.
create function public.toggle_favorite(p_restaurant_id uuid)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from public.restaurants where id = p_restaurant_id and is_active) then
    raise exception 'restaurant_not_found';
  end if;
  if exists (select 1 from public.favorites where user_id = v_user and restaurant_id = p_restaurant_id) then
    delete from public.favorites where user_id = v_user and restaurant_id = p_restaurant_id;
    return false;
  end if;
  if (select count(*) from public.favorites where user_id = v_user) >= 50 then
    raise exception 'too_many';
  end if;
  insert into public.favorites (user_id, restaurant_id) values (v_user, p_restaurant_id);
  return true;
end;
$$;

revoke execute on function public.save_address(text, text) from public, anon;
revoke execute on function public.toggle_favorite(uuid) from public, anon;
grant execute on function public.save_address(text, text) to authenticated;
grant execute on function public.toggle_favorite(uuid) to authenticated;