// -----------------------------------------------------------------------------
// Cabler Parts — boot-health watchdog.
//
// THE BUG THIS KILLS: a stale/corrupt persisted Supabase auth token (typically
// left behind across deploys) can wedge supabase-js token refresh on startup;
// every data read then queues behind the auth lock and the storefront freezes
// on skeletons until the user manually clears ALL site data.
//
// Strategy — targeted self-healing instead of user-driven nuking:
//   • markBootStart() runs before React renders. If the LAST 2 visits provably
//     HUNG, it deletes ONLY the Supabase auth keys (sb-*) — the poisoned state
//     — so cart / garage / language / theme all survive. Worst case the device
//     is signed out once: exactly what "clear site data" did, minus the loss.
//   • "Provably hung" is strict, to rule out false-positive sign-outs:
//       – the tab must still be open 15s in with the catalog neither loaded
//         (markAppReady) NOR settled (markLoadSettled). A fetch that REJECTED
//         is settled — the network/auth path is alive, that's an outage, not
//         the wedge — so backend errors never count;
//       – misses less than 30s apart collapse into one (two tabs opened during
//         a single incident can't fake "two consecutive bad visits").
//   • markAppReady() fires when the catalog actually loads and resets the
//     counter.
//
// Storage: JSON { n: misses, t: last-miss epoch ms } under one key.
// -----------------------------------------------------------------------------

const KEY = "almeyar:boot-health";
const HANG_DETECT_MS = 15000; // > ProductsContext 7s deadline + slow-network margin
const MISS_DEDUPE_MS = 30000; // one incident, N tabs -> one miss

let _ready = false;
let _settled = false;

function readState() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { n: 0, t: 0 };
    const v = JSON.parse(raw);
    // legacy plain-number format from the first iteration
    if (typeof v === "number") return { n: v, t: 0 };
    return { n: Number(v?.n) || 0, t: Number(v?.t) || 0 };
  } catch {
    return { n: 0, t: 0 };
  }
}

function writeState(n, t) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ n, t }));
  } catch {
    /* ignore */
  }
}

export function markBootStart() {
  try {
    const { n } = readState();
    if (n >= 2) {
      // Two distinct visits in a row provably hung — assume the poisoned-token
      // freeze and drop ONLY the Supabase auth storage (keys start with "sb-").
      Object.keys(window.localStorage)
        .filter((k) => k.startsWith("sb-"))
        .forEach((k) => window.localStorage.removeItem(k));
      writeState(0, 0);
    }
    // Arm the hang detector for THIS visit.
    window.setTimeout(() => {
      if (_ready || _settled) return; // loaded, or failed FAST (outage ≠ hang)
      try {
        const { n: misses, t } = readState();
        const now = Date.now();
        if (now - t < MISS_DEDUPE_MS) return; // another tab already recorded this incident
        writeState(misses + 1, now);
      } catch {
        /* ignore */
      }
    }, HANG_DETECT_MS);
  } catch {
    /* storage unavailable — nothing to heal */
  }
}

// The initial catalog fetch SETTLED (resolved or rejected). A rejection means
// the request pipeline is alive — that's a backend problem, not the auth
// wedge — so this visit must never count toward the wipe.
export function markLoadSettled() {
  _settled = true;
}

export function markAppReady() {
  _ready = true;
  _settled = true;
  writeState(0, 0);
}
