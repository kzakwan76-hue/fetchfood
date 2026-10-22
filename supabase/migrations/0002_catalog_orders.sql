create type public.order_status as enum
  ('placed', 'accepted', 'preparing', 'out_for_delivery', 'delivered', 'cancelled');

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  cuisine text not null,
  area text not null,
  eta_minutes integer not null check (eta_minutes > 0),
  delivery_fee_pkr integer not null check (delivery_fee_pkr >= 0),
  min_order_pkr integer not null check (min_order_pkr >= 0),
  is_open boolean not null default true,
  is_active boolean not null default true,
  owner_id uuid references auth.users (id) on delete set null, -- used from M5
  created_at timestamptz not null default now()
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null,
  description text,
  price_pkr integer not null check (price_pkr > 0),
  category text not null,
  tags text[] not null default '{}',
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);
create index menu_items_restaurant_id_idx on public.menu_items (restaurant_id);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users (id) on delete cascade, -- dev convenience; revisit in M8
  restaurant_id uuid not null references public.restaurants (id),
  status public.order_status not null default 'placed',
  payment_method text not null default 'cod' check (payment_method = 'cod'),
  subtotal_pkr integer not null check (subtotal_pkr > 0),
  delivery_fee_pkr integer not null check (delivery_fee_pkr >= 0),
  total_pkr integer not null,
  delivery_address text not null,
  phone text not null,
  note text,
  created_at timestamptz not null default now(),
  check (total_pkr = subtotal_pkr + delivery_fee_pkr)
);
create index orders_customer_id_idx on public.orders (customer_id);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  menu_item_id uuid references public.menu_items (id) on delete set null,
  item_name text not null,          -- snapshot: stays correct if the menu changes later
  unit_price_pkr integer not null check (unit_price_pkr > 0),
  quantity integer not null check (quantity between 1 and 20)
);
create index order_items_order_id_idx on public.order_items (order_id);

alter table public.restaurants enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Table permissions: the catalog is read-only for everyone; orders are read-only for their owner.
-- Nobody gets insert/update/delete from the browser. Orders are created ONLY by place_order().
revoke all on public.restaurants, public.menu_items, public.orders, public.order_items
  from anon, authenticated;
grant select on public.restaurants, public.menu_items to anon, authenticated;
grant select on public.orders, public.order_items to authenticated;

create policy "public reads active restaurants" on public.restaurants
  for select to anon, authenticated using (is_active);

create policy "public reads available items" on public.menu_items
  for select to anon, authenticated
  using (
    is_available
    and exists (select 1 from public.restaurants r where r.id = restaurant_id and r.is_active)
  );

create policy "read own orders" on public.orders
  for select to authenticated using ((select auth.uid()) = customer_id);

create policy "read own order items" on public.order_items
  for select to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_items.order_id and o.customer_id = (select auth.uid())
  ));

-- The ONLY way to create an order. Prices come from menu_items, never from the caller.
create function public.place_order(
  p_restaurant_id uuid,
  p_items jsonb,            -- [{"menu_item_id": "...", "quantity": 2}, ...]
  p_address text,
  p_phone text,
  p_note text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_rest public.restaurants%rowtype;
  v_requested integer;
  v_found integer;
  v_badqty integer;
  v_subtotal integer;
  v_order uuid;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if length(trim(coalesce(p_address, ''))) < 10 then raise exception 'address_too_short'; end if;
  if length(trim(coalesce(p_phone, ''))) not between 10 and 20 then raise exception 'phone_invalid'; end if;
  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) not between 1 and 30 then
    raise exception 'bad_items';
  end if;

  select * into v_rest from public.restaurants
   where id = p_restaurant_id and is_active and is_open;
  if not found then raise exception 'restaurant_unavailable'; end if;

  with req as (
    select (e ->> 'menu_item_id')::uuid as menu_item_id,
           coalesce(sum((e ->> 'quantity')::int), 0) as qty
    from jsonb_array_elements(p_items) as e
    group by 1
  )
  select (select count(*) from req),
         count(*),
         coalesce(sum(m.price_pkr * req.qty), 0)::integer,
         count(*) filter (where req.qty < 1 or req.qty > 20)
    into v_requested, v_found, v_subtotal, v_badqty
    from req
    join public.menu_items m
      on m.id = req.menu_item_id
     and m.restaurant_id = p_restaurant_id
     and m.is_available;

  if v_found <> v_requested or v_badqty > 0 then raise exception 'invalid_items'; end if;
  if v_subtotal < v_rest.min_order_pkr then raise exception 'below_minimum'; end if;

  insert into public.orders
    (customer_id, restaurant_id, subtotal_pkr, delivery_fee_pkr, total_pkr,
     delivery_address, phone, note)
  values
    (v_user, p_restaurant_id, v_subtotal, v_rest.delivery_fee_pkr,
     v_subtotal + v_rest.delivery_fee_pkr,
     trim(p_address), trim(p_phone), nullif(trim(coalesce(p_note, '')), ''))
  returning id into v_order;

  insert into public.order_items (order_id, menu_item_id, item_name, unit_price_pkr, quantity)
  select v_order, m.id, m.name, m.price_pkr, req.qty::integer
  from (
    select (e ->> 'menu_item_id')::uuid as menu_item_id, sum((e ->> 'quantity')::int) as qty
    from jsonb_array_elements(p_items) as e
    group by 1
  ) req
  join public.menu_items m on m.id = req.menu_item_id;

  return v_order;
end;
$$;

revoke execute on function public.place_order(uuid, jsonb, text, text, text) from public, anon;
grant execute on function public.place_order(uuid, jsonb, text, text, text) to authenticated;

-- Seed data (same sample restaurants as M2). Run this file only once.
insert into public.restaurants (slug, name, cuisine, area, eta_minutes, delivery_fee_pkr, min_order_pkr, is_open)
values
  ('karahi-house', 'Karahi House', 'Pakistani', 'Sample Area A', 40, 150, 800, true),
  ('burger-lab', 'Burger Lab', 'Fast food', 'Sample Area B', 30, 120, 600, true),
  ('biryani-junction', 'Biryani Junction', 'Biryani', 'Sample Area A', 45, 150, 500, true),
  ('desi-dhaba', 'Desi Dhaba', 'Pakistani', 'Sample Area C', 50, 200, 1000, false);

insert into public.menu_items (restaurant_id, name, description, price_pkr, category, tags)
select r.id, v.name, v.description, v.price, v.category, v.tags
from (values
  ('karahi-house', 'Chicken Karahi (half)', 'Tomato, ginger and green chilli.', 1450, 'Mains', '{spicy}'::text[]),
  ('karahi-house', 'Daal Mash', 'Slow-cooked white lentils.', 450, 'Mains', '{vegetarian}'::text[]),
  ('karahi-house', 'Naan', 'Fresh from the tandoor.', 40, 'Sides', '{vegetarian}'::text[]),
  ('karahi-house', 'Sweet Lassi', 'Thick and chilled.', 220, 'Drinks', '{vegetarian}'::text[]),
  ('burger-lab', 'Zinger Burger', 'Crispy chicken, mayo, lettuce.', 550, 'Burgers', '{spicy}'::text[]),
  ('burger-lab', 'Beef Smash Burger', 'Double patty, cheese, pickles.', 750, 'Burgers', '{}'::text[]),
  ('burger-lab', 'Fries', 'Salted, regular size.', 250, 'Sides', '{vegetarian}'::text[]),
  ('burger-lab', 'Cola', '345 ml can.', 120, 'Drinks', '{vegetarian}'::text[]),
  ('biryani-junction', 'Chicken Biryani', 'Single plate with raita.', 450, 'Rice', '{spicy}'::text[]),
  ('biryani-junction', 'Beef Pulao', 'Mild, fragrant stock rice.', 500, 'Rice', '{}'::text[]),
  ('biryani-junction', 'Raita', 'Yoghurt with cucumber.', 80, 'Sides', '{vegetarian}'::text[]),
  ('biryani-junction', 'Zarda', 'Sweet rice dessert.', 200, 'Dessert', '{vegetarian}'::text[]),
  ('desi-dhaba', 'Chicken Handi', 'Creamy, mildly spiced.', 1300, 'Mains', '{}'::text[]),
  ('desi-dhaba', 'Paratha', 'Layered and buttery.', 100, 'Sides', '{vegetarian}'::text[])
) as v(slug, name, description, price, category, tags)
join public.restaurants r on r.slug = v.slug;