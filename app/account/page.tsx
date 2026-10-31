import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Skeleton } from "../../components/skeleton";
import { createClient } from "../../lib/supabase/server";
import { signOut } from "../auth/actions";

type Tile = { href: string; label: string; hint: string; emoji: string };

// Links are UI hints only. Each page and each database function checks the role again.
function tilesFor(role: string | null | undefined): Tile[] {
  const tiles: Tile[] = [
    { href: "/orders", label: "My orders", hint: "Track and review", emoji: "📦" },
    { href: "/feedback", label: "Send feedback", hint: "Ideas and problems", emoji: "💬" },
    { href: "/favourites", label: "Favourites", hint: "Restaurants you saved", emoji: "❤️" },
    { href: "/addresses", label: "Saved addresses", hint: "Faster checkout", emoji: "🏡" },
  ];
  if (role === "restaurant_owner" || role === "admin") {
    tiles.push({ href: "/dashboard", label: "Restaurant dashboard", hint: "Incoming orders", emoji: "🧑‍🍳" });
    tiles.push({ href: "/dashboard/menu", label: "Menu and photos", hint: "Dishes, prices, pictures", emoji: "📸" });
  }
  if (role === "rider") tiles.push({ href: "/rider", label: "Rider deliveries", hint: "Pick up and deliver", emoji: "🛵" });
  if (role === "admin") {
    tiles.push({ href: "/admin", label: "Admin", hint: "Zones, roles, restaurants", emoji: "🛠️" });
    tiles.push({ href: "/admin/feedback", label: "Feedback inbox", hint: "What customers say", emoji: "📥" });
  }
  return tiles;
}

export default function AccountPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-4">
      <Link href="/restaurants" className="text-sm font-semibold text-brand-700">
        ← Restaurants
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-charcoal-900">Your account</h1>
      {/* The part that reads cookies must sit inside Suspense (cacheComponents). */}
      <Suspense fallback={<Skeleton className="mt-6 h-64 w-full" />}>
        <AccountDetails />
      </Suspense>
    </main>
  );
}

async function AccountDetails() {
  await connection(); // must be awaited, and must come BEFORE any Supabase call
  const supabase = await createClient();

  // getClaims() verifies the token. Never use getSession() for this check.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/login");

  // RLS means this can only ever return the logged-in user's own row.
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, role")
    .eq("id", claims.sub)
    .single();

  return (
    <div className="mt-5 space-y-5">
      <dl className="divide-y divide-brand-100 overflow-hidden rounded-3xl border border-brand-200 bg-white shadow-card">
        <Row label="Name" value={profile?.full_name} />
        <Row label="Phone" value={profile?.phone} />
        <Row label="Email" value={claims.email} />
        <Row label="Role" value={profile?.role} />
      </dl>

      <ul className="grid grid-cols-2 gap-3">
        {tilesFor(profile?.role).map((t) => (
          <li key={t.href}>
            <Link
              href={t.href}
              className="block h-full rounded-3xl border border-brand-200 bg-white p-4 shadow-card motion-safe:transition hover:shadow-lift"
            >
              <span aria-hidden="true" className="text-2xl">
                {t.emoji}
              </span>
              <p className="mt-1 font-bold text-charcoal-900">{t.label}</p>
              <p className="text-xs text-charcoal-700">{t.hint}</p>
            </Link>
          </li>
        ))}
      </ul>

      {!profile && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          Profile row not found. The sign-up trigger from M3a may not have run.
        </p>
      )}
      <form action={signOut}>
        <button
          type="submit"
          className="rounded-xl border border-brand-200 bg-white px-4 py-2.5 font-semibold text-charcoal-900 hover:bg-brand-100"
        >
          Log out
        </button>
      </form>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-3 p-4">
      <dt className="text-sm text-charcoal-700">{label}</dt>
      <dd className="font-medium text-charcoal-900">{value ?? "—"}</dd>
    </div>
  );
}