-- =============================================================================
-- Cabler Parts — migration 0002: settings table + security hardening
--
-- Builds on 0001_init.sql (do NOT rerun/rewrite that file). This migration:
--   1. Adds the single-row `settings` table backing the Supabase settings
--      adapter (src/services/settingsService.js), with RLS: public SELECT,
--      admin-only INSERT/UPDATE.
--   2. Re-affirms that `products` writes are admin-only.
--   3. Blocks privilege escalation: a normal user can update their own profile
--      but CANNOT change their own `role` (only admins can). Enforced with a
--      BEFORE UPDATE trigger so it holds even if a future policy loosens.
--
-- Fully idempotent: safe to run multiple times (IF NOT EXISTS + drop-if-exists).
-- Run in the Supabase SQL editor or via `supabase db push` after 0001.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- settings — one row holding the whole site-settings blob as jsonb.
-- The app reads/writes a single row keyed id = 'site'. Matches the shape the
-- Supabase adapter expects: { id text pk, data jsonb, updated_at timestamptz }.
-- -----------------------------------------------------------------------------
create table if not exists public.settings (
  id         text primary key default 'site',
  data       jsonb,
  updated_at timestamptz not null default now()
);

-- Enable RLS so the policies below are the ONLY way rows are reachable.
alter table public.settings enable row level security;

-- Public read: the storefront needs contact info, branding, tagline, etc. for
-- anonymous visitors, so SELECT is open to everyone.
drop policy if exists "settings_select_public" on public.settings;
create policy "settings_select_public"
  on public.settings for select
  using (true);

-- Admin-only write: only an admin (see public.is_admin() from 0001) may create
-- or modify the settings row. INSERT and UPDATE are covered by FOR ALL; the
-- public SELECT policy above still grants reads.
drop policy if exists "settings_admin_write" on public.settings;
create policy "settings_admin_write"
  on public.settings for all
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- products — re-affirm admin-only writes (idempotent; also defined in 0001).
-- Kept here so this hardening migration is self-contained if 0001 drifts.
-- -----------------------------------------------------------------------------
alter table public.products enable row level security;

drop policy if exists "products_select_public" on public.products;
create policy "products_select_public"
  on public.products for select
  using (true);

drop policy if exists "products_admin_write" on public.products;
create policy "products_admin_write"
  on public.products for all
  using (public.is_admin())
  with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- Anti-privilege-escalation guard on profiles.
--
-- 0001's "profiles_update_own" lets a user UPDATE their own row, which would
-- otherwise let them set role = 'admin' on themselves. RLS WITH CHECK alone
-- cannot compare NEW.role to the existing (OLD) value, so we use a BEFORE
-- UPDATE trigger: if the caller is NOT an admin and tries to change `role`,
-- we force it back to the old value. Admins may change roles freely.
-- SECURITY DEFINER + locked search_path mirror is_admin()'s pattern.
-- -----------------------------------------------------------------------------
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only intervene when the role column is actually being changed.
  if new.role is distinct from old.role then
    -- Non-admins cannot change anyone's role (including their own).
    if not public.is_admin() then
      new.role := old.role;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_escalation on public.profiles;
create trigger profiles_prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();
