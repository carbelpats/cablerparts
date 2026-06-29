import { useEffect, useRef, useState } from "react";
import {
  ShieldCheck,
  BadgeCheck,
  Truck,
  Award,
  ArrowRight,
  Wrench,
  Star,
  Banknote,
} from "lucide-react";
import { useGarage } from "../context/GarageContext";
import { useLang } from "../context/LanguageContext";
import { useSettings } from "../context/SettingsContext";
import BrandLogo from "./BrandLogo";

/* Smooth-scroll helper that respects reduced motion. */
function scrollToId(id) {
  if (typeof document === "undefined") return;
  const el = document.getElementById(id);
  if (!el) return;
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({
    behavior: prefersReduced ? "auto" : "smooth",
    block: "start",
  });
}

/* ---------------------------------------------------------------------------
   Local copy — per project convention each component carries its own STRINGS.
   Trust chips & stats are keyed so icons/structure stay language-agnostic.
--------------------------------------------------------------------------- */
const STRINGS = {
  en: {
    eyebrowDefault: "GCC-Trusted Auto Parts",
    eyebrowGarage: "Garage active",
    // headline (default)
    headLeadA: "The ",
    headStandard: "Standard",
    headLeadB: " in engineered performance parts",
    // headline (personalized — vehicle span injected between)
    headFitA: "Precision-matched parts for your ",
    headFitB: "",
    subDefault:
      "OEM-grade Chinese auto parts, built to factory spec and delivered across the Gulf. Build your Garage once — then shop only what fits, with confidence.",
    subFit:
      "Every component below is matched to your build — correct fitment, OEM-grade tolerances, and a 2-year warranty. Browse parts that fit your car.",
    ctaShop: "Shop your parts",
    ctaBuildGarage: "Build your Garage",
    ctaManageGarage: "Manage your Garage",
    trust: {
      standard: "OEM-Grade Standard",
      warranty: "2-Year Warranty",
      cod: "Cash on Delivery",
      delivery: "Fast GCC Delivery",
    },
    stats: {
      makes: "Chinese makes",
      warranty: "Yr warranty",
      markets: "GCC markets",
    },
  },
  ar: {
    eyebrowDefault: "قطع غيار موثوقة في الخليج",
    eyebrowGarage: "المرآب مُفعّل",
    // headline (default)
    headLeadA: "",
    headStandard: "المرجع",
    headLeadB: " في قطع الأداء المُهندَسة",
    // headline (personalized) — "قطع متطابقة بدقة مع {vehicle}"
    headFitA: "قطع متطابقة بدقة مع ",
    headFitB: "",
    subDefault:
      "قطع غيار صينية بجودة الوكالة، مصنوعة وفق مواصفات المصنع وتُشحن في أنحاء الخليج. أنشئ مرآبك مرة واحدة، ثم تسوّق ما يناسب سيارتك فقط، بكل ثقة.",
    subFit:
      "كل قطعة بالأسفل مطابَقة مع مواصفات سيارتك — توافق صحيح، وتفاوتات بجودة الوكالة، وضمان لمدة سنتين. تصفّح القطع المطابقة لسيارتك.",
    ctaShop: "تسوّق قطع سيارتك",
    ctaBuildGarage: "أنشئ مرآبك",
    ctaManageGarage: "إدارة المرآب",
    trust: {
      standard: "معيار جودة الوكالة",
      warranty: "ضمان سنتين",
      cod: "الدفع عند الاستلام",
      delivery: "توصيل سريع في الخليج",
    },
    stats: {
      makes: "ماركات صينية",
      warranty: "سنوات ضمان",
      markets: "أسواق خليجية",
    },
  },
};

const TRUST_SIGNALS = [
  { key: "standard", icon: ShieldCheck },
  { key: "warranty", icon: Award },
  { key: "cod", icon: Banknote },
  { key: "delivery", icon: Truck },
];

const STATS = [
  { key: "makes", value: "8" },
  { key: "warranty", value: "2" },
  { key: "markets", value: "6" },
];

/* Floating brake-disc silhouette — the "instrument" hero object. */
function HeroPart() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative mx-auto aspect-square w-[18rem] max-w-full sm:w-[22rem] lg:w-[26rem]"
    >
      {/* Radial backlight glow behind the disc */}
      <div className="absolute inset-0 rounded-full bg-primary/20 blur-3xl motion-safe:animate-glow-pulse" />
      <div className="absolute inset-8 rounded-full bg-accent/10 blur-2xl" />

      <div className="relative h-full w-full motion-safe:animate-float">
        <svg
          viewBox="0 0 200 200"
          className="h-full w-full drop-shadow-[0_18px_40px_rgba(0,0,0,0.55)]"
          fill="none"
        >
          <defs>
            <linearGradient id="hero-disc" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgb(var(--surface-elevated))" />
              <stop offset="100%" stopColor="rgb(var(--surface))" />
            </linearGradient>
            <radialGradient id="hero-hub" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgb(var(--primary))" stopOpacity="0.9" />
              <stop offset="70%" stopColor="rgb(var(--primary))" stopOpacity="0.25" />
              <stop offset="100%" stopColor="rgb(var(--primary))" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Outer rotor ring */}
          <circle
            cx="100"
            cy="100"
            r="92"
            fill="url(#hero-disc)"
            stroke="rgb(var(--border))"
            strokeWidth="2"
          />
          <circle
            cx="100"
            cy="100"
            r="92"
            fill="none"
            stroke="rgb(var(--primary))"
            strokeOpacity="0.35"
            strokeWidth="1.5"
            strokeDasharray="3 7"
          />
          {/* Drilled / vented holes around the rotor */}
          {Array.from({ length: 24 }).map((_, i) => {
            const a = (i / 24) * Math.PI * 2;
            const x = 100 + Math.cos(a) * 70;
            const y = 100 + Math.sin(a) * 70;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="3.4"
                fill="rgb(var(--bg))"
                stroke="rgb(var(--border))"
                strokeWidth="0.8"
              />
            );
          })}
          {/* Inner machined band */}
          <circle
            cx="100"
            cy="100"
            r="48"
            fill="none"
            stroke="rgb(var(--border))"
            strokeWidth="6"
          />
          {/* Hub glow */}
          <circle cx="100" cy="100" r="40" fill="url(#hero-hub)" />
          {/* Lug bolts */}
          {Array.from({ length: 5 }).map((_, i) => {
            const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
            const x = 100 + Math.cos(a) * 24;
            const y = 100 + Math.sin(a) * 24;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="4.5"
                fill="rgb(var(--text-muted))"
              />
            );
          })}
          <circle cx="100" cy="100" r="8" fill="rgb(var(--primary))" />
        </svg>
      </div>
    </div>
  );
}

/* Brand logo as the hero "instrument" — used when the CMS opts in
   (settings.brand.useLogoInHero && a logoUrl is set). Mirrors HeroPart's
   floating glow framing so the hero composition stays balanced. */
function HeroLogo({ src, alt }) {
  return (
    <div
      className="pointer-events-none relative mx-auto aspect-square w-[18rem] max-w-full sm:w-[22rem] lg:w-[26rem]"
    >
      {/* Radial backlight glow behind the logo */}
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-full bg-primary/20 blur-3xl motion-safe:animate-glow-pulse"
      />
      <div
        aria-hidden="true"
        className="absolute inset-8 rounded-full bg-accent/10 blur-2xl"
      />
      <div className="relative grid h-full w-full place-items-center motion-safe:animate-float">
        <img
          src={src}
          alt={alt}
          className="max-h-full max-w-full object-contain drop-shadow-[0_18px_40px_rgba(0,0,0,0.55)]"
        />
      </div>
    </div>
  );
}

/* Brand showcase — the redesigned Cabler mark PROMOTED as the hero's visual
   centerpiece: it sits at the heart of the dimmed instrument, floating under a
   backlit glow, so the brand mark is the deliberate first impression. */
function HeroBrandShowcase() {
  return (
    <div className="pointer-events-none relative mx-auto aspect-square w-[18rem] max-w-full sm:w-[22rem] lg:w-[26rem]">
      {/* Dimmed brake-disc instrument as a calm backdrop ring */}
      <div aria-hidden="true" className="absolute inset-0 scale-[1.03] opacity-25">
        <HeroPart />
      </div>
      {/* Soft vignette to seat the mark cleanly over the disc */}
      <div
        aria-hidden="true"
        className="absolute inset-[27%] rounded-[2rem] bg-bg/55 blur-2xl"
      />
      {/* The promoted Cabler mark — centered, floating, sharp */}
      <div className="absolute inset-0 grid place-items-center">
        <BrandLogo className="h-32 w-32 drop-shadow-[0_24px_60px_rgba(0,0,0,0.55)] motion-safe:animate-float sm:h-40 sm:w-40 lg:h-48 lg:w-48" />
      </div>
    </div>
  );
}

export default function Hero() {
  const { vehicle, hasVehicle } = useGarage();
  const { lang } = useLang();
  const { settings } = useSettings();
  const tx = STRINGS[lang];

  const brand = settings?.brand || {};
  const useLogo = Boolean(brand.useLogoInHero && brand.logoUrl);
  const logoAlt =
    (brand.tagline && brand.tagline[lang]) || "Cabler Parts";
  const rootRef = useRef(null);
  const [shown, setShown] = useState(false);

  /* One-shot reveal on mount (also covers reduced-motion via CSS). */
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setShown(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  /* Endowment-aware vehicle label. The make/model stay latin (brand names);
     year is grouped naturally with the make/model in both directions. */
  const vehicleLabel = hasVehicle
    ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
    : "";

  const headline = hasVehicle ? (
    <>
      {tx.headFitA}
      <span className="text-primary" dir="ltr">
        {vehicleLabel}
      </span>
      {tx.headFitB}
    </>
  ) : (
    <>
      {tx.headLeadA}
      <span className="text-primary">{tx.headStandard}</span>
      {tx.headLeadB}
    </>
  );

  const subheadline = hasVehicle ? tx.subFit : tx.subDefault;

  return (
    <section
      ref={rootRef}
      id="hero"
      aria-labelledby="hero-heading"
      className="relative isolate overflow-hidden bg-bg"
    >
      {/* ---- Layered animated background ---- */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        {/* Aurora / gradient mesh */}
        <div className="absolute -left-1/4 -top-1/3 h-[60rem] w-[60rem] rounded-full bg-primary/20 blur-[120px] motion-safe:animate-glow-pulse" />
        <div className="absolute -right-1/4 top-1/4 h-[48rem] w-[48rem] rounded-full bg-accent/15 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-[36rem] w-[36rem] rounded-full bg-primary/10 blur-[120px]" />

        {/* Faint engineering grid */}
        <div
          className="absolute inset-0 opacity-[0.55]"
          style={{
            backgroundImage:
              "linear-gradient(rgb(var(--border) / 0.18) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--border) / 0.18) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage:
              "radial-gradient(ellipse 80% 70% at 50% 35%, black 35%, transparent 85%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 70% at 50% 35%, black 35%, transparent 85%)",
          }}
        />

        {/* Diagonal speed-hatch accent */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(115deg, rgb(var(--primary)) 0 1px, transparent 1px 14px)",
          }}
        />

        {/* Bottom fade into page */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg" />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 sm:py-24 lg:grid-cols-2 lg:gap-8 lg:py-28">
        {/* ---- Copy column ---- */}
        <div
          className={`order-2 text-center lg:order-1 lg:text-start ${
            shown ? "motion-safe:animate-fade-up" : "opacity-0 motion-reduce:opacity-100"
          }`}
        >
          {/* Eyebrow / Garage state pill */}
          {hasVehicle ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 font-mono text-[0.7rem] uppercase tracking-widest text-accent shadow-glow-accent">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-accent motion-safe:animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
              </span>
              {tx.eyebrowGarage}
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-[0.7rem] uppercase tracking-widest text-primary">
              <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
              {tx.eyebrowDefault}
            </span>
          )}

          <h1
            id="hero-heading"
            className="mt-5 font-display text-4xl font-700 leading-[1.05] tracking-tight text-textPrimary text-balance sm:text-5xl lg:text-6xl"
          >
            {headline}
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-textSecondary text-balance sm:text-lg lg:mx-0">
            {subheadline}
          </p>

          {/* ---- CTAs ---- */}
          <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-start">
            <button
              type="button"
              onClick={() => scrollToId("catalog")}
              className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary px-6 py-3.5 font-display text-base font-600 text-bg shadow-glow transition-all duration-300 hover:bg-primaryHover hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg motion-safe:active:scale-[0.98]"
            >
              {/* Molten sweep — mirrors with text direction so it travels inline-end */}
              <span
                aria-hidden="true"
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-500 ease-out group-hover:translate-x-full rtl:bg-gradient-to-l"
              />
              <span className="relative">{tx.ctaShop}</span>
              <ArrowRight
                aria-hidden="true"
                className="relative h-5 w-5 transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1"
              />
            </button>

            <button
              type="button"
              onClick={() => scrollToId("garage")}
              className="group inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface/60 px-6 py-3.5 font-display text-base font-600 text-textPrimary backdrop-blur transition-all duration-300 hover:border-accent/50 hover:bg-surfaceElevated hover:shadow-glow-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg motion-safe:active:scale-[0.98]"
            >
              <Wrench
                aria-hidden="true"
                className="h-5 w-5 text-accent transition-transform duration-300 group-hover:-rotate-12"
              />
              {hasVehicle ? tx.ctaManageGarage : tx.ctaBuildGarage}
            </button>
          </div>

          {/* ---- Trust chips ---- */}
          <ul className="mt-9 flex flex-wrap items-center justify-center gap-2.5 lg:justify-start">
            {TRUST_SIGNALS.map(({ icon: Icon, key }, i) => {
              const label = tx.trust[key];
              return (
                <li
                  key={key}
                  className={`inline-flex items-center gap-2 rounded-lg border border-border bg-surface/50 px-3 py-1.5 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-surfaceElevated ${
                    shown ? "motion-safe:animate-fade-up" : ""
                  }`}
                  style={shown ? { animationDelay: `${120 + i * 40}ms` } : undefined}
                >
                  <Icon
                    className="h-4 w-4 shrink-0 text-accent"
                    aria-hidden="true"
                  />
                  <span className="text-xs font-500 text-textSecondary">
                    {label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* ---- Visual column: hero part + stat strip ---- */}
        <div className="order-1 lg:order-2">
          <div
            className={
              shown
                ? "motion-safe:animate-garage-open"
                : "opacity-0 motion-reduce:opacity-100"
            }
          >
            {useLogo ? (
              <HeroLogo src={brand.logoUrl} alt={logoAlt} />
            ) : (
              <HeroBrandShowcase />
            )}
          </div>

          {/* Stat strip */}
          <dl className="mx-auto mt-2 grid max-w-md grid-cols-3 divide-x divide-border rounded-2xl border border-border bg-surface/60 p-4 shadow-elevated backdrop-blur sm:mt-4">
            {STATS.map(({ value, key, star }, i) => {
              const label = tx.stats[key];
              return (
                <div key={key} className="px-2 text-center">
                  <dt className="sr-only">{label}</dt>
                  <dd>
                    <span
                      className={`flex items-center justify-center gap-1 font-mono text-xl font-700 tabular-nums text-textPrimary sm:text-2xl ${
                        shown ? "motion-safe:animate-count-up" : ""
                      }`}
                      style={
                        shown ? { animationDelay: `${200 + i * 80}ms` } : undefined
                      }
                      dir="ltr"
                    >
                      {star && (
                        <Star
                          className="h-4 w-4 fill-warning text-warning"
                          aria-hidden="true"
                        />
                      )}
                      {value}
                    </span>
                    <span className="mt-1 block text-[0.7rem] font-500 uppercase tracking-wide text-textMuted">
                      {label}
                    </span>
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      </div>
    </section>
  );
}
