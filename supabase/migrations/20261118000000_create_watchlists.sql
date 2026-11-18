-- Run in a NEW, dedicated StockPulse AI Supabase project.
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text,
 created_at timestamptz not null default now()
);
create table if not exists public.watchlists (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 symbol text not null check (symbol ~ '^[A-Z0-9.\-]{1,20}$'),
 exchange text not null check (exchange in ('NASDAQ','NYSE','NSE','BSE')),
 investment_horizon text not null default 'both' check (investment_horizon in ('short','long','both')),
 created_at timestamptz not null default now(),
 unique(user_id,symbol,exchange)
);
create index if not exists watchlists_user_id_idx on public.watchlists(user_id);
alter table public.profiles enable row level security;
alter table public.watchlists enable row level security;
create policy "Profiles select own" on public.profiles for select to authenticated using ((select auth.uid())=id);
create policy "Profiles insert own" on public.profiles for insert to authenticated with check ((select auth.uid())=id);
create policy "Profiles update own" on public.profiles for update to authenticated using ((select auth.uid())=id) with check ((select auth.uid())=id);
create policy "Watchlists select own" on public.watchlists for select to authenticated using ((select auth.uid())=user_id);
create policy "Watchlists insert own" on public.watchlists for insert to authenticated with check ((select auth.uid())=user_id);
create policy "Watchlists update own" on public.watchlists for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "Watchlists delete own" on public.watchlists for delete to authenticated using ((select auth.uid())=user_id);
