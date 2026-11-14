import Link from "next/link";
import { HomePicks } from "../components/home-picks";
import { MokaMascot } from "../components/moka-mascot";
import { getRestaurants, getZones } from "../lib/catalog";
import { CATEGORIES } from "../lib/cuisine";

export default async function HomePage() {
  const [zones, restaurants] = await Promise.all([
    getZones().catch(() => []),
    getRestaurants().catch(() => []),
  ]);
  const circle = "flex h-14 w-14 items-center justify-center rounded-full border text-2xl";

  return (
    <div className="mx-auto flex max-w-3xl flex-col px-4">
      <main className="flex-1 pb-6">
        <section aria-labelledby="mind-heading" className="mt-2">
          <h2 id="mind-heading" className="text-xl font-extrabold tracking-tight text-charcoal-900">
            What&apos;s on your mind?
          </h2>
          <ul className="no-scrollbar relative -mx-4 mt-3 flex gap-4 overflow-x-auto px-4 pb-1">
            <li>
              <Link href="/restaurants" className="flex w-16 flex-col items-center gap-1.5 text-xs font-semibold text-brand-700">
                <span aria-hidden="true" className={`${circle} border-brand-600 bg-brand-600 text-white`}>🍴</span>
                All
              </Link>
            </li>
            {CATEGORIES.map((c) => (
              <li key={c.key}>
                <Link
                  href={`/restaurants?cuisine=${c.key}`}
                  className="flex w-16 flex-col items-center gap-1.5 text-xs font-semibold text-charcoal-800"
                >
                  <span aria-hidden="true" className={`${circle} border-brand-200 bg-white shadow-sm`}>{c.emoji}</span>
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6 flex items-center gap-3 rounded-3xl bg-charcoal-900 p-4 text-white">
          <MokaMascot variant="head" size={56} className="shrink-0" />
          <div className="min-w-0">
            <p className="font-extrabold">Can&apos;t decide? Ask Moka.</p>
            <p className="mt-0.5 text-sm text-white/80">
              Moka only suggests real dishes from open kitchens in your area. Moka can&apos;t confirm
              ingredients, allergies or halal status, so please ask the restaurant.
            </p>
            <Link href="/assistant" className="mt-2 inline-block rounded-full bg-brand-500 px-4 py-1.5 text-sm font-bold text-charcoal-900 hover:bg-brand-400">
              Ask Moka what to eat
            </Link>
          </div>
        </section>

        <HomePicks restaurants={restaurants} zones={zones} />

        <section aria-labelledby="join-heading" className="mt-8 rounded-3xl bg-brand-600 p-5 text-white">
          <h2 id="join-heading" className="text-xl font-extrabold tracking-tight">Run a restaurant or want to ride?</h2>
          <p className="mt-2 text-sm text-white">
            Riders keep the whole delivery fee: apply with your CNIC and we verify every rider. Restaurants get a
            new sales channel at a low commission.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/signup?role=rider" className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-charcoal-900 hover:bg-brand-100">
              Ride with us
            </Link>
            <Link href="/signup?role=restaurant" className="rounded-xl border border-white/70 px-4 py-2 text-sm font-bold text-white hover:bg-white/10">
              List your restaurant
            </Link>
          </div>
        </section>
      </main>

      <footer className="mt-8 border-t border-brand-200 pt-4 text-sm text-charcoal-700">
        © FetchFood · Lahore · Cash on delivery ·{" "}
        <Link href="/help" className="underline">Help</Link> ·{" "}
        <Link href="/terms" className="underline">Terms</Link> ·{" "}
        <Link href="/privacy" className="underline">Privacy</Link>
      </footer>
    </div>
  );
}