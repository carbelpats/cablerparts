-- =============================================================================
-- Cabler Parts — migration 0005: lock internal SECURITY DEFINER functions
--
-- The Supabase Security Advisor flags SECURITY DEFINER functions that are
-- callable via the public REST RPC endpoint (/rest/v1/rpc/...). EXECUTE defaults
-- to the PUBLIC role, so revoking only from anon/authenticated is INEFFECTIVE
-- (and `create or replace` in 0004 reset the grants). Revoke from PUBLIC too.
--
-- These are trigger / event-trigger functions — triggers fire WITHOUT the caller
-- needing EXECUTE, so revoking does not break signup, role guarding, the order
-- lifecycle guard, or RLS auto-enable.
--
-- is_admin() is intentionally LEFT executable: RLS policies call it as the
-- querying role (including anon on the public order-tracking page), so revoking
-- it would break those policies. It only reveals whether the *caller* is an
-- admin, so leaving it callable is safe by design.
-- =============================================================================

revoke execute on function public.handle_new_user()               from public, anon, authenticated;
revoke execute on function public.prevent_role_escalation()       from public, anon, authenticated;
revoke execute on function public.enforce_order_lifecycle_admin() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable()               from public, anon, authenticated;
