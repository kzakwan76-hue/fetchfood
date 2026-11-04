import { createClient } from "../lib/supabase/server";

type Loc = { l_lat: number; l_lng: number };

// Server component: the pin is only returned for the rider's own order, after the handover.
export async function RiderNavigate({ orderId }: { orderId: string }) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("rider_order_location", { p_order_id: orderId });
  const loc = ((data ?? []) as Loc[])[0];

  if (!loc) {
    return (
      <p className="mt-2 text-sm text-neutral-600">
        The customer did not drop a map pin. Use the address above and call them.
      </p>
    );
  }
  const url = `https://www.google.com/maps/dir/?api=1&destination=${Number(loc.l_lat)},${Number(loc.l_lng)}&travelmode=driving`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 inline-block rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
    >
      🧭 Navigate to the customer
    </a>
  );
}