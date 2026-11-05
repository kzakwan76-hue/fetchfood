"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../lib/supabase/server";

type State = { error?: string; ok?: string };

const UUID = /^[0-9a-f-]{36}$/i;

const MESSAGES: Record<string, string> = {
  not_admin: "Only admins can do this.",
  bad_fees: "Check the numbers: the near distance must be under the middle one, the middle under the maximum, and fees must not go down as distance grows.",
  bad_location: "Drop a pin inside Pakistan.",
  restaurant_not_found: "Restaurant not found.",
};

function explain(message: string): string {
  for (const [code, text] of Object.entries(MESSAGES)) if (message.includes(code)) return text;
  return "Something went wrong.";
}

const field = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

export async function updateFees(_prev: State, formData: FormData): Promise<State> {
  const nums = ["nearKm", "nearFee", "midKm", "midFee", "farFee", "maxKm"].map((n) => Number(field(formData, n)));
  if (nums.some((n) => !Number.isFinite(n))) return { error: MESSAGES.bad_fees };
  if (![nums[1], nums[3], nums[4]].every(Number.isInteger)) return { error: "Fees must be whole rupees." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_fees", {
    p_near_km: nums[0],
    p_near_pkr: nums[1],
    p_mid_km: nums[2],
    p_mid_pkr: nums[3],
    p_far_pkr: nums[4],
    p_max_km: nums[5],
  });
  if (error) return { error: explain(error.message) };
  revalidatePath("/admin/delivery");
  return { ok: "Saved. It applies to new orders." };
}

export async function setRestaurantLocation(_prev: State, formData: FormData): Promise<State> {
  const restaurantId = field(formData, "restaurantId");
  if (!UUID.test(restaurantId)) return { error: "Invalid request." };
  const rawLat = field(formData, "lat");
  const rawLng = field(formData, "lng");
  const clear = rawLat === "" && rawLng === "";
  const lat = Number(rawLat);
  const lng = Number(rawLng);
  if (!clear && (!Number.isFinite(lat) || !Number.isFinite(lng))) return { error: MESSAGES.bad_location };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_restaurant_location", {
    p_restaurant: restaurantId,
    p_lat: clear ? null : lat,
    p_lng: clear ? null : lng,
  });
  if (error) return { error: explain(error.message) };
  revalidatePath("/admin/delivery");
  revalidatePath(`/admin/restaurants/${restaurantId}`);
  return { ok: clear ? "Location removed: this restaurant uses its flat fee again." : "Location saved." };
}