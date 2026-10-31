import Link from "next/link";
import { connection } from "next/server";
import { createClient } from "../lib/supabase/server";
import { FavoriteButton } from "./favorite-button";

// Reads the logged-in user, so it must sit inside <Suspense>.
export async function FavoriteSlot({ restaurantId }: { restaurantId: string }) {
  await connection();
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    return (
      <Link
        href="/login"
        aria-label="Log in to save favourites"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand-200 bg-white text-xl text-charcoal-700 shadow-sm"
      >
        <span aria-hidden="true">♡</span>
      </Link>
    );
  }
  const { data } = await supabase
    .from("favorites")
    .select("restaurant_id")
    .eq("restaurant_id", restaurantId)
    .maybeSingle(); // RLS: only your own rows
  return <FavoriteButton restaurantId={restaurantId} initial={Boolean(data)} />;
}