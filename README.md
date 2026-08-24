# Cascade — Vendor Insurance (COI) Tracker

MVP: upload a vendor's certificate of insurance, OCR pulls the expiry date,
you get emailed at 30/14/1 days before it lapses.

## What's built

- `supabase/schema.sql` — full database schema (companies, vendors, alerts)
- `app/api/upload` — receives a PDF, runs OCR (AWS Textract), stores the vendor
- `app/api/vendors` — list / manually correct / delete vendors
- `app/api/check-expirations` — the daily cron job that sends alert emails
- `app/dashboard` — the UI: upload form + vendor status table
- `vercel.json` — schedules the cron to run daily at 1pm UTC

## What's stubbed / needs you to finish

1. **Auth** — `DEMO_COMPANY_ID` in `dashboard/page.tsx` is a placeholder.
   Wire up Supabase Auth so each company only sees its own vendors
   (the RLS policies in schema.sql are already written for this).
2. **Notification email** — `check-expirations/route.ts` sends every alert
   to `compliance@example.com`. Add a `notification_email` column to
   `companies` and use the real one.
3. **Stripe billing** — not built yet. For your first 1-2 customers,
   skip it and invoice manually — don't block launch on this.

## Setup steps

1. Create a Supabase project at supabase.com, run `supabase/schema.sql`
   in the SQL editor.
2. Create an AWS account, enable Textract, generate an IAM key with
   Textract access.
3. Create a Resend account (resend.com) for sending alert emails,
   verify your sending domain.
4. Copy `.env.example` to `.env.local`, fill in all the keys.
5. `npm install`
6. `npm run dev` — runs locally at localhost:3000/dashboard
7. Deploy: push to GitHub, import into Vercel, add the same env vars
   there, set `CRON_SECRET` in Vercel's env vars too (Vercel Cron
   auto-sends it as the Authorization header on scheduled runs).

## Known limitations (v1, be upfront about these with early customers)

- OCR accuracy depends on certificate layout — non-standard COI formats
  may need manual date entry (the UI already handles this gracefully).
- No Slack alerts yet, email only — add as a v2 if customers ask.
- No multi-user accounts per company yet — one login per company for now.
