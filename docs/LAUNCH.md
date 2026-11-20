# FetchFood launch checklist

## 1. Production Supabase project (separate from your dev project)
1. Create a new Supabase project. Never reuse the dev one for real customers.
2. In the SQL Editor run every file in supabase\migrations in order, 0001 to 0017, once each.
3. Migration 0002 seeds four SAMPLE restaurants. Before launch delete them:
   delete from public.restaurants where slug in ('karahi-house','burger-lab','biryani-junction','desi-dhaba');
   (This only works while no orders reference them, so do it before real traffic.)
4. Migration 0008 creates the zones Gulberg, DHA, Johar Town. Edit or add zones in /admin.
5. Sign up your own account on the live site, then make it admin once in the SQL Editor:
   update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'YOUR_EMAIL');
6. Authentication > Settings: set the minimum password length to 8 or more, and turn "Confirm email" ON.
7. Authentication > URL Configuration: Site URL = your live address; add it (and http://localhost:3000 for dev) to Redirect URLs.
8. Authentication > Email Templates > "Confirm signup": make the link
   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
9. Authentication > SMTP: add a real email provider. Supabase's built-in sender allows only a few emails per hour, which is not enough for launch.

## 2. Vercel
1. Import the GitHub repo. Framework: Next.js (automatic).
2. Environment variables (Project > Settings > Environment Variables), for Production:
   NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY from the PRODUCTION Supabase project.
   ASSISTANT_UNLOCK_ORDERS=0
   GEMINI_API_KEY (from Google AI Studio; if Vercel offers a "Sensitive" toggle, switch it on) and GEMINI_MODEL=gemini-3.1-flash-lite
   Do NOT add TEST_EMAIL or TEST_PASSWORD, and do not set OLLAMA_MODEL (Ollama cannot run on Vercel).
3. Pick the Vercel region closest to your Supabase region.
4. Deploy. Then add your custom domain and update the Supabase Site URL to it.

## 3. The assistant in production
- Moka runs on Gemini (gemini-3.1-flash-lite). The AI answers first and chooses the dishes; code checks every pick. The plain rules mode is only the fallback when the AI is missing, fails or hits its limit.
- To turn the AI on: create a key in Google AI Studio, then add GEMINI_API_KEY and GEMINI_MODEL in Vercel. Never paste keys into chat or commit them. Without the key the site still works in rules mode.
- The free tier allows about 500 requests a day, shared by all customers, and each chat message uses one. When it runs out, Moka falls back to rules until the limit resets. Check the live limits in AI Studio (Rate limits tab).
- On the free tier Google may use prompts to improve its models. Keep addresses and phone numbers out of what Moka sends, and mention it in /privacy.
- Do not link a billing account to the key unless you mean to pay. If you do, set a budget alert first.
- ASSISTANT_UNLOCK_ORDERS=0 lets every customer use the AI. Set it to 1 to restrict the AI to customers who already have a delivered order.
- The in-memory rate limiter is a best-effort guard on serverless, so the daily Gemini cap is the real limit.
- Halal, allergy and ingredient questions always get a fixed "ask the restaurant" answer, never an AI answer.

## 4. Smoke test after every deploy
Sign up (confirm the email), choose an area, order, accept as the restaurant, claim as a rider, deliver, review, and ask Moka.
Check that /admin shows "not found" for a normal customer.


## 5. Dispatch and cash (migration 0018)
1. Run migrations 0001 to 0018. 0018 tries to schedule a once-a-minute stuck-order check with pg_cron. In Supabase open Database > Extensions and check that pg_cron is enabled. If it is not, enable it and run this once in the SQL Editor: select cron.schedule('fetchfood-sweep', '* * * * *', 'select public.sweep_stuck_orders()');
2. At /admin/money tick "Only take orders in a zone while a rider is on duty there" and save. It is OFF by default.
3. Set the default rider cash limit, the unclaimed-order bonus and the cancel time (15 minutes or more). Raise a rider's personal cash limit only after a clean record.
4. Pay restaurants on a fixed schedule (weekly or twice a week) and tell them in the restaurant agreement. Riders hand in all cash daily.


## 6. Map pin (migration 0019)
1. Run migrations 0001 to 0019.
2. Map pictures come from OpenStreetMap's public tile server. Before launch read their current tile usage policy: it is for light use and requires the "© OpenStreetMap contributors" credit (already shown). If traffic grows, switch the tile URL in components\location-picker.tsx to a paid or free-tier tile provider.
3. Location access (the "use my current location" button) only works on HTTPS, which Vercel provides. It also works on localhost.
4. Leaflet's stylesheet is loaded from unpkg at runtime. If you want zero third-party requests, copy it into the project later.


## 7. Distance-based delivery fees (migration 0020)
1. Run migrations 0001 to 0020.
2. In /admin/delivery set the fee tiers and the maximum delivery distance, then open each restaurant (/admin/restaurants/<id>) and drop its pin on the map. A restaurant without a pin keeps its flat fee; with a pin, customers must drop a pin to order.
3. Distance is a straight line, a little shorter than the road. Choose the tiers with that in mind.


## 8. Restaurants with their own riders (migration 0021)
1. Run migrations 0001 to 0021.
2. At /admin/own-riders set the commission discount (default 4 points: 10% becomes 6%) and switch own riders on per restaurant. Orders already placed keep the way they were delivered.
3. Own-rider restaurants keep the cash and the whole delivery fee and owe us the lowered commission, netted against what we owe them. Record payments they make to us on /admin/own-riders. Put this in the restaurant agreement.


## 9. Wrap-up (migration 0022)
1. Run migrations 0001 to 0022.
2. Password reset: in Supabase, Authentication > Email Templates > "Reset password", set the link to {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery
3. Set NEXT_PUBLIC_SITE_URL in Vercel to your live address (used for link previews, robots and the sitemap).
4. Have a qualified person read /terms, /privacy, /rider-agreement and /restaurant-agreement before real orders. Contact details live in lib/site.ts.
5. The three founders should also write a short agreement between themselves (who owns what, how profit is split, who is responsible if money goes missing).