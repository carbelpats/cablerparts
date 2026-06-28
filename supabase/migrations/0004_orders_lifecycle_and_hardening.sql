-- =============================================================================
-- Cabler Parts — migration 0004: order-lifecycle schema sync + security hardening
--
-- Fixes (found by the production audit) that broke the CLOUD order pipeline and
-- closed real authorization gaps. Builds on 0001-0003. Idempotent where possible.
--
--   1. orders.status: the app uses a 10-status lifecycle (Received .. Delivered +
--      Cancelled/Returned/Refunded) but the table only allowed 3 statuses and
--      defaulted to 'Processing' -> EVERY checkout INSERT (status='Received') was
--      rejected by Postgres. Expand the CHECK + default to the real set.
--   2. orders: add the 7 lifecycle/payment/shipping columns the app writes
--      (orderToRow/patchToRow) but that never existed -> INSERT/UPDATE failed
--      with PGRST204.
--   3. Order lifecycle is ADMIN-ONLY: a BEFORE UPDATE trigger reverts status /
--      tracking / payment / totals / items for non-admins, so an order owner can
--      no longer self-advance their own order via the public anon client.
--   4. profiles: prevent self-chosen 'admin' role on INSERT (the escalation guard
--      previously fired on UPDATE only).
--   5. storage: drop the broad public LISTING policy on the media bucket (public
--      object URLs still serve); listing is now admin-only.
-- =============================================================================

-- 1) orders.status — expand to the full lifecycle set + default 'Received' --------
alter table public.orders drop constraint if exists orders_status_check;
update public.orders
  set status = 'Received'
  where status is null or status not in (
    'Received','PaymentConfirmed','Processing','Packed','Shipped',
    'OutForDelivery','Delivered','Cancelled','Returned','Refunded'
  );
alter table public.orders
  add constraint orders_status_check check (status in (
    'Received','PaymentConfirmed','Processing','Packed','Shipped',
    'OutForDelivery','Delivered','Cancelled','Returned','Refunded'
  ));
alter table public.orders alter column status set default 'Received';

-- 2) orders — add the columns the app persists -----------------------------------
alter table public.orders
  add column if not exists payment_method          text,
  add column if not exists payment_status          text,
  add column if not exists shipping_method         text,
  add column if not exists courier_provider        text,
  add column if not exists tracking_number         text,
  add column if not exists estimated_delivery_date timestamptz,
  add column if not exists actual_delivery_date    timestamptz;

-- 3) order lifecycle is admin-only ----------------------------------------------
-- RLS still lets an owner UPDATE their own row; this trigger neutralises any
-- attempt by a non-admin to change lifecycle/financial columns (silent revert,
-- mirrors prevent_role_escalation). Admin sessions (is_admin()) pass through.
create or replace function public.enforce_order_lifecycle_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.status                  := old.status;
    new.status_history          := old.status_history;
    new.payment_status          := old.payment_status;
    new.payment_id              := old.payment_id;
    new.payment_method          := old.payment_method;
    new.shipping_method         := old.shipping_method;
    new.courier_provider        := old.courier_provider;
    new.tracking_number         := old.tracking_number;
    new.estimated_delivery_date := old.estimated_delivery_date;
    new.actual_delivery_date    := old.actual_delivery_date;
    new.subtotal_usd            := old.subtotal_usd;
    new.discount_usd            := old.discount_usd;
    new.shipping_usd            := old.shipping_usd;
    new.total_usd               := old.total_usd;
    new.items                   := old.items;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_enforce_lifecycle_admin on public.orders;
create trigger orders_enforce_lifecycle_admin
  before update on public.orders
  for each row execute function public.enforce_order_lifecycle_admin();

revoke execute on function public.enforce_order_lifecycle_admin() from anon, authenticated;

-- 4) profiles — block self-chosen role on INSERT as well as UPDATE ---------------
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.role is distinct from 'user' and not public.is_admin() then
      new.role := 'user';
    end if;
    return new;
  end if;
  -- UPDATE
  if new.role is distinct from old.role then
    if not public.is_admin() then
      new.role := old.role;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_escalation on public.profiles;
create trigger profiles_prevent_role_escalation
  before insert or update on public.profiles
  for each row execute function public.prevent_role_escalation();

-- 5) storage — media bucket: no anonymous listing -------------------------------
-- Public object URLs (getPublicUrl) serve without a SELECT policy; only listing
-- needs one. Restrict listing to admins.
drop policy if exists "media_public_select" on storage.objects;
drop policy if exists "media_admin_select"  on storage.objects;
create policy "media_admin_select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'media' and public.is_admin());
