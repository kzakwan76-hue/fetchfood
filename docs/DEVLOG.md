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