import Link from "next/link";
import { MokaMascot } from "../components/moka-mascot";
import { ZonePicker } from "../components/zone-picker";
import { getZones } from "../lib/catalog";

const STEPS = [
  { emoji: "📍", title: "Pick your area", text: "Tell us which Lahore neighbourhood you're in. You only see kitchens that deliver there." },
  { emoji: "🍛", title: "Order or ask Moka", text: "Browse menus yourself, or let Moka suggest real dishes that are open right now." },
  { emoji: "💵", title: "Pay on arrival", text: "Cash on delivery. The total is calculated by our server, so there are no surprises." },
];

export default async function HomePage() {
  const zones = await getZones().catch(() => []);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-6">
      <header className="flex items-center justify-between">
        <span className="text-2xl font-extrabold tracking-tight text-brand-600">
          Fetch<span className="text-charcoal-900">Food</span>
        </span>
        <nav className="flex gap-4 text-sm font-semibold text-brand-700">
          <Link href="/restaurants">Restaurants</Link>
          <Link href="/account">Account</Link>
        </nav>
      </header>

      <main className="flex-1">
        <section className="grid items-center gap-6 py-10 sm:grid-cols-[1fr_auto]">
          <div className="rise">
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Hungry, but your area is <span className="text-brand-600">“not serviceable”</span>?
            </h1>
            <p className="mt-4 text-lg text-charcoal-700">
              FetchFood delivers from local restaurants to Lahore neighbourhoods the big apps skip.
            </p>
          </div>
          <div className="mx-auto sm:mx-0">
            <MokaMascot variant="full" size={190} />
          </div>
        </section>

        <section className="rounded-3xl border border-brand-200 bg-white p-5 shadow-card">
          <ZonePicker zones={zones} />
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/restaurants"
              className="rounded-xl bg-brand-600 px-5 py-2.5 font-bold text-white hover:bg-brand-700"
            >
              See restaurants
            </Link>
            <Link
              href="/assistant"
              className="rounded-xl border border-brand-200 bg-white px-5 py-2.5 font-bold text-charcoal-900 hover:bg-brand-100"
            >
              Ask Moka
            </Link>
          </div>
        </section>

        <section aria-labelledby="how-heading" className="mt-12">
          <h2 id="how-heading" className="text-2xl font-extrabold tracking-tight">
            How it works
          </h2>
          <ol className="mt-4 grid gap-4 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-3xl border border-brand-200 bg-white p-4 shadow-card">
                <span aria-hidden="true" className="text-3xl">
                  {s.emoji}
                </span>
                <p className="mt-2 font-bold text-charcoal-900">
                  {i + 1}. {s.title}
                </p>
                <p className="mt-1 text-sm text-charcoal-700">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="moka-heading" className="mt-12 rounded-3xl bg-charcoal-900 p-6 text-white">
          <h2 id="moka-heading" className="text-2xl font-extrabold tracking-tight">
            Meet Moka
          </h2>
          <p className="mt-2 text-white/80">
            Can&apos;t decide? Moka only suggests real dishes from restaurants that are open and deliver to your
            area, with prices straight from the menu. Moka can&apos;t confirm ingredients, allergies or halal
            status, so please ask the restaurant about those.
          </p>
          <Link
            href="/assistant"
            className="mt-4 inline-block rounded-xl bg-brand-500 px-5 py-2.5 font-bold text-charcoal-900 hover:bg-brand-400"
          >
            Ask Moka what to eat
          </Link>
        </section>

        <section aria-labelledby="join-heading" className="mt-12">
          <h2 id="join-heading" className="text-2xl font-extrabold tracking-tight">
            Run a restaurant or want to ride?
          </h2>
          <p className="mt-2 text-charcoal-700">
            Create an account first. For now we set restaurant and rider roles by hand, so reach out to us after
            signing up.
          </p>
          <Link href="/signup" className="mt-3 inline-block font-bold text-brand-700 underline">
            Create an account
          </Link>
        </section>
      </main>

      <footer className="mt-12 border-t border-brand-200 pt-4 text-sm text-charcoal-700">
        © FetchFood · Lahore · Cash on delivery
      </footer>
    </div>
  );
}