import Link from "next/link";
import { CartBar } from "../../components/cart-bar";
import { RestaurantList } from "../../components/restaurant-list";
import { getRestaurants, getZones } from "../../lib/catalog";

export default async function RestaurantsPage() {
  const [restaurants, zones] = await Promise.all([getRestaurants(), getZones()]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 pb-24">
      <div className="flex items-center justify-between text-sm font-semibold text-brand-600">
        <Link href="/">← FetchFood</Link>
        <span className="flex gap-4">
          <Link href="/cart">Cart</Link>
          <Link href="/orders">Orders</Link>
          <Link href="/account">Account</Link>
        </span>
      </div>
      <h1 className="mt-3 text-2xl font-bold text-neutral-900">Restaurants</h1>
      <RestaurantList restaurants={restaurants} zones={zones} />
      <CartBar />
    </main>
  );
}