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


## Milestone 6c-6d: AI route, Ollama provider, rate limiter, chat UI, Moka
**Built:** lib\assistant\ratelimit.ts, model.ts, ollama.ts; getAllRestaurantsWithMenus() in lib\catalog.ts; app\api\assistant\route.ts; app\assistant\page.tsx; components\assistant-chat.tsx; components\moka-mascot.tsx; scripts test-ratelimit, test-model, test-route, ask.mjs; "Ask the assistant" link on the home page; prompt cleanup.

**Decisions**
- One query loads every restaurant with its nested menu (no N+1), cached with the "catalog" tag.
- The model call is injected, so tests use fakes and the app needs no key. Provider order: Anthropic (if key and model are set), else local Ollama (if OLLAMA_MODEL is set), else rules.
- Rate limit: in-memory sliding window per IP plus a global daily counter. Over the limit, the route answers with rules instead of an error. It only counts when a model exists.
- The route enriches each pick with delivery fee and minimum order (display only, needed by addItem) and drops picks whose restaurant is missing.
- Moka: an original inline-SVG duckling. While the assistant is thinking it runs a 9s loop: eats the burger, puts on shades, sips a drink, repeats. Reduced-motion users get a static duck.
- The gorilla drafts were rejected and deleted.

**Results:**
- test-model: [model: all checks passed] | tsc: [clean] | lint: [clean]
- test-route against the dev server with Ollama: [source=ai picks=1, route: all checks passed]
- Rate limiter live trip (limit set to 2 per hour, three ask.mjs calls, "something spicy"): [call 1 source=ai, call 2 source=ai, call 3 source=rules with a normal 200 answer]
- Browser: [add to cart, Moka empty screen, shades and drink loop, View cart link: seen working in screenshots; Moka loading size reduced after review]

**Limitations**
- Answer quality with llama3.2 is weak. Cards are always real, open, in-budget dishes with correct prices (the guard enforces that), but reasons are sometimes wrong or irrelevant, dish names are sometimes doubled in the prose, and there is no real sarcasm.
- The guard cannot check that a reason is true.
- Not tested: real Anthropic, a sold-out dish through the nested menu query, the cart-switch confirm dialog and phone width (I have only reported "went great" overall).
- The rules fallback text says "My clever brain is offline" even when the cause is the rate limit, which is slightly misleading.
- Rate limiter is in memory: resets on restart, per server instance, and x-forwarded-for can be spoofed. It is a cost guard, not security.
- Ollama only runs on this PC, so a deployed site needs a hosted model or rules mode.


## Milestone 6e: code picks the dishes, AI writes one guarded sentence
**Built:** applyReplyGuard in lib\assistant\guard.ts; SASS_SYSTEM_PROMPT and buildSassPrompt in lib\assistant\prompt.ts; answer.ts rewritten; scripts\test-assistant-ai.mjs rewritten.

**Decisions**
- recommendByRules chooses the dishes (open, in budget). The AI only sees those dishes (no ids, no prices) and writes one short sentence, so cards and reasons are true by construction.
- The sentence guard rejects prices, big numbers, unknown [[n]] markers, allergy/halal/safety claims, and other dishes named in plain prose. Rejected or failed AI calls fall back to the rules text.
- The guard collapses doubled names, including a full name plus a shortened copy ("Chicken Karahi (half) Chicken Karahi").

**Results:** test-assistant-ai: [all checks passed] | test-assistant: [all checks passed] | tsc: [clean] | lint: [clean]
- Live with Ollama (llama3.2), "something spicy" and "cheesy under 800": cards were always real, open, in-budget dishes with plain "Matches: ..." reasons; no doubled names in the final runs. The Beef Smash Burger claims (double patty, pickles) match its menu description.

**Limitations**
- The guard checks rules, not truth: the AI can still describe a dish with its own words ("fiery kick").
- Sentence quality is generic and has little sarcasm with llama3.2; a bigger model or Anthropic is needed for personality.
- Keyword rules still find nothing for "surprise me" or "something comforting".
- test-route printed source=rules in two runs; cause not yet checked in the server log.
- Old selectCandidates, buildUserPrompt and SYSTEM_PROMPT are unused and can be deleted in a cleanup.


## Milestone 7a: admin page, roles, restaurant creation
**Built:** supabase\migrations\0005_admin.sql (admin_list_users, admin_set_role, admin_create_restaurant, "admin reads all restaurants" policy); app\admin (page, actions); components\admin-forms.tsx; scripts\test-admin.mjs.

**Decisions**
- Every admin write goes through a database function that checks is_admin() itself. The /admin page hides itself for non-admins, but that is only a UI hint.
- The app can only set roles customer, restaurant_owner or rider. Admins are made by hand in SQL and cannot be changed from the app.
- A role cannot be removed from someone who still owns a restaurant.
- New restaurants start closed with the platform minimum of Rs. 150; creating one promotes a customer owner to restaurant_owner. The owner must sign up first.
- No delete yet (cascade rules come in M8).

**Results:** test-admin: [admin: all checks passed] | tsc: [clean] | lint: [clean] | commit d2a9237 pushed
- Browser checklist 1-6: [all passed. Admin sees forms and lists, the TEST account gets "not found", role changes update the list, changing an admin account is refused, a created restaurant starts closed and promotes its owner, a duplicate slug is refused, and the new owner sees the restaurant on /dashboard.]

**Limitations**
- test-admin proves refusal only (anonymous and non-admin callers); the success paths were checked by hand in the browser, not by an automated test.
- Not built: changing a restaurant's owner, editing or hiding a restaurant, deleting one.


## Milestone 7b: riders claim and deliver orders
**Built:** supabase\migrations\0006_riders.sql (orders.rider_id, is_rider(), rider_available_orders, rider_my_orders, rider_claim_order, rider_release_order, rider_mark_delivered; update_order_status replaced); app\rider (page, actions); components\rider-button.tsx; components\order-actions.tsx (rider-aware); app\dashboard\page.tsx (reads rider_id); scripts\test-rider.mjs.

**Decisions**
- Riders pick up orders themselves from an "available" list. Every rider action is a database function that checks the rider role itself; riders have no direct table access.
- Before a claim, a rider sees only restaurant, area and cash to collect. The customer's address and phone appear only after the claim.
- Claiming locks the order row, so two riders cannot take the same order. A rider can hold at most 3 active deliveries and can release an order back to the pool.
- If no rider is assigned, the owner can still do "out for delivery" and "delivered" (own drivers). Once a rider has the order, update_order_status refuses those owner steps.

**Results:** test-rider, test-orders, test-dashboard, tsc, lint: [all passed and clean, as reported by me] | committed and pushed
- Browser, as customer/owner, rider and a non-rider: [checked the full flow (prepare, rider takes it, owner locked out, release, take again, delivered, non-rider gets "not found"); all went as expected, as reported by me]

**Limitations**
- test-rider proves refusal only; success paths were checked by hand.
- A claimed order whose rider disappears is stuck: only that rider can release it. An admin release is not built yet.
- No delivery zones: riders see every restaurant's ready orders.
- No links to /rider or /admin from the account page; no live updates (manual Refresh).