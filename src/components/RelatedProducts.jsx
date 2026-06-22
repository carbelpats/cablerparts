import { useMemo } from "react";
import { Star, ArrowRight } from "lucide-react";
import { PartIcon, ACCENT_GRADIENT } from "../lib/partIcons";
import { useLang } from "../context/LanguageContext";
import { useGeo } from "../context/GeoContext";
import { useProductModal } from "../context/ProductModalContext";
import { useProducts } from "../context/ProductsContext";

// -----------------------------------------------------------------------------
// Al-Meyar — RelatedProducts recommendation rail.
//
// A lightweight, deterministic recommendation engine scored over PRODUCTS:
//   same category .............. +3   (the strongest "complete the job" signal)
//   shared fitment make ........ +2 each (it physically fits the same cars)
//   price within ~40% .......... +1   (keeps suggestions in the same tier)
// Self is excluded; the top 4 by score (then rating as tiebreak) render as
// compact, fully clickable tiles that open the product modal.
//
// Psychology executed:
//   - Cross-sell / basket-building: the heading frames these as parts that go
//     together ("Frequently bought together"), nudging multi-item carts.
//   - Authority/anchoring: each tile keeps the star rating + review weight so a
//     recommendation arrives pre-validated by social proof.
//   - Choice architecture: exactly 4 curated tiles — enough to feel like a
//     considered set, few enough to avoid decision fatigue.
// -----------------------------------------------------------------------------

const STRINGS = {
  en: {
    heading: "Frequently bought together",
    sub: "Hand-picked parts that pair well with this one",
    reviews: "reviews",
    view: "View",
  },
  ar: {
    heading: "يُشترى عادةً مع هذا المنتج",
    sub: "قطع مختارة بعناية تتكامل مع هذه القطعة",
    reviews: "تقييم",
    view: "عرض",
  },
};

function CompactStars({ rating }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="flex items-center gap-0.5" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < full;
        const isHalf = i === full && half;
        return (
          <Star
            key={i}
            className={
              "h-3 w-3 " +
              (filled || isHalf ? "fill-warning text-warning" : "text-border")
            }
            strokeWidth={1.5}
          />
        );
      })}
    </span>
  );
}

/**
 * Score a candidate product against the anchor product per the contract rules.
 */
function scoreCandidate(anchor, candidate) {
  let score = 0;
  // same category — strongest signal that they belong to the same job
  if (candidate.category === anchor.category) score += 3;
  // shared fitment make — physically fits the same vehicles
  const anchorMakes = new Set(anchor.fitment || []);
  for (const make of candidate.fitment || []) {
    if (anchorMakes.has(make)) score += 2;
  }
  // price within ~40% — keeps the same value tier
  const base = anchor.priceUSD;
  if (base > 0) {
    const diff = Math.abs(candidate.priceUSD - base) / base;
    if (diff <= 0.4) score += 1;
  }
  return score;
}

export default function RelatedProducts({ product }) {
  const { lang } = useLang();
  const { format } = useGeo();
  const { openProduct } = useProductModal();
  const { products } = useProducts();
  const tx = STRINGS[lang] || STRINGS.en;

  const related = useMemo(() => {
    if (!product) return [];
    return (products || [])
      .filter((p) => p.id !== product.id)
      .map((p) => ({ p, score: scoreCandidate(product, p) }))
      // keep only genuinely relevant candidates
      .filter((x) => x.score > 0)
      // highest score first; rating then review count break ties so the most
      // socially-proven option floats up
      .sort(
        (a, b) =>
          b.score - a.score ||
          b.p.rating - a.p.rating ||
          b.p.reviews - a.p.reviews
      )
      .slice(0, 4)
      .map((x) => x.p);
  }, [product, products]);

  if (!product || related.length === 0) return null;

  return (
    <section
      aria-labelledby="related-heading"
      className="mt-10 border-t border-border pt-8"
    >
      <header className="mb-5">
        <h2
          id="related-heading"
          className="font-display text-lg font-700 text-textPrimary sm:text-xl"
        >
          {tx.heading}
        </h2>
        <p className="mt-1 text-sm text-textSecondary">{tx.sub}</p>
      </header>

      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {related.map((p) => {
          const accent = ACCENT_GRADIENT[p.accent] || ACCENT_GRADIENT.primary;
          const name = lang === "ar" ? p.nameAr || p.name : p.name;
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => openProduct(p)}
                aria-label={name}
                className="group flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-surface text-start shadow-elevated transition-all duration-300 ease-out hover:-translate-y-1 hover:border-primary/30 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg motion-reduce:transform-none motion-reduce:transition-none"
              >
                {/* thumb */}
                <div
                  className={
                    "relative aspect-[5/4] overflow-hidden bg-gradient-to-br " +
                    accent
                  }
                >
                  <div
                    className="pointer-events-none absolute inset-0 opacity-[0.07]"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(135deg, currentColor 0 1px, transparent 1px 11px)",
                    }}
                    aria-hidden="true"
                  />
                  <PartIcon
                    icon={p.icon}
                    className="absolute inset-0 m-auto h-3/5 w-3/5 drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)] transition-transform duration-500 ease-out group-hover:scale-110 group-hover:-rotate-3 motion-reduce:transform-none"
                  />
                </div>

                {/* info */}
                <div className="flex flex-1 flex-col gap-1.5 p-3">
                  <span className="truncate font-mono text-[10px] uppercase tracking-wider text-textMuted">
                    {p.brand}
                  </span>
                  <h3 className="line-clamp-2 font-display text-sm font-600 leading-snug text-textPrimary">
                    {name}
                  </h3>

                  <div className="flex items-center gap-1.5">
                    <CompactStars rating={p.rating} />
                    <span className="font-mono text-[11px] tabular-nums text-textSecondary">
                      {p.rating.toFixed(1)}
                    </span>
                    <span className="truncate text-[11px] text-textMuted">
                      ({p.reviews} {tx.reviews})
                    </span>
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                    <span className="font-display text-base font-700 tabular-nums text-textPrimary">
                      {format(p.priceUSD)}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-600 text-primary transition-transform duration-300 group-hover:gap-1.5">
                      {tx.view}
                      <ArrowRight
                        className="h-3.5 w-3.5 rtl:-scale-x-100"
                        strokeWidth={2.5}
                      />
                    </span>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
