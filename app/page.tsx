 import Link from "next/link";
const roadmap = [
  { n: 1, title: "Foundation, branding, Pakistan helpers", done: true },
  { n: 2, title: "Customer UI with sample restaurants & menus", done: false },
  { n: 3, title: "Database & accounts", done: false },
  { n: 4, title: "Menus, cart & checkout (cash on delivery)", done: false },
  { n: 5, title: "Restaurant dashboard & orders", done: false },
  { n: 6, title: "AI food assistant", done: false },
  { n: 7, title: "Riders, delivery zones & admin", done: false },
  { n: 8, title: "Testing, security & deployment", done: false },
];

export default function HomePage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-6">
      <header className="flex items-center justify-between">
        <span className="text-2xl font-extrabold tracking-tight text-brand-600">
          Fetch<span className="text-charcoal-900">Food</span>
        </span>
        <span className="rounded-full bg-charcoal-900 px-3 py-1 text-xs font-semibold text-white">
          Milestone 1 build
        </span>
      </header>

      <main className="flex-1">
        <section className="py-12">
          <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
            Hungry, but your area is <span className="text-brand-600">“not serviceable”</span>?
          </h1>
          <p className="mt-4 text-lg text-charcoal-700">
            FetchFood is being built to deliver from local restaurants, cafés and
            home kitchens to neighbourhoods the big apps skip.
          </p>
        </section>

        <section
          aria-labelledby="assistant-heading"
          className="rounded-2xl border border-brand-200 bg-white p-5 shadow-sm"
        >
          <h2 id="assistant-heading" className="text-lg font-bold">
            The FetchFood food assistant
          </h2>
          <p className="mt-2 text-charcoal-700">
            Can&apos;t decide what to eat? A chatbot with a mild sarcastic streak
            will help you choose, using only real menus from restaurants that
            deliver to you.
          </p>
              <Link
                 href="/assistant"
                 className="mt-3 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
               >
                 Ask the assistant
               </Link>
        </section>

        <section aria-labelledby="roadmap-heading" className="mt-10">
          <h2 id="roadmap-heading" className="text-lg font-bold">
            Build progress
          </h2>
          <ol className="mt-3 space-y-2">
            {roadmap.map((m) => (
              <li
                key={m.n}
                className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm"
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                    m.done ? "bg-brand-500 text-white" : "bg-charcoal-900/10 text-charcoal-700"
                  }`}
                  aria-hidden="true"
                >
                  {m.done ? "✓" : m.n}
                </span>
                <span className="font-medium">{m.title}</span>
                <span className="sr-only">{m.done ? "(complete)" : "(not started)"}</span>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="mt-12 border-t border-brand-200 pt-4 text-sm text-charcoal-700">
        © FetchFood. Ordering is not live yet.
      </footer>
    </div>
  );
}