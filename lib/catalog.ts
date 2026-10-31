import { createClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";

export type Restaurant = {
  id: string;
  slug: string;
  name: string;
  cuisine: string;
  area: string;
  etaMinutes: number;
  deliveryFeePkr: number;
  minOrderPkr: number;
  isOpen: boolean;
  zoneId: string | null;
  ratingAvg: number | null;
  ratingCount: number;
};
export type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  pricePkr: number;
  category: string;
  tags: string[];
};
export type RestaurantWithMenu = Restaurant & { items: MenuItem[] };
export type Zone = { id: string; name: string };
export type Review = { rating: number; comment: string | null; createdAt: string };

type RestaurantRow = {
  id: string;
  slug: string;
  name: string;
  cuisine: string;
  area: string;
  eta_minutes: number;
  delivery_fee_pkr: number;
  min_order_pkr: number;
  is_open: boolean;
  zone_id: string | null;
};
type MenuItemRow = {
  id: string;
  name: string;
  description: string | null;
  price_pkr: number;
  category: string;
  tags: string[];
};
type Ratings = Map<string, { avg: number; count: number }>;

const COLUMNS =
  "id, slug, name, cuisine, area, eta_minutes, delivery_fee_pkr, min_order_pkr, is_open, zone_id";
const MENU_COLUMNS = "menu_items(id, name, description, price_pkr, category, tags)";

// Public catalog data needs no login, so this client has no cookies.
// That makes it safe to use inside "use cache".
function publicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

// Ratings are a bonus: if this fails, restaurants simply show as "New".
async function loadRatings(): Promise<Ratings> {
  const ratings: Ratings = new Map();
  const { data } = await publicClient().rpc("restaurant_rating_stats");
  for (const row of (data ?? []) as { s_restaurant_id: string; s_avg: number | string; s_count: number }[]) {
    ratings.set(row.s_restaurant_id, { avg: Number(row.s_avg), count: row.s_count });
  }
  return ratings;
}

function toRestaurant(r: RestaurantRow, ratings: Ratings): Restaurant {
  const rating = ratings.get(r.id);
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    cuisine: r.cuisine,
    area: r.area,
    etaMinutes: r.eta_minutes,
    deliveryFeePkr: r.delivery_fee_pkr,
    minOrderPkr: r.min_order_pkr,
    isOpen: r.is_open,
    zoneId: r.zone_id,
    ratingAvg: rating ? rating.avg : null,
    ratingCount: rating ? rating.count : 0,
  };
}

function toItems(rows: MenuItemRow[]): MenuItem[] {
  return rows
    .map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      pricePkr: m.price_pkr,
      category: m.category,
      tags: m.tags,
    }))
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

export async function getZones(): Promise<Zone[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");

  const { data, error } = await publicClient().from("zones").select("id, name").order("name");
  if (error) throw new Error("Could not load areas");
  return (data ?? []) as Zone[];
}

export async function getRestaurants(): Promise<Restaurant[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");

  const { data, error } = await publicClient().from("restaurants").select(COLUMNS).order("name");
  if (error) throw new Error("Could not load restaurants");
  const ratings = await loadRatings();
  return ((data ?? []) as RestaurantRow[]).map((r) => toRestaurant(r, ratings));
}

export async function getRestaurantWithMenu(slug: string): Promise<RestaurantWithMenu | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");

  const { data, error } = await publicClient()
    .from("restaurants")
    .select(`${COLUMNS}, ${MENU_COLUMNS}`)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error("Could not load menu");
  if (!data) return null;

  const row = data as unknown as RestaurantRow & { menu_items: MenuItemRow[] };
  const ratings = await loadRatings();
  return { ...toRestaurant(row, ratings), items: toItems(row.menu_items) };
}

export async function getAllRestaurantsWithMenus(): Promise<RestaurantWithMenu[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");

  const { data, error } = await publicClient()
    .from("restaurants")
    .select(`${COLUMNS}, ${MENU_COLUMNS}`)
    .order("name");
  if (error) throw new Error("Could not load menus");

  const ratings = await loadRatings();
  const rows = (data ?? []) as unknown as (RestaurantRow & { menu_items: MenuItemRow[] })[];
  return rows.map((row) => ({ ...toRestaurant(row, ratings), items: toItems(row.menu_items) }));
}

// Latest written reviews for a restaurant page. No names are ever stored with them.
export async function getRecentReviews(restaurantId: string): Promise<Review[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");

  const { data } = await publicClient()
    .from("reviews")
    .select("rating, comment, created_at")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(8);
  return ((data ?? []) as { rating: number; comment: string | null; created_at: string }[]).map((r) => ({
    rating: r.rating,
    comment: r.comment,
    createdAt: r.created_at,
  }));
}