// -----------------------------------------------------------------------------
// CABLER PARTS — Auth service (dual adapter)
//
// Auto-selects a SUPABASE adapter when configured, else a LOCAL (localStorage)
// adapter that reuses the original AuthContext logic (djb2 passwordHash, keys
// "almeyar:users" / "almeyar:session"). Both adapters resolve to the same
// shapes and the same AUTH_ERRORS codes.
//
//   user  = { id, name, email, role: "user" | "admin" }
//   error = a CODE from AUTH_ERRORS
//
// All exports are async. import.meta.env is read with optional chaining so this
// runs under Node / Vitest too.
// -----------------------------------------------------------------------------

import { isSupabaseConfigured, getSupabase } from "./supabaseClient";

// ---- error codes (UI localizes these) ---------------------------------------
export const AUTH_ERRORS = {
  NAME_REQUIRED: "name_required",
  INVALID_EMAIL: "invalid_email",
  WEAK_PASSWORD: "weak_password",
  EMAIL_TAKEN: "email_taken",
  WRONG_CREDENTIALS: "wrong_credentials",
  NOT_AUTHED: "not_authed",
  STORAGE: "storage_error",
};

// NOTE: "almeyar:*" localStorage keys are legacy-internal and intentionally
// left unchanged across the Cabler Parts rebrand (renaming them would drop
// already-persisted user/session data). They are invisible to users.
const USERS_KEY = "almeyar:users";
const SESSION_KEY = "almeyar:session";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 6;

// ---- admin allow-list (build-time public env) -------------------------------
function adminEmails() {
  const raw =
    import.meta.env?.VITE_ADMIN_EMAILS || "admin@cablerparts.com";
  return String(raw)
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function roleForEmail(email) {
  return adminEmails().includes(String(email || "").toLowerCase())
    ? "admin"
    : "user";
}

// ---- trivial NON-CRYPTO djb2 -> base36 hash (demo only — NOT secure) --------
function djb2(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 33) ^ str.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}

function hashPassword(password) {
  return djb2("almeyar:" + password);
}

function makeId() {
  return (
    "u_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).slice(2, 8)
  );
}

// ===========================================================================
// LOCAL adapter (localStorage) — reuses the original AuthContext logic
// ===========================================================================
function readUsers() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeUsers(users) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {
    /* ignore quota / privacy errors */
  }
}

function readSession() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(SESSION_KEY) || null;
  } catch {
    return null;
  }
}

function writeSession(userId) {
  if (typeof window === "undefined") return;
  try {
    if (userId) window.localStorage.setItem(SESSION_KEY, userId);
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

// public-shape user (never expose passwordHash); role derived from email
function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role || roleForEmail(u.email),
  };
}

// in-process subscribers for onAuthChange (LOCAL adapter)
const _localListeners = new Set();
function emitLocal(user) {
  _localListeners.forEach((cb) => {
    try {
      cb(user);
    } catch {
      /* ignore listener errors */
    }
  });
}

const localAdapter = {
  async signUp({ name, email, password } = {}) {
    const normName = String(name || "").trim();
    const normEmail = String(email || "").trim().toLowerCase();
    if (!normName) return { ok: false, error: AUTH_ERRORS.NAME_REQUIRED };
    if (!EMAIL_RE.test(normEmail))
      return { ok: false, error: AUTH_ERRORS.INVALID_EMAIL };
    if (String(password || "").length < MIN_PASSWORD)
      return { ok: false, error: AUTH_ERRORS.WEAK_PASSWORD };
    try {
      const users = readUsers();
      if (users.some((u) => u.email === normEmail))
        return { ok: false, error: AUTH_ERRORS.EMAIL_TAKEN };
      const record = {
        id: makeId(),
        name: normName,
        email: normEmail,
        passwordHash: hashPassword(password),
        role: roleForEmail(normEmail),
        createdAt: Date.now(),
      };
      writeUsers([...users, record]);
      writeSession(record.id);
      const pub = publicUser(record);
      emitLocal(pub);
      return { ok: true, user: pub };
    } catch {
      return { ok: false, error: AUTH_ERRORS.STORAGE };
    }
  },

  async signIn(email, password) {
    const normEmail = String(email || "").trim().toLowerCase();
    if (!EMAIL_RE.test(normEmail))
      return { ok: false, error: AUTH_ERRORS.INVALID_EMAIL };
    if (String(password || "").length < MIN_PASSWORD)
      return { ok: false, error: AUTH_ERRORS.WRONG_CREDENTIALS };
    try {
      const users = readUsers();
      const found = users.find((u) => u.email === normEmail);
      if (!found || found.passwordHash !== hashPassword(password))
        return { ok: false, error: AUTH_ERRORS.WRONG_CREDENTIALS };
      writeSession(found.id);
      const pub = publicUser(found);
      emitLocal(pub);
      return { ok: true, user: pub };
    } catch {
      return { ok: false, error: AUTH_ERRORS.STORAGE };
    }
  },

  async signOut() {
    writeSession(null);
    emitLocal(null);
  },

  async getCurrentUser() {
    const sessionId = readSession();
    if (!sessionId) return null;
    const found = readUsers().find((u) => u.id === sessionId);
    return publicUser(found) || null;
  },

  onAuthChange(cb) {
    if (typeof cb !== "function") return () => {};
    _localListeners.add(cb);
    return () => _localListeners.delete(cb);
  },

  async updateProfile(patch = {}) {
    const sessionId = readSession();
    if (!sessionId) return { ok: false, error: AUTH_ERRORS.NOT_AUTHED };
    const users = readUsers();
    const current = users.find((u) => u.id === sessionId);
    if (!current) return { ok: false, error: AUTH_ERRORS.NOT_AUTHED };

    const nextName =
      patch.name == null ? current.name : String(patch.name).trim();
    const nextEmail =
      patch.email == null
        ? current.email
        : String(patch.email).trim().toLowerCase();

    if (!nextName) return { ok: false, error: AUTH_ERRORS.NAME_REQUIRED };
    if (!EMAIL_RE.test(nextEmail))
      return { ok: false, error: AUTH_ERRORS.INVALID_EMAIL };
    try {
      if (
        nextEmail !== current.email &&
        users.some((u) => u.email === nextEmail && u.id !== current.id)
      )
        return { ok: false, error: AUTH_ERRORS.EMAIL_TAKEN };
      const updated = users.map((u) =>
        u.id === current.id
          ? { ...u, name: nextName, email: nextEmail, role: roleForEmail(nextEmail) }
          : u
      );
      writeUsers(updated);
      const pub = publicUser(updated.find((u) => u.id === current.id));
      emitLocal(pub);
      return { ok: true, user: pub };
    } catch {
      return { ok: false, error: AUTH_ERRORS.STORAGE };
    }
  },
};

// ===========================================================================
// SUPABASE adapter — supabase.auth + a `profiles` table (id, name, role)
// ===========================================================================
// Map Supabase auth errors to our stable AUTH_ERRORS codes.
function mapSupabaseAuthError(err, fallback = AUTH_ERRORS.WRONG_CREDENTIALS) {
  const msg = String(err?.message || "").toLowerCase();
  if (msg.includes("already") || msg.includes("registered"))
    return AUTH_ERRORS.EMAIL_TAKEN;
  if (msg.includes("invalid") && msg.includes("email"))
    return AUTH_ERRORS.INVALID_EMAIL;
  if (msg.includes("password") && (msg.includes("short") || msg.includes("least")))
    return AUTH_ERRORS.WEAK_PASSWORD;
  if (msg.includes("invalid") && msg.includes("credentials"))
    return AUTH_ERRORS.WRONG_CREDENTIALS;
  return fallback;
}

async function fetchProfile(sb, authUser) {
  if (!authUser) return null;
  let name =
    authUser.user_metadata?.name || authUser.email?.split("@")[0] || "";
  let role = roleForEmail(authUser.email);
  try {
    const { data } = await sb
      .from("profiles")
      .select("name, role")
      .eq("id", authUser.id)
      .single();
    if (data) {
      if (data.name) name = data.name;
      if (data.role) role = data.role;
    }
  } catch {
    /* fall back to metadata-derived values */
  }
  return { id: authUser.id, name, email: authUser.email, role };
}

const supabaseAdapter = {
  async signUp({ name, email, password } = {}) {
    const normName = String(name || "").trim();
    const normEmail = String(email || "").trim().toLowerCase();
    if (!normName) return { ok: false, error: AUTH_ERRORS.NAME_REQUIRED };
    if (!EMAIL_RE.test(normEmail))
      return { ok: false, error: AUTH_ERRORS.INVALID_EMAIL };
    if (String(password || "").length < MIN_PASSWORD)
      return { ok: false, error: AUTH_ERRORS.WEAK_PASSWORD };
    try {
      const sb = await getSupabase();
      const { data, error } = await sb.auth.signUp({
        email: normEmail,
        password,
        options: { data: { name: normName } },
      });
      if (error)
        return { ok: false, error: mapSupabaseAuthError(error, AUTH_ERRORS.EMAIL_TAKEN) };
      const authUser = data?.user;
      const role = roleForEmail(normEmail);
      // best-effort profile upsert (a DB trigger may also create the row)
      if (authUser) {
        try {
          await sb
            .from("profiles")
            .upsert(
              { id: authUser.id, name: normName, email: normEmail, role },
              { onConflict: "id" }
            );
        } catch {
          /* ignore — trigger may own this */
        }
      }
      const user = authUser
        ? { id: authUser.id, name: normName, email: normEmail, role }
        : null;
      return { ok: true, user };
    } catch {
      return { ok: false, error: AUTH_ERRORS.STORAGE };
    }
  },

  async signIn(email, password) {
    const normEmail = String(email || "").trim().toLowerCase();
    if (!EMAIL_RE.test(normEmail))
      return { ok: false, error: AUTH_ERRORS.INVALID_EMAIL };
    if (String(password || "").length < MIN_PASSWORD)
      return { ok: false, error: AUTH_ERRORS.WRONG_CREDENTIALS };
    try {
      const sb = await getSupabase();
      const { data, error } = await sb.auth.signInWithPassword({
        email: normEmail,
        password,
      });
      if (error)
        return { ok: false, error: mapSupabaseAuthError(error) };
      const user = await fetchProfile(sb, data?.user);
      return { ok: true, user };
    } catch {
      return { ok: false, error: AUTH_ERRORS.STORAGE };
    }
  },

  async signOut() {
    try {
      const sb = await getSupabase();
      await sb.auth.signOut();
    } catch {
      /* ignore */
    }
  },

  async getCurrentUser() {
    try {
      const sb = await getSupabase();
      const { data } = await sb.auth.getUser();
      return await fetchProfile(sb, data?.user);
    } catch {
      return null;
    }
  },

  onAuthChange(cb) {
    if (typeof cb !== "function") return () => {};
    let unsub = () => {};
    let cancelled = false;
    (async () => {
      try {
        const sb = await getSupabase();
        const { data } = sb.auth.onAuthStateChange(async (_event, session) => {
          const user = session?.user
            ? await fetchProfile(sb, session.user)
            : null;
          cb(user);
        });
        if (cancelled) data?.subscription?.unsubscribe?.();
        else unsub = () => data?.subscription?.unsubscribe?.();
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
      unsub();
    };
  },

  async updateProfile(patch = {}) {
    try {
      const sb = await getSupabase();
      const { data: cur } = await sb.auth.getUser();
      const authUser = cur?.user;
      if (!authUser) return { ok: false, error: AUTH_ERRORS.NOT_AUTHED };

      const updates = {};
      if (patch.name != null) {
        const nextName = String(patch.name).trim();
        if (!nextName) return { ok: false, error: AUTH_ERRORS.NAME_REQUIRED };
        updates.name = nextName;
      }
      if (patch.email != null) {
        const nextEmail = String(patch.email).trim().toLowerCase();
        if (!EMAIL_RE.test(nextEmail))
          return { ok: false, error: AUTH_ERRORS.INVALID_EMAIL };
        updates.email = nextEmail;
      }

      // sync auth-level fields (email + metadata.name)
      const authPatch = {};
      if (updates.email) authPatch.email = updates.email;
      if (updates.name) authPatch.data = { name: updates.name };
      if (Object.keys(authPatch).length) {
        const { error } = await sb.auth.updateUser(authPatch);
        if (error) return { ok: false, error: mapSupabaseAuthError(error) };
      }

      // sync the profiles row
      try {
        const profilePatch = { id: authUser.id };
        if (updates.name != null) profilePatch.name = updates.name;
        if (updates.email != null) profilePatch.email = updates.email;
        await sb.from("profiles").upsert(profilePatch, { onConflict: "id" });
      } catch {
        /* ignore */
      }

      const { data: refreshed } = await sb.auth.getUser();
      const user = await fetchProfile(sb, refreshed?.user);
      return { ok: true, user };
    } catch {
      return { ok: false, error: AUTH_ERRORS.STORAGE };
    }
  },
};

// ===========================================================================
// Adapter selection + public API
// ===========================================================================
const adapter = isSupabaseConfigured ? supabaseAdapter : localAdapter;

export async function signUp(payload) {
  return adapter.signUp(payload);
}
export async function signIn(email, password) {
  return adapter.signIn(email, password);
}
export async function signOut() {
  return adapter.signOut();
}
export async function getCurrentUser() {
  return adapter.getCurrentUser();
}
export function onAuthChange(cb) {
  return adapter.onAuthChange(cb);
}
export async function updateProfile(patch) {
  return adapter.updateProfile(patch);
}
