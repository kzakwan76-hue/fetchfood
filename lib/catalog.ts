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

function toRestaurant(r: RestaurantRow): Restaurant {
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
  return ((data ?? []) as RestaurantRow[]).map(toRestaurant);
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
  return { ...toRestaurant(row), items: toItems(row.menu_items) };
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

  const rows = (data ?? []) as unknown as (RestaurantRow & { menu_items: MenuItemRow[] })[];
  return rows.map((row) => ({ ...toRestaurant(row), items: toItems(row.menu_items) }));
}