import { useCatalog } from "../context/CatalogContext";
import { useLang } from "../context/LanguageContext";
import { CATEGORY_LABELS } from "../lib/i18n";

// -----------------------------------------------------------------------------
// Al-Meyar — VisualCategoryBar. An ICON-ONLY, app-like quick filter rail of 7
// CONSISTENT, BRANDED, FLAT illustration SVGs. Each icon maps to a canonical
// catalog category that HAS products; clicking it drives useCatalog().setCategory
// + focusCatalog() so ProductGrid filters instantly. The active icon gets a
// glowing Al-Meyar Orange under-bar. Clicking the active icon resets to "All".
//
// Flat design language: solid fills, simple geometry, NO isometric depth, no
// drop shadows. A shared rounded "tile" backdrop unifies the set; each part is
// drawn with the brand palette (amber primary, teal accent, success, plus a few
// tasteful flat hues). Colors read semantic tokens where it helps dark/light.
//
// NO visible text labels — truth is carried via aria-label/title only (the
// localized CATEGORY_LABELS name for the category each icon actually filters).
//
// Desktop: a centered, evenly-spaced row. Mobile (<768px): a touch-drag
// horizontal carousel. RTL-aware (the flex row mirrors under dir=rtl).
// -----------------------------------------------------------------------------

const STRINGS = {
  en: { aria: "Browse parts by category" },
  ar: { aria: "تصفّح القطع حسب الفئة" },
};

// Brand palette — pulled from semantic tokens so the flat fills stay on-brand
// and recolor with the theme. A couple of tasteful flat hues round out the set.
const C = {
  primary: "rgb(var(--primary))",
  primaryHover: "rgb(var(--primary-hover))",
  accent: "rgb(var(--accent))",
  success: "rgb(var(--success))",
  surface: "rgb(var(--surface))",
  surfaceEl: "rgb(var(--surface-elevated))",
  border: "rgb(var(--border))",
  ink: "rgb(var(--text-primary))",
  muted: "rgb(var(--text-muted))",
};
const C_SLATE = "#5B7186"; // tasteful flat steel-blue
const C_AMBER_SOFT = "rgba(255,122,26,0.18)";
const C_TEAL_SOFT = "rgba(40,224,200,0.18)";

const ICON_PROPS = {
  viewBox: "0 0 64 64",
  className: "h-full w-full",
  "aria-hidden": "true",
  focusable: "false",
};

/* Shared flat rounded-tile backdrop so all 7 illustrations feel like one set. */
function Tile({ tint = C_AMBER_SOFT }) {
  return (
    <rect x="4" y="4" width="56" height="56" rx="16" fill={tint} />
  );
}

// 1) Engine — flat engine block with cam cover + intake stub.
function EngineIcon() {
  return (
    <svg {...ICON_PROPS}>
      <Tile tint={C_AMBER_SOFT} />
      {/* block body */}
      <path
        d="M16 30h20v14a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4V30Z"
        fill={C.primary}
      />
      {/* lower sump */}
      <rect x="20" y="46" width="14" height="5" rx="2.5" fill={C.primaryHover} />
      {/* cam cover top */}
      <rect x="14" y="22" width="24" height="9" rx="3" fill={C.ink} />
      {/* cam bolts */}
      <circle cx="20" cy="26.5" r="1.6" fill={C.accent} />
      <circle cx="32" cy="26.5" r="1.6" fill={C.accent} />
      {/* intake runner */}
      <path
        d="M36 32h7a5 5 0 0 1 5 5v3"
        fill="none"
        stroke={C.accent}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="48" cy="42" r="3.5" fill={C.accent} />
      {/* belt pulley */}
      <circle cx="40" cy="46" r="4" fill={C.ink} />
      <circle cx="40" cy="46" r="1.6" fill={C.surface} />
    </svg>
  );
}

// 2) Axles / Bearings (Drivetrain) — flat driveshaft between two bearing rings.
function AxleIcon() {
  return (
    <svg {...ICON_PROPS}>
      <Tile tint={C_TEAL_SOFT} />
      {/* shaft */}
      <rect x="18" y="29" width="28" height="6" rx="3" fill={C_SLATE} />
      {/* left bearing ring */}
      <circle cx="18" cy="32" r="9" fill={C.accent} />
      <circle cx="18" cy="32" r="4.5" fill={C.surface} />
      <circle cx="18" cy="32" r="2" fill={C.accent} />
      {/* right hub flange */}
      <circle cx="46" cy="32" r="10" fill={C.primary} />
      <circle cx="46" cy="32" r="4.5" fill={C.surface} />
      {/* lug bolts on flange */}
      <circle cx="46" cy="25" r="1.5" fill={C.surface} />
      <circle cx="52" cy="34" r="1.5" fill={C.surface} />
      <circle cx="41" cy="37" r="1.5" fill={C.surface} />
    </svg>
  );
}

// 3) Cooling / AC — flat radiator core with fins + coolant drop.
function CoolingIcon() {
  return (
    <svg {...ICON_PROPS}>
      <Tile tint={C_TEAL_SOFT} />
      {/* radiator tank */}
      <rect x="14" y="16" width="30" height="32" rx="4" fill={C.accent} />
      {/* fin slats */}
      <rect x="18" y="21" width="22" height="3" rx="1.5" fill={C.surface} opacity="0.85" />
      <rect x="18" y="27" width="22" height="3" rx="1.5" fill={C.surface} opacity="0.85" />
      <rect x="18" y="33" width="22" height="3" rx="1.5" fill={C.surface} opacity="0.85" />
      <rect x="18" y="39" width="22" height="3" rx="1.5" fill={C.surface} opacity="0.85" />
      {/* filler cap */}
      <rect x="20" y="12" width="8" height="6" rx="2" fill={C.ink} />
      {/* coolant drop */}
      <path d="M50 30c2.4 3 4 5.2 4 7.2a4 4 0 0 1-8 0c0-2 1.6-4.2 4-7.2Z" fill={C.primary} />
    </svg>
  );
}

// 4) Body / Hood (Lighting) — flat headlight with beam rays.
function BodyIcon() {
  return (
    <svg {...ICON_PROPS}>
      <Tile tint={C_AMBER_SOFT} />
      {/* headlight housing (D-shape) */}
      <path
        d="M16 18h8a14 14 0 0 1 0 28h-8a3 3 0 0 1-3-3V21a3 3 0 0 1 3-3Z"
        fill={C.ink}
      />
      {/* lens */}
      <circle cx="24" cy="32" r="11" fill={C.primary} />
      <circle cx="24" cy="32" r="5" fill={C.surface} opacity="0.92" />
      {/* beam rays */}
      <path
        d="M40 25h12M40 32h14M40 39h12"
        stroke={C.accent}
        strokeWidth="3.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

// 5) Bumpers / Grille (Braking) — flat brake disc + amber caliper.
function BrakeIcon() {
  return (
    <svg {...ICON_PROPS}>
      <Tile tint={C_AMBER_SOFT} />
      {/* disc */}
      <circle cx="30" cy="32" r="17" fill={C_SLATE} />
      <circle cx="30" cy="32" r="17" fill="none" stroke={C.surface} strokeWidth="2" opacity="0.5" />
      {/* hub */}
      <circle cx="30" cy="32" r="6.5" fill={C.ink} />
      <circle cx="30" cy="32" r="2.4" fill={C.surface} />
      {/* vent holes */}
      <circle cx="30" cy="20" r="1.8" fill={C.surface} opacity="0.8" />
      <circle cx="41" cy="28" r="1.8" fill={C.surface} opacity="0.8" />
      <circle cx="37" cy="41" r="1.8" fill={C.surface} opacity="0.8" />
      <circle cx="23" cy="41" r="1.8" fill={C.surface} opacity="0.8" />
      <circle cx="19" cy="28" r="1.8" fill={C.surface} opacity="0.8" />
      {/* caliper clamp */}
      <path
        d="M40 19a6 6 0 0 1 6 6v14a6 6 0 0 1-6 6h-3V19h3Z"
        fill={C.primary}
      />
      <rect x="36" y="26" width="3" height="12" rx="1.5" fill={C.primaryHover} />
    </svg>
  );
}

// 6) Suspension / Shocks — flat coil-over strut.
function SuspensionIcon() {
  return (
    <svg {...ICON_PROPS}>
      <Tile tint={C_TEAL_SOFT} />
      {/* top mount plate */}
      <rect x="22" y="12" width="20" height="6" rx="3" fill={C.ink} />
      {/* piston rod */}
      <rect x="30" y="16" width="4" height="8" rx="2" fill={C_SLATE} />
      {/* coil spring (zig) */}
      <path
        d="M22 24h20M24 29h16M22 34h20M24 39h16M22 44h20"
        stroke={C.accent}
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      {/* shock body behind */}
      <rect x="27" y="24" width="10" height="22" rx="5" fill={C.primary} opacity="0.22" />
      {/* bottom mount eye */}
      <circle cx="32" cy="50" r="6" fill={C.primary} />
      <circle cx="32" cy="50" r="2.4" fill={C.surface} />
    </svg>
  );
}

// 7) Spark Plugs / Filters (Filtration) — flat oil filter canister with pleats.
function FilterIcon() {
  return (
    <svg {...ICON_PROPS}>
      <Tile tint={C_AMBER_SOFT} />
      {/* canister body */}
      <rect x="20" y="20" width="24" height="28" rx="6" fill={C.primary} />
      {/* top cap */}
      <rect x="24" y="14" width="16" height="8" rx="3" fill={C.ink} />
      {/* pleat lines */}
      <path
        d="M25 24v20M30 24v20M34 24v20M39 24v20"
        stroke={C.surface}
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.65"
      />
      {/* base ring */}
      <rect x="22" y="44" width="20" height="5" rx="2.5" fill={C.accent} />
    </svg>
  );
}

// Each slot maps an icon to the canonical category it truthfully filters.
const SLOTS = [
  { key: "Engine", category: "Engine", Icon: EngineIcon },
  { key: "Drivetrain", category: "Drivetrain", Icon: AxleIcon },
  { key: "Cooling", category: "Cooling", Icon: CoolingIcon },
  { key: "Lighting", category: "Lighting", Icon: BodyIcon },
  { key: "Braking", category: "Braking", Icon: BrakeIcon },
  { key: "Suspension", category: "Suspension", Icon: SuspensionIcon },
  { key: "Filtration", category: "Filtration", Icon: FilterIcon },
];

export default function VisualCategoryBar() {
  const { category, setCategory, focusCatalog } = useCatalog();
  const { lang } = useLang();
  const tx = STRINGS[lang] || STRINGS.en;

  const handleClick = (cat) => {
    // Toggle: clicking the already-active icon deselects back to "All".
    setCategory(category === cat ? "All" : cat);
    focusCatalog();
  };

  return (
    <section
      aria-label={tx.aria}
      className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:px-8"
    >
      <div
        role="group"
        aria-label={tx.aria}
        className="flex flex-nowrap items-center gap-4 overflow-x-auto scrollbar-hide py-2 md:justify-center"
      >
        {SLOTS.map(({ key, category: cat, Icon }) => {
          const active = category === cat;
          const label =
            (CATEGORY_LABELS[cat] && CATEGORY_LABELS[cat][lang]) || cat;
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleClick(cat)}
              title={label}
              aria-label={label}
              aria-pressed={active}
              className={
                "group relative flex min-w-[4.75rem] shrink-0 flex-col items-center justify-start rounded-2xl border p-2 transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg motion-reduce:transition-none sm:min-w-[5.25rem] " +
                (active
                  ? "border-primary/40 bg-surfaceElevated"
                  : "border-transparent hover:-translate-y-0.5 hover:bg-surface motion-reduce:hover:translate-y-0")
              }
            >
              <span className="flex h-12 w-12 items-center justify-center transition-transform duration-300 ease-out group-hover:scale-105 motion-reduce:transform-none sm:h-14 sm:w-14">
                <Icon />
              </span>
              {/* Text label under every icon — icons alone are ambiguous for
                  navigation, so the localized category name is always shown. */}
              <span
                className={
                  "mt-1.5 w-full text-center text-[11px] font-600 leading-tight transition-colors duration-300 sm:text-xs " +
                  (active ? "text-primary" : "text-textSecondary")
                }
              >
                {label}
              </span>
              {/* glowing orange bottom accent under-bar (active only) */}
              <span
                aria-hidden="true"
                className={
                  "mt-1 h-1 rounded-full bg-primary transition-all duration-300 ease-out " +
                  (active
                    ? "w-8 opacity-100 shadow-glow drop-shadow-[0_0_8px_rgb(var(--primary))]"
                    : "w-0 opacity-0")
                }
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}
