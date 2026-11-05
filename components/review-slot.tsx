import Link from "next/link";
import { connection } from "next/server";
import { createClient } from "../lib/supabase/server";
import { ReviewForm } from "./review-form";

const box = "mt-3 rounded-3xl border border-brand-200 bg-white p-4 text-sm text-charcoal-800 shadow-card";

// Reads the logged-in user, so it must sit inside <Suspense>.
export async function ReviewSlot({ restaurantId, restaurantName }: { restaurantId: string; restaurantName: string }) {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims) {
    return (
      <div className={box}>
        <Link href="/login" className="font-bold text-brand-700 underline">
          Log in
        </Link>{" "}
        and order from {restaurantName}. Once your order is delivered you can leave a review here.
      </div>
    );
  }

  const { data: owned } = await supabase
    .from("restaurants")
    .select("id")
    .eq("id", restaurantId)
    .eq("owner_id", claims.sub)
    .maybeSingle();
  if (owned) return <div className={box}>You own this restaurant, so you can&apos;t review it.</div>;

  // Reviews come only from delivered orders, one review per order: that keeps them honest.
  const { data: orders } = await supabase
    .from("orders")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("customer_id", claims.sub)
    .eq("status", "delivered")
    .order("created_at", { ascending: false })
    .limit(5);
  const list = (orders ?? []) as { id: string }[];

  if (list.length === 0) {
    return (
      <div className={box}>
        Order from {restaurantName} and, once it&apos;s delivered, you can leave a review here.
      </div>
    );
  }
  for (const order of list) {
    const { data: review } = await supabase.rpc("my_order_review", { p_order_id: order.id });
    if (((review ?? []) as unknown[]).length === 0) {
      return (
        <div className="mt-3">
          <ReviewForm orderId={order.id} />
        </div>
      );
    }
  }
  return <div className={box}>You&apos;ve reviewed your recent orders from here. Thank you!</div>;
}