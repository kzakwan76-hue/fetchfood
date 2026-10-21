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