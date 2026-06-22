import { useId } from "react";
import { useLang } from "../context/LanguageContext";

/* ----------------------------------------------------------------------------
   BrandLogo — the Cabler Parts mark (redesigned, sharper, ownable).

   The idea: precision engineering. So the mark is a
   precision GAUGE DIAL whose lit arc forms a bold "C" (Cabler), with a teal
   needle reading the redline and a warm pivot at its heart.

   Brand strategy encoded in the geometry:
     - Authority / trust ......... a confident, glossy rounded "standard plate"
                                   (a certified seal / app-icon tile).
     - Engineering precision ..... a gauge dial: a measured arc + tick marks.
     - Cabler / the "C" .......... the thick lit arc opens to the right, reading
                                   unmistakably as a "C" while staying a dial.
     - Speed / performance ....... a teal needle swept up toward the redline.
     - Human connection .......... a single warm pivot node — the moving heart.

   Amber (#FF7A1A / primary) leads; teal accent adds depth on needle + pivot.
   RTL-neutral (never mirrored). Legible from ~20px (favicon/nav) to 64px+
   (hero/footer): a thick arc + needle keep it readable small; ticks + gloss
   add richness when scaled up. Per-instance gradient ids so multiple marks on
   one page never collide.

   Props:
     className    — sizing/positioning for the SVG mark (e.g. "h-8 w-8").
     withWordmark — when true, renders the mark + bilingual lockup.
---------------------------------------------------------------------------- */

function Mark({ className = "" }) {
  const uid = useId().replace(/:/g, "");
  const amber = `cal-amber-${uid}`;
  const teal = `cal-teal-${uid}`;
  const gloss = `cal-gloss-${uid}`;

  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={amber} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFB264" />
          <stop offset="0.5" stopColor="#FF7A1A" />
          <stop offset="1" stopColor="#E85C00" />
        </linearGradient>
        <linearGradient id={teal} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#3BEAD3" />
          <stop offset="1" stopColor="#12B8A6" />
        </linearGradient>
        <radialGradient id={gloss} cx="0.32" cy="0.2" r="0.95">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.30" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Standard plate — glossy app-icon tile (trust / authority). */}
      <rect x="3" y="3" width="42" height="42" rx="13" fill={`url(#${amber})`} />
      <rect x="3" y="3" width="42" height="42" rx="13" fill={`url(#${gloss})`} />
      <rect
        x="3"
        y="3"
        width="42"
        height="42"
        rx="13"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.18"
        strokeWidth="1.1"
      />

      {/* Gauge bezel — subtle measured ring. */}
      <circle cx="24" cy="24" r="14" fill="none" stroke="#ffffff" strokeOpacity="0.14" strokeWidth="1" />

      {/* Tick marks (gauge dial) — richer when scaled up. */}
      <g stroke="#ffffff" strokeOpacity="0.45" strokeWidth="1.4" strokeLinecap="round">
        <path d="M24 8.5v2.4" />
        <path d="M13.4 12.9l1.7 1.7" />
        <path d="M8.6 23.6h2.4" />
        <path d="M13.4 34.3l1.7-1.7" />
      </g>

      {/* The Cabler "C" — the lit gauge arc, open to the right. */}
      <path
        d="M33 13.4A13 13 0 1 0 33 34.6"
        fill="none"
        stroke="#ffffff"
        strokeWidth="4.4"
        strokeLinecap="round"
      />

      {/* Needle — swept up toward the redline (speed / performance). */}
      <path
        d="M24 24L30.5 15.2"
        fill="none"
        stroke={`url(#${teal})`}
        strokeWidth="3.1"
        strokeLinecap="round"
      />

      {/* Pivot — the warm, moving heart (human pulse). */}
      <circle cx="24" cy="24" r="3.1" fill={`url(#${teal})`} />
      <circle cx="24" cy="24" r="1.3" fill="#ffffff" />
    </svg>
  );
}

export default function BrandLogo({ className = "h-8 w-8", withWordmark = false }) {
  const { lang } = useLang();

  if (!withWordmark) return <Mark className={className} />;

  // Bilingual lockup: Arabic "كابلر" leads in AR, Latin "CABLER" leads in EN.
  const primaryWord = lang === "ar" ? "كابلر" : "CABLER";
  const secondaryWord = lang === "ar" ? "CABLER" : "كابلر";

  return (
    <span className="inline-flex items-center gap-2.5">
      <Mark className={className} />
      <span className="flex min-w-0 flex-col leading-none">
        <span className="font-display text-lg font-bold uppercase tracking-tight text-textPrimary">
          {primaryWord}
        </span>
        <span className="font-sans text-[0.62rem] font-600 uppercase tracking-[0.22em] text-textMuted">
          {secondaryWord}
        </span>
      </span>
    </span>
  );
}
