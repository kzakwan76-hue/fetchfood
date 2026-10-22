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
  "id, slug, name, cuisine, area, eta_minutes, delivery_fee_pkr, min_order_pkr, is_open";

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
  };
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
    .select(`${COLUMNS}, menu_items(id, name, description, price_pkr, category, tags)`)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error("Could not load menu");
  if (!data) return null;

  const row = data as unknown as RestaurantRow & { menu_items: MenuItemRow[] };
  const items: MenuItem[] = row.menu_items
    .map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      pricePkr: m.price_pkr,
      category: m.category,
      tags: m.tags,
    }))
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  return { ...toRestaurant(row), items };
}