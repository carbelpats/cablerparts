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

// In-memory, per-tab auth lock.
//
// supabase-js defaults to a navigator.locks-based lock to coordinate token
// refresh ACROSS tabs. In some browsers / multi-tab / restored-session states
// that lock can DEADLOCK: the network request returns 200 but the JS promise
// that's waiting to acquire the lock never resolves — which freezes BOTH auth
// (sign-in stuck on "loading") AND data reads that attach the session token
// (the product grid stays on skeletons forever), even though every request
// succeeded server-side. This is the classic "works on a fresh browser, frozen
// on the user's" signature.
//
// We replace it with a promise-chain lock that serialises auth operations
// WITHIN the tab (so concurrent refreshes don't race) but has no cross-tab
// dependency, so it can never wedge on another tab.
//
// NOTE (verified against @supabase/auth-js internals): do NOT add an
// acquisition timeout here. GoTrue only calls the injected lock when its own
// `lockAcquired` flag is false — a holder that hangs keeps that flag true and
// later ops bypass this function entirely, so a timeout can't help; and when
// it would fire, releasing a waiter while the holder still runs breaks the
// exclusivity contract and permanently corrupts GoTrue's pending-op queue.
// Freeze protection lives in the LAYERS ABOVE instead: the data contexts race
// their initial loads against deadlines (never blocking the UI), and the
// boot-health watchdog clears a poisoned persisted session across visits.
let _authLockChain = Promise.resolve();
function inMemoryLock(_name, _acquireTimeout, fn) {
  const run = _authLockChain.then(() => fn(), () => fn());
  _authLockChain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

// Memoized factory — resolves to a configured Supabase client, or null when the
// environment is not configured. Never throws for the unconfigured case.
export async function getSupabase() {
  if (!isSupabaseConfigured) return null;
  if (!_clientPromise) {
    _clientPromise = import("@supabase/supabase-js").then(({ createClient }) =>
      createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          lock: inMemoryLock,
        },
      })
    );
  }
  return _clientPromise;
}
