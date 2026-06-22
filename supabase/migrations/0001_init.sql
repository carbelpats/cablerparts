-- =============================================================================
-- Cabler Parts — initial schema (Phase 5, launch-ready)
-- Tables: profiles, products, orders, carts
-- Plus Row-Level Security policies + a signup trigger that auto-creates a profile.
--
-- Run this in the Supabase SQL editor (or via `supabase db push`) BEFORE seed.sql.
-- All money columns are USD (base currency); the storefront localizes display.
-- =============================================================================

-- Needed for gen_random_uuid() on some Postgres versions (Supabase ships pgcrypto).
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- profiles — one row per auth user. role drives the admin dashboard.
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text,
  email      text,
  role       text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- products — catalog. id is the human SKU (e.g. "MR-BRK-001"), data is jsonb
-- so the full product shape from src/lib/data.js round-trips without migration.
-- -----------------------------------------------------------------------------
create table if not exists public.products (
  id         text primary key,
  data       jsonb not null,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- orders — customer orders. status is ADMIN-CONTROLLED.
-- -----------------------------------------------------------------------------
create table if not exists public.orders (
  id             text primary key,
  user_id        uuid references auth.users (id) on delete set null,
  status         text not null default 'Processing'
                   check (status in ('Processing', 'Shipped', 'Delivered')),
  status_history jsonb not null default '[]'::jsonb,
  items          jsonb not null default '[]'::jsonb,
  subtotal_usd   numeric(12, 2) not null default 0,
  discount_usd   numeric(12, 2) not null default 0,
  shipping_usd   numeric(12, 2) not null default 0,
  total_usd      numeric(12, 2) not null default 0,
  contact        jsonb,
  shipping       jsonb,
  payment_id     text,
  created_at     timestamptz not null default now()
);

create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists orders_status_idx  on public.orders (status);

-- -----------------------------------------------------------------------------
-- carts — one row per user; data holds { items, coupon } as jsonb.
-- -----------------------------------------------------------------------------
create table if not exists public.carts (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- =============================================================================
-- Helper: is the current user an admin? (SECURITY DEFINER avoids RLS recursion
-- when an orders policy needs to look the caller's role up in profiles.)
-- =============================================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- =============================================================================
-- Row-Level Security
-- =============================================================================
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders   enable row level security;
alter table public.carts    enable row level security;

-- ---- profiles -------------------------------------------------------------
-- A user can read and update their own profile; admins can read all.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ---- products -------------------------------------------------------------
-- Public read; only admins may write.
drop policy if exists "products_select_public" on public.products;
create policy "products_select_public"
  on public.products for select
  using (true);

drop policy if exists "products_admin_write" on public.products;
create policy "products_admin_write"
  on public.products for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---- orders ---------------------------------------------------------------
-- Owners select/insert/update their own; admins select & update all.
drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own"
  on public.orders for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own"
  on public.orders for insert
  with check (auth.uid() = user_id);

drop policy if exists "orders_update_own_or_admin" on public.orders;
create policy "orders_update_own_or_admin"
  on public.orders for update
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

-- ---- carts ----------------------------------------------------------------
-- Owner-only select/insert/update.
drop policy if exists "carts_select_own" on public.carts;
create policy "carts_select_own"
  on public.carts for select
  using (auth.uid() = user_id);

drop policy if exists "carts_insert_own" on public.carts;
create policy "carts_insert_own"
  on public.carts for insert
  with check (auth.uid() = user_id);

drop policy if exists "carts_update_own" on public.carts;
create policy "carts_update_own"
  on public.carts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =============================================================================
-- Signup trigger: auto-insert a profile row whenever an auth user is created.
-- Pulls name from user metadata; defaults role to 'user'.
-- (Promote an admin afterwards: update public.profiles set role='admin' where ...)
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    new.email,
    'user'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
