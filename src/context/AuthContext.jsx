// -----------------------------------------------------------------------------
// AL-MEYAR — AuthContext (service-backed)
//
// Backed by src/services/authService.js, which auto-selects a SUPABASE adapter
// when configured (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY) and otherwise a
// LOCAL (localStorage) adapter. Either way the same { id, name, email, role }
// user shape and the same AUTH_ERRORS codes flow through this context.
//
// Session lifecycle:
//   - On mount we call getCurrentUser() to restore any persisted session and
//     subscribe to onAuthChange() so external auth events keep us in sync.
//   - status stays "loading" until that first resolution (initialised flag),
//     so route guards can render a spinner instead of redirecting prematurely.
//
// useAuth() -> { user, isAuthed, role, isAdmin, status, error,
//                signIn, signUp, signOut, updateProfile, clearError }
//
// Error surface: signIn / signUp / updateProfile resolve to { ok, error? } where
// `error` is a stable CODE from AUTH_ERRORS that pages localize. useAuth().error
// mirrors the last error code.
// -----------------------------------------------------------------------------

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";

import {
  AUTH_ERRORS,
  signIn as svcSignIn,
  signUp as svcSignUp,
  signOut as svcSignOut,
  getCurrentUser as svcGetCurrentUser,
  onAuthChange as svcOnAuthChange,
  updateProfile as svcUpdateProfile,
} from "../services/authService";

// re-export so existing consumers (`import { AUTH_ERRORS } from "../context/AuthContext"`)
// keep working unchanged
export { AUTH_ERRORS };

const AuthContext = createContext(null);

function roleOf(user) {
  return user?.role === "admin" ? "admin" : "user";
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // "loading" until the initial session restore resolves, then "idle".
  // signIn / signUp flip it back to "loading" for the duration of the call.
  const [status, setStatus] = useState("loading");
  const [initialised, setInitialised] = useState(false);
  const [error, setError] = useState(null);

  // guard against setState after unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ---- restore session + subscribe to auth changes (on mount) --------------
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Never let a hung session-restore (e.g. a stale token for a deleted
        // user, or a wedged auth lock) freeze the whole app: cap it and fall
        // back to logged-out. A real session still arrives via the
        // onAuthChange subscription below once it resolves.
        const current = await Promise.race([
          svcGetCurrentUser(),
          new Promise((resolve) => setTimeout(() => resolve(null), 8000)),
        ]);
        if (!cancelled && mountedRef.current) setUser(current || null);
      } catch {
        if (!cancelled && mountedRef.current) setUser(null);
      } finally {
        if (!cancelled && mountedRef.current) {
          setInitialised(true);
          setStatus("idle");
        }
      }
    })();

    const unsubscribe = svcOnAuthChange((nextUser) => {
      if (mountedRef.current) setUser(nextUser || null);
    });

    return () => {
      cancelled = true;
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const signIn = useCallback(async (email, password) => {
    setError(null);
    setStatus("loading");
    try {
      const res = await svcSignIn(email, password);
      if (res?.ok) {
        if (mountedRef.current && res.user) setUser(res.user);
        return { ok: true, user: res.user };
      }
      if (mountedRef.current) setError(res?.error || AUTH_ERRORS.WRONG_CREDENTIALS);
      return { ok: false, error: res?.error || AUTH_ERRORS.WRONG_CREDENTIALS };
    } catch {
      if (mountedRef.current) setError(AUTH_ERRORS.STORAGE);
      return { ok: false, error: AUTH_ERRORS.STORAGE };
    } finally {
      if (mountedRef.current) setStatus("idle");
    }
  }, []);

  const signUp = useCallback(async (payload) => {
    setError(null);
    setStatus("loading");
    try {
      const res = await svcSignUp(payload);
      if (res?.ok) {
        if (mountedRef.current && res.user) setUser(res.user);
        return { ok: true, user: res.user, needsConfirmation: res.needsConfirmation || false };
      }
      if (mountedRef.current) setError(res?.error || AUTH_ERRORS.STORAGE);
      return { ok: false, error: res?.error || AUTH_ERRORS.STORAGE };
    } catch {
      if (mountedRef.current) setError(AUTH_ERRORS.STORAGE);
      return { ok: false, error: AUTH_ERRORS.STORAGE };
    } finally {
      if (mountedRef.current) setStatus("idle");
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    try {
      await svcSignOut();
    } catch {
      /* ignore — clear local state regardless */
    }
    if (mountedRef.current) setUser(null);
  }, []);

  const updateProfile = useCallback(async (patch) => {
    setError(null);
    try {
      const res = await svcUpdateProfile(patch);
      if (res?.ok) {
        if (mountedRef.current && res.user) setUser(res.user);
        return { ok: true, user: res.user };
      }
      if (mountedRef.current) setError(res?.error || AUTH_ERRORS.STORAGE);
      return { ok: false, error: res?.error || AUTH_ERRORS.STORAGE };
    } catch {
      if (mountedRef.current) setError(AUTH_ERRORS.STORAGE);
      return { ok: false, error: AUTH_ERRORS.STORAGE };
    }
  }, []);

  const role = roleOf(user);

  const value = useMemo(
    () => ({
      user,
      isAuthed: !!user,
      role,
      isAdmin: role === "admin",
      // surface "loading" until the initial session restore resolves
      status: initialised ? status : "loading",
      error,
      signIn,
      signUp,
      signOut,
      updateProfile,
      clearError,
    }),
    [
      user,
      role,
      initialised,
      status,
      error,
      signIn,
      signUp,
      signOut,
      updateProfile,
      clearError,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
