-- 0006_rls_initplan_perf.sql
-- Performance only — no behaviour change. Wrap auth.uid() / is_admin() inside
-- scalar subselects so Postgres evaluates them ONCE per query (init-plan)
-- instead of re-running them for every row. The policy predicates are logically
-- identical; this just clears the Supabase "Auth RLS Initialization Plan"
-- advisories on profiles / orders / carts and keeps RLS fast as these tables
-- grow. Uses ALTER POLICY so each policy is updated atomically (no window where
-- the row-level protection is dropped).

-- profiles ------------------------------------------------------------------
alter policy profiles_select_own on public.profiles
  using (((select auth.uid()) = id) or (select is_admin()));
alter policy profiles_insert_own on public.profiles
  with check ((select auth.uid()) = id);
alter policy profiles_update_own on public.profiles
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- orders --------------------------------------------------------------------
alter policy orders_select_own on public.orders
  using (((select auth.uid()) = user_id) or (select is_admin()));
alter policy orders_insert_own on public.orders
  with check ((select auth.uid()) = user_id);
alter policy orders_update_own_or_admin on public.orders
  using (((select auth.uid()) = user_id) or (select is_admin()))
  with check (((select auth.uid()) = user_id) or (select is_admin()));

-- carts ---------------------------------------------------------------------
alter policy carts_select_own on public.carts
  using ((select auth.uid()) = user_id);
alter policy carts_insert_own on public.carts
  with check ((select auth.uid()) = user_id);
alter policy carts_update_own on public.carts
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
