# StockPulse AI — Market intelligence preview

StockPulse AI is a Next.js 16 / Supabase application for private equity watchlists, market research, source-attributed news, and **experimental** historical direction models.

## Functionality
- User sign-up, login, email verification, password recovery and private watchlists from Phase 1.
- Stock research endpoint `/api/intelligence?symbol=AAPL&exchange=NASDAQ` with server-side authorization and watchlist ownership verification.
- US daily close history (Stooq), quote snapshots where supported, optional Finnhub quotes/profiles and Twelve Data global price coverage, company-specific and worldwide macro GDELT news discovery, manually curated trusted publisher filter.
- 5-session and 20-session historical direction models: logistic regression trained on lagged price features and evaluated on a time-ordered holdout, with a purge at the training/test boundary. Probabilities are **withheld when the model fails to beat a naive base-rate benchmark**.
- News headline keyword score displayed separately, not incorrectly described as a validated predictive model.
- Research dashboard with quote provenance, history chart, linked headlines and data limitations.

**Important:** This release is not a trained news-aware investment recommendation engine. It does not guarantee that any stock will rise or fall. Provider outages or missing keys display unavailable states rather than fabricated prices or headlines. US closing quotes may be delayed. Some Indian market symbols require an additional licensed data provider.

## Set up locally
1. Node.js 22.18+ or Node.js 24 recommended.
2. `npm install`.
3. Create `.env.local` containing:
   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://tzaqtyoriwjxoksnagjd.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<the StockPulse project's publishable key>
   FINNHUB_API_KEY=<optional server-side API key>
   TWELVE_DATA_API_KEY=<optional server-side global market-data key>
   ```
4. In the dedicated StockPulse Supabase project, apply `supabase/migrations/20261118000000_create_watchlists.sql`, if not yet applied.
5. Supabase Auth > URL Configuration: configure the actual frontend origin as Site URL, add `https://YOUR_DEPLOYED_DOMAIN/auth/callback` and `http://localhost:3000/auth/callback` as redirect URLs.
6. Run `npm run dev`, register/login, add an AAPL/NASDAQ watchlist item, and open **Market intelligence** in your dashboard.

## Testing
```bash
npm install
npm test
npm run lint
npm run typecheck
npm run build
```
The `npm test` command checks forecast input validation, training/holdout metrics, no-data fallback, and basic headline scoring. End-to-end Supabase account flows and live provider quality require integration testing with the dedicated project.

## Deployment
Use the existing Vercel `stockpulse-ai` project linked to `simranKaur84/stockpulse-ai`. Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for Production, Preview, and Development, and redeploy after adding them. Keep `FINNHUB_API_KEY` and `TWELVE_DATA_API_KEY` server-side only. Never use the Canuck Motors database or service-role credentials.

## Data and interpretation limitations
- Live provider results vary by market, coverage, subscription level and rate limit.
- GDELT can surface irrelevant stories despite exact ticker query and publisher filtering. Always verify the linked article's relation to the company.
- Historical predictions are not news-aware, not forward-validated in live trading, and not guaranteed to be calibrated. Use holdout performance and sourcing when interpreting outputs.
- The simple keyword-based news score can fail on negation, satire, context and ambiguous tickers.
- Never automatically trade or issue unqualified buy/sell instructions based on the current model.
