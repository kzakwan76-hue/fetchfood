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
   ASSISTANT_UNLOCK_ORDERS=1
   Do NOT add TEST_EMAIL or TEST_PASSWORD, and do not set OLLAMA_MODEL (Ollama cannot run on Vercel).
3. Pick the Vercel region closest to your Supabase region.
4. Deploy. Then add your custom domain and update the Supabase Site URL to it.

## 3. The assistant in production
- With no ANTHROPIC_API_KEY the site runs Moka in rules mode, which is free and works.
- To turn the AI sentence on: create a key, SET A MONTHLY SPEND LIMIT in the Anthropic console first, confirm the exact model ID in their docs, then add ANTHROPIC_API_KEY and ANTHROPIC_MODEL in Vercel. Never paste keys into chat or commit them.
- Only customers with a delivered order reach the AI. The in-memory rate limiter is a best-effort guard on serverless, so the spend limit is the real safety net.

## 4. Smoke test after every deploy
Sign up (confirm the email), choose an area, order, accept as the restaurant, claim as a rider, deliver, review, and ask Moka.
Check that /admin shows "not found" for a normal customer.


## 5. Dispatch and cash (migration 0018)
1. Run migrations 0001 to 0018. 0018 tries to schedule a once-a-minute stuck-order check with pg_cron. In Supabase open Database > Extensions and check that pg_cron is enabled. If it is not, enable it and run this once in the SQL Editor: select cron.schedule('fetchfood-sweep', '* * * * *', 'select public.sweep_stuck_orders()');
2. At /admin/money tick "Only take orders in a zone while a rider is on duty there" and save. It is OFF by default.
3. Set the default rider cash limit, the unclaimed-order bonus and the cancel time (15 minutes or more). Raise a rider's personal cash limit only after a clean record.
4. Pay restaurants on a fixed schedule (weekly or twice a week) and tell them in the restaurant agreement. Riders hand in all cash daily.