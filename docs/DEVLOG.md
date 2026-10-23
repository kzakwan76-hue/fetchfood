# FetchFood dev log

## Milestone 1: foundation
**Built:** Next.js + TypeScript + Tailwind project; orange/charcoal theme with system fonts; honest landing page; PKR and Pakistani phone helpers with a test; .env.example.

**Decisions**
- Money is whole rupees (integers) everywhere, so there are no decimal rounding bugs.
- System fonts only: no font downloads, better on slow connections.
- The landing page says the AI assistant is not built yet instead of faking it.
- Secrets live in .env.local (never committed); .env.example is the committed template.

**Results:** helper test passed; lint and build: (write what you saw)

**Limitations**
- No database, accounts, or ordering yet.
- Phone check covers mobile numbers only (03XX), not landlines.

## Milestone 2: customer UI with sample data
- Added lib\sample-data.ts, app\restaurants\page.tsx, app\restaurants\[slug]\page.tsx, scripts\test-data.mjs
- test-data.mjs: [sample-data.ts: all checks passed]
- lint: [> fetchfood@0.1.0 lint > eslint]
- build: [ prerendered as static content]
- Browser: [sample resturants lists]

## Milestone 3a: Supabase + profiles + roles + RLS
- Created Supabase project, installed @supabase/supabase-js and @supabase/ssr
- Added supabase\migrations\0001_profiles_roles.sql (ran in SQL Editor: [success no tables returned])
- Added scripts\test-supabase.mjs: [it doesnt print your key]
- git check-ignore .env.local: [.env.local]
- lint: [> fetchfood@0.1.0 lint > eslint] | build: [> fetchfood@0.1.0 build > next build]
- Dashboard: profiles table with RLS [seen]

## Milestone 3b: auth (sign up, log in, log out, account)
- Added lib\supabase\server.ts, lib\supabase\proxy.ts, proxy.ts, lib\auth-validation.ts, app\auth\actions.ts, components\auth-form.tsx, app\login, app\signup, app\account, scripts\test-auth.mjs
- Dashboard: Confirm email turned OFF for development (turn ON again in M8)
- test-auth / test-data / test-pk: [perfect]
- lint: [> fetchfood@0.1.0 lint > eslint] | build: [> fetchfood@0.1.0 build
> next build

▲ Next.js 16.4.2 (Turbopack)
- Environments: .env.local
✓ Running next.config.ts took 221ms
- Cache Components enabled
- Partial Prefetching enabled
- Experiments (use with caution):
  ✓ agentFeedback

  Creating an optimized production build ...
✓ Compiled successfully in 5.4s
  Running TypeScript ...
  Finished TypeScript in 3.6s ...
  Collecting page data using 10 workers ...
✓ Collecting page data using 10 workers in 1423ms
  Generating static pages using 10 workers (0/13) ...
  Generating static pages using 10 workers (3/13)
  Generating static pages using 10 workers (6/13)
  Generating static pages using 10 workers (9/13)
✓ Generating static pages using 10 workers (13/13) in 1237ms
  Finalizing page optimization ...
✓ Finalizing page optimization in 37ms

Route (app)
┌ ○ /
├ ○ /_not-found
├ ◐ /account
├ ○ /login
├ ○ /restaurants
├   /restaurants/[slug]
│ ├ ◐ /restaurants/[slug]
│ ├ ○ /restaurants/karahi-house
│ ├ ○ /restaurants/burger-lab
│ └ ◐ [+2 more paths]
└ ○ /signup


ƒ Proxy (Middleware)

○  (Static)             prerendered as static content
◐  (Partial Prerender)  prerendered as static HTML with dynamic server-streamed content
]
- Browser steps 1-7: [sign up and login are working perfect after signing up you are directed to accounts page where you see your accounts details and you have delete account option too.]

## Milestone 4: catalog from DB, cart, COD checkout, server-side pricing
- Migration 0002 (restaurants, menu_items, orders, order_items, RLS, place_order(), seed): [SQL result, row counts]
- Files: lib\cart.ts, lib\cart-store.ts, lib\catalog.ts, components (add-to-cart, cart-bar, cart-view, clear-cart, checkout-form), app\cart, app\checkout, app\orders\[id], updated app\restaurants pages, scripts\test-cart.mjs, scripts\test-orders.mjs
- test-cart: [perfect] | test-orders: [perfect] | test-auth/test-pk: [perfect]
- lint: [perfect] | build: [same]
- Browser steps 1-9: [everything went as planned]

## Milestone 4 follow-ups
- /restaurants/[slug] showed a "uncached data" blocking-route overlay: moved params + data read into a component inside <Suspense> with a skeleton: [overlay gone? yes/no]
- npm run build: passes; static: / /cart /login /signup /restaurants; partial prerender: /account /checkout /orders/[id] /restaurants/[slug]
- Migration 0003: minimum order set to Rs. 150 for all restaurants: [Table Editor check]
- test-orders after change: [perfect]
- Browser checks (Cola alone blocked / Fries allowed / checkout and order page): [everything worked out as planned]

## Milestone 5: restaurant dashboard, order status, menu management, my orders
- Migration 0004 (owner policies, column grants, update_order_status(), menu constraints): [SQL result]
- Promoted test account to restaurant_owner and owner of karahi-house (manual SQL)
- New: lib\order-status.ts, app\orders\actions.ts + page.tsx, app\dashboard (page, actions, menu\page), 6 components, scripts\test-dashboard.mjs; rewrote app\orders\[id]\page.tsx (cancel + clear cart only when ?placed=1)
- test-dashboard: [perfect] | test-orders: [perfect] | test-cart: [perfect]
- lint: [same] | build: [> fetchfood@0.1.0 build
> next build

▲ Next.js 16.4.2 (Turbopack)
- Environments: .env.local
✓ Running next.config.ts took 205ms
- Cache Components enabled
- Partial Prefetching enabled
- Experiments (use with caution):
  ✓ agentFeedback

  Creating an optimized production build ...
✓ Compiled successfully in 1457ms
  Running TypeScript ...
  Finished TypeScript in 2.8s ...
  Collecting page data using 11 workers ...
✓ Collecting page data using 11 workers in 2.3s
  Generating static pages using 11 workers (0/19) ...
  Generating static pages using 11 workers (4/19)
  Generating static pages using 11 workers (9/19)
  Generating static pages using 11 workers (14/19)
✓ Generating static pages using 11 workers (19/19) in 2.1s
  Finalizing page optimization ...
✓ Finalizing page optimization in 59ms

Route (app)                          Revalidate  Expire
┌ ○ /
├ ○ /_not-found
├ ◐ /account
├ ○ /cart
├ ◐ /checkout
├ ◐ /dashboard
├ ◐ /dashboard/menu
├ ○ /login
├ ◐ /orders
├   /orders/[id]
│ └ ◐ /orders/[id]
├ ○ /restaurants                             1m      1h
├   /restaurants/[slug]
│ ├ ◐ /restaurants/[slug]
│ ├ ○ /restaurants/biryani-junction          1m      1h
│ ├ ○ /restaurants/burger-lab                1m      1h
│ └ ◐ [+2 more paths]
└ ○ /signup


ƒ Proxy (Middleware)

○  (Static)             prerendered as static content
◐  (Partial Prerender)  prerendered as static HTML with dynamic server-streamed content]
- Browser steps 1-8: [Everything went smoothly]

## Milestone 6a: assistant logic (no AI yet)
**Built:** lib\assistant\types.ts, recommend.ts (rule-based fallback), guard.ts (no invented dishes/prices); scripts\test-assistant.mjs.

**Decisions**
- The AI will see a numbered menu and answer with item numbers; the guard maps numbers back to real items, so the cards always come from our data.
- The guard drops unknown, closed and over-budget items, caps picks at 3, and rejects replies that state prices.
- The rule-based assistant is the fallback when the AI is down or has no key, and costs nothing.

**Results:** test-assistant: [all checks passed] | lint: [> fetchfood@0.1.0 lint > eslint] | build: [> fetchfood@0.1.0 build
> next build

▲ Next.js 16.4.2 (Turbopack)
- Environments: .env.local
✓ Running next.config.ts took 290ms
- Cache Components enabled
- Partial Prefetching enabled
- Experiments (use with caution):
  ✓ agentFeedback

  Creating an optimized production build ...
✓ Compiled successfully in 4.7s
  Running TypeScript ...
  Finished TypeScript in 5.0s ...
  Collecting page data using 11 workers ...
✓ Collecting page data using 11 workers in 3.9s
  Generating static pages using 11 workers (0/19) ...
  Generating static pages using 11 workers (4/19)
  Generating static pages using 11 workers (9/19)
  Generating static pages using 11 workers (14/19)
✓ Generating static pages using 11 workers (19/19) in 2.9s
  Finalizing page optimization ...
✓ Finalizing page optimization in 80ms

Route (app)                          Revalidate  Expire
┌ ○ /
├ ○ /_not-found
├ ◐ /account
├ ○ /cart
├ ◐ /checkout
├ ◐ /dashboard
├ ◐ /dashboard/menu
├ ○ /login
├ ◐ /orders
├   /orders/[id]
│ └ ◐ /orders/[id]
├ ○ /restaurants                             1m      1h
├   /restaurants/[slug]
│ ├ ◐ /restaurants/[slug]
│ ├ ○ /restaurants/biryani-junction          1m      1h
│ ├ ○ /restaurants/burger-lab                1m      1h
│ └ ◐ [+2 more paths]
└ ○ /signup


ƒ Proxy (Middleware)

○  (Static)             prerendered as static content
◐  (Partial Prerender)  prerendered as static HTML with dynamic server-streamed content

]

**Limitations**
- The guard cannot catch a dish name the AI writes in plain prose; the M6b prompt makes it use [[n]] markers instead.
- The rule-based matching is keyword-based: it won't understand "something comforting".
- No allergy data exists. The assistant must never claim a dish is allergy-safe.

## Milestone 6b: assistant brain (fake AI only)
**Built:** lib\assistant\convert.ts, conversation.ts, prompt.ts, answer.ts; recommend.ts now accepts a budget override; scripts\test-assistant-ai.mjs; tsx added as a dev dependency.

**Decisions**
- answerQuestion decides in order: nothing to recommend -> rules (no AI cost); no AI -> rules; AI error/bad format/rejected by guard -> rules; otherwise guarded AI answer.
- The AI is a function passed in (callModel), so tests use a fake and the real Anthropic call comes in M6c.
- Only open restaurants' dishes within budget go to the AI (max 40). Database ids are never sent.
- Browser input is untrusted, including "assistant" turns; angle brackets and [[ ]] are neutralised.

**Results:** test-assistant: [all checks passed] | test-assistant-ai: [all check passed] | lint: [> fetchfood@0.1.0 lint ] | build: [> fetchfood@0.1.0 build
> next build

▲ Next.js 16.4.2 (Turbopack)
- Environments: .env.local
✓ Running next.config.ts took 199ms
- Cache Components enabled
- Partial Prefetching enabled
- Experiments (use with caution):
  ✓ agentFeedback

  Creating an optimized production build ...
✓ Compiled successfully in 4.1s
  Running TypeScript ...
  Finished TypeScript in 3.4s ...
  Collecting page data using 11 workers ...
✓ Collecting page data using 11 workers in 3.3s
  Generating static pages using 11 workers (0/19) ...
  Generating static pages using 11 workers (4/19)
  Generating static pages using 11 workers (9/19)
  Generating static pages using 11 workers (14/19)
✓ Generating static pages using 11 workers (19/19) in 1695ms
  Finalizing page optimization ...
✓ Finalizing page optimization in 57ms

Route (app)                          Revalidate  Expire
┌ ○ /
├ ○ /_not-found
├ ◐ /account
├ ○ /cart
├ ◐ /checkout
├ ◐ /dashboard
├ ◐ /dashboard/menu
├ ○ /login
├ ◐ /orders
├   /orders/[id]
│ └ ◐ /orders/[id]
├ ○ /restaurants                             1m      1h
├   /restaurants/[slug]
│ ├ ◐ /restaurants/[slug]
│ ├ ○ /restaurants/biryani-junction          1m      1h
│ ├ ○ /restaurants/burger-lab                1m      1h
│ └ ◐ [+2 more paths]
└ ○ /signup


ƒ Proxy (Middleware)

○  (Static)             prerendered as static content
◐  (Partial Prerender)  prerendered as static HTML with dynamic server-streamed content] | 

**Limitations**
- Real AI call, rate limits and API route come in M6c; no UI yet.
- The catalog only knows if a restaurant is open, not whether a single dish is sold out.
- Candidate selection beyond 40 dishes is keyword-based.