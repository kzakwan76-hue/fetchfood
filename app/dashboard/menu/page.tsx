import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { AddMenuItemForm } from "../../../components/add-menu-item-form";
import { MenuItemEditor } from "../../../components/menu-item-editor";

type MenuRow = { id: string; name: string; price_pkr: number; category: string; is_available: boolean };
type RestaurantRow = { id: string; name: string; menu_items: MenuRow[] };

export default function MenuManagerPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/dashboard" className="text-sm font-semibold text-brand-600">
        ← Dashboard
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-neutral-900">Manage menu</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Changes apply to new orders. Orders already placed keep the price they were placed at.
      </p>
      <Suspense fallback={<p className="mt-6 text-neutral-600">Loading…</p>}>
        <MenuManager />
      </Suspense>
    </main>
  );
}

async function MenuManager() {
  await connection();
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) redirect("/login");

  const { data } = await supabase
    .from("restaurants")
    .select("id, name, menu_items(id, name, price_pkr, category, is_available)")
    .eq("owner_id", claimsData.claims.sub)
    .order("name");
  const restaurants = (data ?? []) as unknown as RestaurantRow[];

  if (restaurants.length === 0) {
    return <p className="mt-6 text-sm text-neutral-700">You don&apos;t own a restaurant yet.</p>;
  }

  return (
    <div className="mt-4 space-y-8">
      {restaurants.map((r) => (
        <section key={r.id}>
          <h2 className="text-lg font-semibold text-neutral-900">{r.name}</h2>
          <ul className="mt-2 divide-y divide-neutral-200 rounded-2xl border border-neutral-200 bg-white">
            {[...r.menu_items]
              .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
              .map((m) => (
                <MenuItemEditor
                  key={m.id}
                  item={{
                    id: m.id,
                    name: m.name,
                    category: m.category,
                    pricePkr: m.price_pkr,
                    isAvailable: m.is_available,
                  }}
                />
              ))}
          </ul>
          <AddMenuItemForm restaurantId={r.id} />
        </section>
      ))}
    </div>
  );
}