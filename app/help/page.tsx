import Link from "next/link";
import { SITE } from "../../lib/site";

export const metadata = { title: "Help and contact" };

const FAQ: [string, string][] = [
  ["How do I pay?", "Cash on delivery. You pay the rider the total shown at checkout."],
  ["Where is my order?", "Open My orders and tap the order. The progress timeline updates every 30 seconds. Your rider may call you to confirm your address."],
  ["Can I cancel?", "Yes, while the order is still new. After the restaurant accepts it, please call or WhatsApp us."],
  ["Something is missing or wrong.", "Contact us right away with your order number, and we will sort it out with the restaurant and the rider."],
  ["Why can't I order?", "Either the restaurant is closed, it does not deliver to your area, or no riders are on duty right now. Try again soon."],
  ["How do I delete my account?", "Account, then Edit profile, then Delete my account."],
  ["I want to ride with FetchFood.", "Create an account, then open the menu and choose Ride with us. Riders keep the whole delivery fee."],
  ["I own a restaurant.", "Contact us. We add your restaurant, menu and photos for free."],
];

export default function HelpPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-4 pb-24">
      <h1 className="text-3xl font-extrabold tracking-tight text-charcoal-900">Help and contact</h1>
      <div className="mt-4 rounded-3xl border border-brand-200 bg-white p-5 shadow-card">
        <p className="font-bold text-charcoal-900">Talk to a person</p>
        <p className="mt-1 text-sm text-charcoal-800">
          Email <a className="font-semibold text-brand-700 underline" href={`mailto:${SITE.email}`}>{SITE.email}</a>
        </p>
        <p className="text-sm text-charcoal-800">
          Call <a className="font-semibold text-brand-700 underline" href={`tel:${SITE.phoneDigits}`}>{SITE.phone}</a>
        </p>
        <a
          href={SITE.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700"
        >
          Message us on WhatsApp
        </a>
        <p className="mt-2 text-xs text-charcoal-700">Please include your order number if it is about an order.</p>
      </div>
      <h2 className="mt-6 text-lg font-bold text-charcoal-900">Common questions</h2>
      <ul className="mt-2 divide-y divide-brand-100 overflow-hidden rounded-3xl border border-brand-200 bg-white shadow-card">
        {FAQ.map(([q, a]) => (
          <li key={q} className="p-4 text-sm">
            <p className="font-semibold text-charcoal-900">{q}</p>
            <p className="mt-1 text-charcoal-800">{a}</p>
          </li>
        ))}
      </ul>
      <nav aria-label="Legal pages" className="mt-6 flex flex-wrap gap-4 text-sm font-semibold text-brand-700">
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/rider-agreement">Rider agreement</Link>
        <Link href="/restaurant-agreement">Restaurant agreement</Link>
      </nav>
    </main>
  );
}