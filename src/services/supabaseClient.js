// -----------------------------------------------------------------------------
// AL-MEYAR — Supabase client (lazy, optional)
//
// The whole app runs in two modes:
//   • SUPABASE  — when both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set
//   • LOCAL     — otherwise (localStorage adapters)
//
// getSupabase() dynamically imports @supabase/supabase-js ONLY when configured,
// so the dependency stays out of the main bundle for local/preview builds.
//
// Vite env is read with OPTIONAL CHAINING so the module also runs under Node /
// Vitest where import.meta.env may be undefined.
// -----------------------------------------------------------------------------

const url = import.meta.env?.VITE_SUPABASE_URL;
const key = import.meta.env?.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && key);

let _clientPromise = null;

// Memoized factory — resolves to a configured Supabase client, or null when the
// environment is not configured. Never throws for the unconfigured case.
export async function getSupabase() {
  if (!isSupabaseConfigured) return null;
  if (!_clientPromise) {
    _clientPromise = import("@supabase/supabase-js").then(({ createClient }) =>
      createClient(url, key, { auth: { persistSession: true } })
    );
  }
  return _clientPromise;
}
