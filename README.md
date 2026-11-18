# StockPulse AI — Phase 1

A **separate standalone project**. Does not use or modify Canuck Motors source, Vercel, GitHub repository or Supabase project.

## Included

- Next.js 16 App Router + TypeScript
- Supabase email/password registration, login, email verification callback, password reset, logout
- Server-protected dashboard and cookie-based session management
- Personal watchlists with NASDAQ / NYSE / NSE / BSE exchange and short / long / both horizon
- Supabase SQL migration with per-user Row Level Security
- Responsive dark financial dashboard

Not yet implemented: stock symbol lookup/validation, prices, news, AI recommendations, alerts. **Do not interpret Phase 1 as a working financial prediction engine.**

## Setup (new project only)

1. Use your dedicated Supabase StockPulse AI project `tzaqtyoriwjxoksnagjd`.
2. In its SQL Editor, run `supabase/migrations/20261118000000_create_watchlists.sql` **once**. Alternatively apply this migration with the Supabase CLI against that project.
3. In Supabase Authentication > URL Configuration, set Site URL to `http://localhost:3000`, and add Redirect URLs `http://localhost:3000/**` and your future production domain `https://YOUR_STOCKPULSE_DOMAIN/**`. Enable email confirmation for production.
4. Copy `.env.example` to `.env.local`, fill your dedicated project's URL and publishable key. Do not use the secret/service role key in `NEXT_PUBLIC_` variables.
5. Run `npm install`, `npm run dev`, open http://localhost:3000.
6. Verify registration, confirmation, login, add/remove on two different accounts, logout, password reset and auth redirects. Run `npm run lint`, `npm run typecheck` and `npm run build`.

## GitHub

This application lives in the dedicated repository `simranKaur84/stockpulse-ai`. It does not share code or configuration with Canuck Motors.

## Deploy to Vercel

Use the existing dedicated `stockpulse-ai` project in the `simrankaur84` Vercel scope. Connect **only** the `simranKaur84/stockpulse-ai` repository.
Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in Vercel's project environment variables; deploy. Add actual Vercel domain to the dedicated Supabase project's Auth Redirect URLs / Site URL. Never reuse Canuck Motors deployment or database.

## Database ownership

Public tables `profiles` and `watchlists` use row-level security. Auth identities remain in `auth.users`. Never expose a Supabase secret/service-role key client-side.

## Future phases

Stock symbol verification + prices, global news aggregation, AI event impact with source citations, and calibrated signal quality assessments.
