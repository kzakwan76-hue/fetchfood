import Link from "next/link";
import { connection } from "next/server";
import { AdminPage, card } from "../../../components/admin-ui";
import { FeesForm } from "../../../components/delivery-forms";
import { requireAdmin } from "../../../lib/admin";

export const metadata = { title: "Delivery" };

type Fees = { f_near_km: number | string; f_near_pkr: number; f_mid_km: number | string; f_mid_pkr: number; f_far_pkr: number; f_max_km: number | string };
type Loc = { l_id: string; l_name: string; l_lat: number | null; l_lng: number | null };

export default function AdminDeliveryPage() {
  return (
    <AdminPage title="Delivery fees">
      <Delivery />
    </AdminPage>
  );
}

async function Delivery() {
  await connection();
  const supabase = await requireAdmin();
  const [{ data: f }, { data: l }] = await Promise.all([
    supabase.rpc("admin_get_fees"),
    supabase.rpc("admin_restaurant_locations"),
  ]);
  const fees = ((f ?? []) as Fees[])[0];
  const locations = (l ?? []) as Loc[];

  return (
    <div className="mt-4 space-y-6">
      {fees && (
        <section className={card}>
          <h2 className="font-bold text-charcoal-900">Fee by distance</h2>
          <p className="mb-2 text-neutral-600">
            Distance is a straight line from the restaurant to the customer&apos;s pin, so the road is a little longer. Only
            restaurants with a location below use these fees; the others keep their flat fee.
          </p>
          <FeesForm
            nearKm={Number(fees.f_near_km)} nearFee={fees.f_near_pkr}
            midKm={Number(fees.f_mid_km)} midFee={fees.f_mid_pkr}
            farFee={fees.f_far_pkr} maxKm={Number(fees.f_max_km)}
          />
        </section>
      )}
      <section>
        <h2 className="text-lg font-bold text-charcoal-900">Restaurant locations</h2>
        <p className="text-sm text-neutral-600">Set each restaurant&apos;s pin on its own page. Customers must drop a pin to order from a restaurant that has one.</p>
        <ul className="mt-2 space-y-2">
          {locations.map((r) => (
            <li key={r.l_id}>
              <Link href={`/admin/restaurants/${r.l_id}`} className={`${card} flex items-center justify-between gap-3 hover:border-brand-500`}>
                <span className="font-semibold text-charcoal-900">{r.l_name}</span>
                <span className={r.l_lat !== null ? "font-semibold text-green-800" : "text-neutral-600"}>
                  {r.l_lat !== null ? "📍 location set" : "flat fee (no location)"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}