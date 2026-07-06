-- 0007_orders_payment_id_unique.sql
-- One payment can pay for exactly ONE order: DB-level replay protection so a
-- verified Moyasar payment id can never be recorded on two orders, no matter
-- what any client sends (the /pay/callback page also binds the URL's payment
-- id to the checkout snapshot, but the database is the final word).
-- Partial index: payment_id is null stays allowed.
create unique index if not exists orders_payment_id_uidx
  on public.orders (payment_id)
  where payment_id is not null;
