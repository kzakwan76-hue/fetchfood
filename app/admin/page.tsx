import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "../../lib/supabase/server";
import { RestaurantForm, RoleForm } from "../../components/admin-forms";

type UserRow = { u_id: string; u_email: string; u_name: string | null; u_role: string };
type RestaurantRow = {
  id: string;
  slug: string;
  name: string;
  area: string;
  is_open: boolean;
  is_active: boolean;
  owner_id: string | null;
};

export default function AdminPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/account" className="text-sm font-semibold text-brand-600">
        ← Account
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-neutral-900">Admin</h1>
      <Suspense fallback={<p className="mt-6 text-neutral-600">Loading…</p>}>
        <AdminContent />
      </Suspense>
    </main>
  );
}

async function AdminContent() {
  await connection();
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) redirect("/login");

  // UI hint only: the database functions check admin again on every write.
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", claimsData.claims.sub)
    .single();
  if (me?.role !== "admin") notFound();

  const { data: userData } = await supabase.rpc("admin_list_users");
  const users = (userData ?? []) as UserRow[];
  const { data: restaurantData } = await supabase
    .from("restaurants")
    .select("id, slug, name, area, is_open, is_active, owner_id")
    .order("name");
  const restaurants = (restaurantData ?? []) as RestaurantRow[];
  const emailById = new Map(users.map((u) => [u.u_id, u.u_email]));

  return (
    <div className="mt-4 space-y-8">
      <section className="rounded-2xl border border-neutral-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-neutral-900">Set a role</h2>
        <p className="mb-3 text-sm text-neutral-600">
          Admins can only be created in SQL, and can&apos;t be changed here.
        </p>
        <RoleForm />
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold text-neutral-900">Create a restaurant</h2>
        <RestaurantForm />
      </section>

      <section>
        <h2 className="text-lg font-semibold text-neutral-900">Restaurants ({restaurants.length})</h2>
        <ul className="mt-2 divide-y divide-neutral-200 rounded-2xl border border-neutral-200 bg-white">
          {restaurants.map((r) => (
            <li key={r.id} className="p-4 text-sm">
              <p className="font-semibold text-neutral-900">
                {r.name} <span className="font-normal text-neutral-600">/{r.slug}</span>
              </p>
              <p className="text-neutral-700">
                {r.area} · {r.is_open ? "open" : "closed"}
                {r.is_active ? "" : " · inactive"}
              </p>
              <p className="text-neutral-600">
                Owner: {r.owner_id ? (emailById.get(r.owner_id) ?? "unknown") : "none"}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-neutral-900">Accounts (latest 200)</h2>
        <ul className="mt-2 divide-y divide-neutral-200 rounded-2xl border border-neutral-200 bg-white">
          {users.map((u) => (
            <li key={u.u_id} className="flex items-center justify-between gap-3 p-4 text-sm">
              <span className="min-w-0 truncate">
                {u.u_email}
                {u.u_name ? ` · ${u.u_name}` : ""}
              </span>
              <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold">
                {u.u_role}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}