create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  customer_id uuid not null references auth.users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 500),
  created_at timestamptz not null default now()
);
create index reviews_restaurant_id_idx on public.reviews (restaurant_id, created_at desc);
alter table public.reviews enable row level security;
revoke all on public.reviews from anon, authenticated;
-- Public can read ratings and comments, but never who wrote them or which order they belong to.
grant select (id, restaurant_id, rating, comment, created_at) on public.reviews to anon, authenticated;
create policy "public reads reviews" on public.reviews
  for select to anon, authenticated using (true);

create function public.submit_review(p_order_id uuid, p_rating integer, p_comment text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_order public.orders%rowtype;
  v_comment text;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if p_rating is null or p_rating not between 1 and 5 then raise exception 'bad_rating'; end if;
  v_comment := nullif(trim(coalesce(p_comment, '')), '');
  if v_comment is not null and char_length(v_comment) > 500 then raise exception 'comment_too_long'; end if;

  select * into v_order from public.orders where id = p_order_id and customer_id = v_user;
  if not found then raise exception 'order_not_found'; end if;
  if v_order.status <> 'delivered' then raise exception 'not_delivered'; end if;
  if exists (select 1 from public.restaurants r
             where r.id = v_order.restaurant_id and r.owner_id = v_user) then
    raise exception 'own_restaurant';
  end if;

  begin
    insert into public.reviews (order_id, restaurant_id, customer_id, rating, comment)
    values (p_order_id, v_order.restaurant_id, v_user, p_rating, v_comment);
  exception when unique_violation then
    raise exception 'already_reviewed';
  end;
end;
$$;

create function public.my_order_review(p_order_id uuid)
returns table (r_rating integer, r_comment text)
language sql stable security definer set search_path = '' as $$
  select rv.rating::integer, rv.comment
  from public.reviews rv
  where rv.order_id = p_order_id and rv.customer_id = (select auth.uid());
$$;

create function public.restaurant_rating_stats()
returns table (s_restaurant_id uuid, s_avg numeric, s_count integer)
language sql stable security definer set search_path = '' as $$
  select restaurant_id, round(avg(rating)::numeric, 1), count(*)::integer
  from public.reviews group by restaurant_id;
$$;

-- Used by the assistant route to decide whether Moka's chatty mode is unlocked.
create function public.my_delivered_order_count()
returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.orders
  where customer_id = (select auth.uid()) and status = 'delivered';
$$;

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('suggestion', 'problem', 'praise')),
  message text not null check (char_length(message) between 5 and 1000),
  created_at timestamptz not null default now()
);
alter table public.feedback enable row level security;
revoke all on public.feedback from anon, authenticated; -- no policies: only the functions below can touch it

create function public.submit_feedback(p_kind text, p_message text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid());
  v_msg text := trim(coalesce(p_message, ''));
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if p_kind is null or p_kind not in ('suggestion', 'problem', 'praise') then raise exception 'bad_kind'; end if;
  if char_length(v_msg) not between 5 and 1000 then raise exception 'bad_message'; end if;
  if (select count(*) from public.feedback
      where user_id = v_user and created_at > now() - interval '1 day') >= 5 then
    raise exception 'too_many';
  end if;
  insert into public.feedback (user_id, kind, message) values (v_user, p_kind, v_msg);
end;
$$;

create function public.admin_list_feedback()
returns table (f_id uuid, f_kind text, f_message text, f_created timestamptz, f_email text)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query
    select f.id, f.kind, f.message, f.created_at, u.email::text
    from public.feedback f
    left join auth.users u on u.id = f.user_id
    order by f.created_at desc
    limit 100;
end;
$$;

revoke execute on function public.submit_review(uuid, integer, text) from public, anon;
revoke execute on function public.my_order_review(uuid) from public, anon;
revoke execute on function public.my_delivered_order_count() from public, anon;
revoke execute on function public.submit_feedback(text, text) from public, anon;
revoke execute on function public.admin_list_feedback() from public, anon;
grant execute on function public.submit_review(uuid, integer, text) to authenticated;
grant execute on function public.my_order_review(uuid) to authenticated;
grant execute on function public.my_delivered_order_count() to authenticated;
grant execute on function public.submit_feedback(text, text) to authenticated;
grant execute on function public.admin_list_feedback() to authenticated;
grant execute on function public.restaurant_rating_stats() to anon, authenticated;