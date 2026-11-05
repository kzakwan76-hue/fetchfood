"use server";

import { createClient } from "../../lib/supabase/server";

export type Quote = {
  status: "flat" | "no_pin" | "too_far" | "ok";
  km: number | null;
  fee: number | null;
  max: number | null;
};

// Asks the database what delivery would cost. The real fee is always recomputed inside place_order.
export async function quoteDelivery(restaurantId: string, lat: number | null, lng: number | null): Promise<Quote | null> {
  if (!/^[0-9a-f-]{36}$/i.test(restaurantId)) return null;
  const pin = typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("delivery_quote", {
    p_restaurant: restaurantId,
    p_lat: pin ? lat : null,
    p_lng: pin ? lng : null,
  });
  if (error) return null;
  const row = ((data ?? []) as { q_status: string; q_km: number | string | null; q_fee: number | null; q_max: number | string | null }[])[0];
  if (!row) return null;
  return {
    status: row.q_status as Quote["status"],
    km: row.q_km === null ? null : Number(row.q_km),
    fee: row.q_fee,
    max: row.q_max === null ? null : Number(row.q_max),
  };
}