import { CartBar } from "../../components/cart-bar";
import { RestaurantList } from "../../components/restaurant-list";
import { getRestaurants, getZones } from "../../lib/catalog";

export default async function RestaurantsPage() {
  const [restaurants, zones] = await Promise.all([getRestaurants(), getZones()]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-4 pb-28">
      <h1 className="text-3xl font-extrabold tracking-tight text-charcoal-900">What are we eating?</h1>
      <p className="mt-1 text-charcoal-700">Real kitchens near you, delivered to your door.</p>
      <RestaurantList restaurants={restaurants} zones={zones} />
      <CartBar />
    </main>
  );
}