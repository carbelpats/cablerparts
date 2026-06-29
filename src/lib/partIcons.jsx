// -----------------------------------------------------------------------------
// Al-Meyar — shared auto-part icon map. Each entry renders inside a
// "0 0 100 100" viewBox and uses stroke="currentColor" so an accent-themed
// panel can tint it. Stroke-based for a machined, blueprint feel consistent
// with the spec-sheet aesthetic. Moved out of ProductCard so every surface
// (cards, modal gallery, related products) shares the exact same artwork.
// -----------------------------------------------------------------------------

/**
 * Icon-key -> SVG <g> children for a "0 0 100 100" viewBox.
 * Keys: brake, filter, spark, battery, suspension, belt, pump, light, tire,
 * exhaust.
 */
export const PART_ICONS = {
  brake: (
    <g fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
      <circle cx="50" cy="50" r="30" />
      <circle cx="50" cy="50" r="13" />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <line
            key={i}
            x1={50 + Math.cos(a) * 16}
            y1={50 + Math.sin(a) * 16}
            x2={50 + Math.cos(a) * 28}
            y2={50 + Math.sin(a) * 28}
          />
        );
      })}
      <path d="M64 30a30 30 0 0 1 0 40" strokeWidth="6" opacity="0.55" />
    </g>
  ),
  filter: (
    <g fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round">
      <path d="M26 26h48l-6 10v34l-12 8V44l-12-8z" />
      <path d="M40 30v8M50 30v10M60 30v8" strokeWidth="2.5" opacity="0.6" />
    </g>
  ),
  spark: (
    <g fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
      <path d="M50 16v18" />
      <rect x="42" y="34" width="16" height="14" rx="2" />
      <path d="M44 48h12l-2 10h-8z" />
      <path d="M48 58l6 14-10-6h8" strokeLinejoin="round" />
      <path d="M44 26h12M44 30h12" strokeWidth="2" opacity="0.6" />
    </g>
  ),
  battery: (
    <g fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round">
      <rect x="22" y="34" width="56" height="36" rx="4" />
      <path d="M34 34v-6h10v6M56 34v-6h10v6" />
      <path d="M38 52h10M43 47v10" strokeLinecap="round" />
      <path d="M58 52h10" strokeLinecap="round" />
    </g>
  ),
  suspension: (
    <g fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
      <line x1="50" y1="18" x2="50" y2="28" />
      <circle cx="50" cy="20" r="4" />
      <path d="M40 30h20M40 76h20" />
      <path d="M44 30c0 6 12 6 12 12s-12 6-12 12 12 6 12 12-12 6-12 10" />
    </g>
  ),
  belt: (
    <g fill="none" stroke="currentColor" strokeWidth="3.5">
      <circle cx="36" cy="50" r="18" />
      <circle cx="66" cy="50" r="10" />
      <path d="M36 32a18 18 0 0 1 0 36M66 40a10 10 0 0 1 0 20" strokeWidth="6" opacity="0.5" strokeLinecap="round" />
      <circle cx="36" cy="50" r="5" />
      <circle cx="66" cy="50" r="3" />
    </g>
  ),
  pump: (
    <g fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round">
      <circle cx="48" cy="52" r="22" />
      <path d="M48 30v44M30 52h36" opacity="0.45" />
      <path d="M70 38l12-8v44l-12-8z" />
      <circle cx="48" cy="52" r="6" />
    </g>
  ),
  light: (
    <g fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
      <path d="M30 36a24 22 0 0 1 0 28h14c10 0 16-6 16-14s-6-14-16-14z" />
      <path d="M64 44h14M64 50h16M64 56h14" />
    </g>
  ),
  tire: (
    <g fill="none" stroke="currentColor" strokeWidth="3.5">
      <circle cx="50" cy="50" r="30" />
      <circle cx="50" cy="50" r="14" />
      <circle cx="50" cy="50" r="5" />
      {Array.from({ length: 6 }).map((_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <line
            key={i}
            x1={50 + Math.cos(a) * 14}
            y1={50 + Math.sin(a) * 14}
            x2={50 + Math.cos(a) * 30}
            y2={50 + Math.sin(a) * 30}
            strokeWidth="2.5"
            opacity="0.6"
          />
        );
      })}
    </g>
  ),
  exhaust: (
    <g fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round">
      <path d="M22 44h28l10 6h18v12H60l-10 6H22z" />
      <ellipse cx="74" cy="56" rx="4" ry="6" />
      <path d="M30 44v18M40 44v18" strokeWidth="2" opacity="0.5" />
    </g>
  ),
  engine: (
    <g fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M26 44h22v24a4 4 0 0 1-4 4H30a4 4 0 0 1-4-4z" />
      <rect x="24" y="34" width="26" height="10" rx="2" />
      <path d="M48 50h10a6 6 0 0 1 6 6v8" />
      <circle cx="64" cy="68" r="6" />
      <path d="M53 60h13" strokeWidth="2.5" opacity="0.55" />
      <circle cx="31" cy="39" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="43" cy="39" r="1.6" fill="currentColor" stroke="none" />
    </g>
  ),
  drivetrain: (
    <g fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="30" y1="50" x2="70" y2="50" strokeWidth="6" />
      <circle cx="28" cy="50" r="11" />
      <circle cx="28" cy="50" r="3.5" />
      <circle cx="72" cy="50" r="13" />
      <circle cx="72" cy="50" r="4" />
      <circle cx="72" cy="40" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="81" cy="53" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="65" cy="58" r="1.7" fill="currentColor" stroke="none" />
    </g>
  ),
  cooling: (
    <g fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="24" y="26" width="38" height="44" rx="4" />
      <path d="M31 34v28M40 34v28M49 34v28" strokeWidth="2.5" opacity="0.6" />
      <path d="M31 22h10" />
      <path d="M74 45c3 4 5.5 6.5 5.5 9.2a5.5 5.5 0 0 1-11 0c0-2.7 2.5-5.2 5.5-9.2z" />
    </g>
  ),
};

/**
 * Storefront category -> representative PART_ICONS key, so the category bar
 * and product cards share the exact same artwork (one source of truth).
 */
export const CATEGORY_ICON = {
  Braking: "brake",
  Suspension: "suspension",
  Engine: "engine",
  Filtration: "filter",
  Electrical: "battery",
  Lighting: "light",
  Drivetrain: "drivetrain",
  Exhaust: "exhaust",
  Cooling: "cooling",
  Tires: "tire",
};

/**
 * Tailwind gradient + text class strings keyed by product.accent.
 * Used as the accent-themed panel behind a PartIcon.
 */
export const ACCENT_GRADIENT = {
  primary: "from-primary/25 via-primary/10 to-surfaceElevated text-primary",
  accent: "from-accent/25 via-accent/10 to-surfaceElevated text-accent",
  success: "from-success/25 via-success/10 to-surfaceElevated text-success",
};

/**
 * Render a part icon in a "0 0 100 100" SVG.
 * Falls back to the brake icon for unknown keys.
 * @param {{ icon: string, className?: string }} props
 */
export function PartIcon({ icon, className }) {
  return (
    <svg viewBox="0 0 100 100" className={className}>
      {PART_ICONS[icon] || PART_ICONS.brake}
    </svg>
  );
}
