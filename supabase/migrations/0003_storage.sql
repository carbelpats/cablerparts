-- =============================================================================
-- Cabler Parts — Storage: public "media" bucket + RLS
--
-- Backs src/services/storageService.js (uploadImage): admin-uploaded brand logos,
-- payment provider logos and product images live here as small public URLs
-- instead of inline base64. The storefront only ever READS these URLs.
--
-- Idempotent: safe to re-run. Reuses public.is_admin() from 0001_init.sql.
-- Run in the Supabase SQL editor (or `supabase db push`) AFTER 0001_init.sql.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Bucket: "media", public (objects are world-readable by URL). Writes are still
-- gated by the RLS policies below — public=true only governs SELECT/serving.
-- on conflict do nothing => re-running this file never errors or resets it.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- RLS on storage.objects (already enabled by Supabase). We scope every policy
-- to bucket_id = 'media' so other buckets are untouched.
-- -----------------------------------------------------------------------------

-- Public READ: anyone (anon or authenticated) can view media objects, so the
-- storefront <img src> works without auth.
drop policy if exists "media_public_select" on storage.objects;
create policy "media_public_select"
  on storage.objects for select
  using (bucket_id = 'media');

-- Admin INSERT: only admins (per public.is_admin()) may upload new objects.
drop policy if exists "media_admin_insert" on storage.objects;
create policy "media_admin_insert"
  on storage.objects for insert
  with check (bucket_id = 'media' and public.is_admin());

-- Admin UPDATE: only admins may overwrite/replace existing media objects.
drop policy if exists "media_admin_update" on storage.objects;
create policy "media_admin_update"
  on storage.objects for update
  using (bucket_id = 'media' and public.is_admin())
  with check (bucket_id = 'media' and public.is_admin());

-- Admin DELETE: only admins may remove media objects.
drop policy if exists "media_admin_delete" on storage.objects;
create policy "media_admin_delete"
  on storage.objects for delete
  using (bucket_id = 'media' and public.is_admin());
