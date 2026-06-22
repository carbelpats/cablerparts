import { useEffect, useState } from "react";
import {
  ShieldCheck,
  BadgeCheck,
  Award,
  Lock,
  Truck,
  Wrench,
  Star,
  CheckCircle2,
  MapPin,
} from "lucide-react";
import { useLang } from "../context/LanguageContext";

/* -------------------------------------------------------------------------- */
/*  Static data — no Date.now / Math.random anywhere (deterministic).         */
/*  All copy localized via the local STRINGS object per project convention.   */
/* -------------------------------------------------------------------------- */

const STRINGS = {
  en: {
    sectionLabel: "Trust signals and recent activity",
    badgesLabel: "Certifications and guarantees",
    live: "Live",
    verified: "Verified",
    // Certification chips (keyed for stable React keys + AR pairing)
    badges: {
      iso: "ISO 9001 Certified",
      oem: "OEM-Grade",
      authentic: "Authenticity Verified",
      warranty: "2-Yr Warranty",
      payment: "Secure Payment",
      delivery: "GCC-Wide Delivery",
    },
    // {name} {city} {action} are assembled left-to-right
    activity: [
      { name: "Khalid", city: "Riyadh", action: "secured a Brake Kit" },
      { name: "Fatima", city: "Dubai", action: "verified fitment on a Patrol" },
      { name: "Yousef", city: "Doha", action: "added Spark Plugs to the Garage" },
      { name: "Noura", city: "Kuwait City", action: "completed a Suspension order" },
      { name: "Omar", city: "Dammam", action: "claimed guaranteed-fit pricing" },
      { name: "Layla", city: "Manama", action: "reserved an Oil Filter" },
      { name: "Saif", city: "Muscat", action: "confirmed an OEM Belt fit" },
      { name: "Mariam", city: "Abu Dhabi", action: "ordered a Battery, ships today" },
    ],
    stats: {
      rating: "Avg. verified rating",
      buyers: "Verified GCC buyers",
      spec: "Spec-agreement score",
    },
    sr:
      "Cabler Parts is ISO 9001 certified with OEM-grade, authenticity-verified parts, a 2-year warranty, secure payment, and GCC-wide delivery. Rated 4.9 out of 5 by over 12,400 verified buyers.",
  },
  ar: {
    sectionLabel: "مؤشرات الثقة والنشاط الأخير",
    badgesLabel: "الشهادات والضمانات",
    live: "مباشر",
    verified: "موثّق",
    badges: {
      iso: "حاصل على ISO 9001",
      oem: "بجودة الوكالة",
      authentic: "أصالة موثّقة",
      warranty: "ضمان سنتين",
      payment: "دفع آمن",
      delivery: "توصيل لكل دول الخليج",
    },
    activity: [
      { name: "خالد", city: "الرياض", action: "اقتنى طقم مكابح" },
      { name: "فاطمة", city: "دبي", action: "تأكّدت من التوافق على باترول" },
      { name: "يوسف", city: "الدوحة", action: "أضاف بواجي إلى المرآب" },
      { name: "نورة", city: "مدينة الكويت", action: "أتمّت طلب نظام تعليق" },
      { name: "عمر", city: "الدمام", action: "حصل على سعر التوافق المضمون" },
      { name: "ليلى", city: "المنامة", action: "حجزت فلتر زيت" },
      { name: "سيف", city: "مسقط", action: "أكّد توافق سير الوكالة" },
      { name: "مريم", city: "أبوظبي", action: "طلبت بطارية تُشحن اليوم" },
    ],
    stats: {
      rating: "متوسط التقييم الموثّق",
      buyers: "مشترٍ موثّق في الخليج",
      spec: "نسبة مطابقة المواصفات",
    },
    sr:
      "كابلر بارتس حاصل على شهادة ISO 9001 مع قطع بجودة الوكالة وأصالة موثّقة، وضمان لمدة سنتين، ودفع آمن، وتوصيل لكل دول الخليج. حصل على تقييم 4.9 من 5 من أكثر من 12,400 مشترٍ موثّق.",
  },
};

// Icon component + chip key — labels resolved per-language from STRINGS at render.
const BADGE_DEFS = [
  { key: "iso", Icon: Award },
  { key: "oem", Icon: Wrench },
  { key: "authentic", Icon: BadgeCheck },
  { key: "warranty", Icon: ShieldCheck },
  { key: "payment", Icon: Lock },
  { key: "delivery", Icon: Truck },
];

// Numerals stay latin / tabular in BOTH languages (per RTL conventions).
const STAT_VALUES = {
  rating: { value: "4.9", suffix: "/5" },
  buyers: { value: "12,400", suffix: "+" },
  spec: { value: "98%", suffix: "" },
};

/* -------------------------------------------------------------------------- */

function BadgeChip({ label, Icon }) {
  return (
    <li
      className="group flex shrink-0 items-center gap-2.5 rounded-full border border-border bg-surface px-4 py-2
                 shadow-elevated transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-glow"
    >
      <span
        className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary
                   transition-colors duration-300 group-hover:bg-primary/20"
        aria-hidden="true"
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
      </span>
      <span className="whitespace-nowrap text-sm font-medium text-textSecondary transition-colors duration-300 group-hover:text-textPrimary">
        {label}
      </span>
    </li>
  );
}

function SocialProof() {
  const { lang } = useLang();
  const tx = STRINGS[lang];

  const [activeIdx, setActiveIdx] = useState(0);

  // Rotate the live-activity line on a calm interval. Cleanup on unmount.
  useEffect(() => {
    const id = setInterval(() => {
      setActiveIdx((i) => (i + 1) % tx.activity.length);
    }, 4200);
    return () => clearInterval(id);
  }, [tx.activity.length]);

  const current = tx.activity[activeIdx];

  // Duplicate the badge set so the -50% marquee loops seamlessly.
  const marqueeBadges = [...BADGE_DEFS, ...BADGE_DEFS];

  return (
    <section
      aria-label={tx.sectionLabel}
      className="relative w-full overflow-hidden border-y border-border bg-bg py-10 sm:py-12"
    >
      {/* faint ignition glow behind the band */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* ---- (1) Trust badge marquee ---- */}
        <div className="group relative" aria-label={tx.badgesLabel}>
          {/* edge fades — logical inline-start / inline-end so they flip under RTL */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 start-0 z-10 w-12 bg-gradient-to-r from-bg to-transparent ltr:bg-gradient-to-r rtl:bg-gradient-to-l sm:w-20"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 end-0 z-10 w-12 bg-gradient-to-l from-bg to-transparent ltr:bg-gradient-to-l rtl:bg-gradient-to-r sm:w-20"
          />

          <ul
            className="flex w-max items-center gap-3 motion-safe:animate-marquee motion-safe:rtl:[animation-direction:reverse]
                       motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:animate-none
                       group-hover:[animation-play-state:paused]"
          >
            {marqueeBadges.map((b, i) => (
              <BadgeChip
                key={`${b.key}-${i}`}
                label={tx.badges[b.key]}
                Icon={b.Icon}
              />
            ))}
          </ul>
        </div>

        {/* ---- (2 + 3) Activity ticker + aggregate stats ---- */}
        <div className="mt-9 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          {/* Live activity */}
          <div
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 shadow-elevated sm:px-5"
            aria-live="polite"
          >
            <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full rounded-full bg-accent/60 motion-safe:animate-glow-pulse" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
            </span>

            <p className="min-w-0 flex-1 truncate text-sm text-textSecondary text-start">
              <span className="me-2 hidden align-middle font-mono text-[11px] uppercase tracking-wider text-accent sm:inline">
                {tx.live}
              </span>
              <span
                key={activeIdx}
                className="inline-flex items-center gap-1.5 align-middle motion-safe:animate-fade-up"
              >
                <span className="font-semibold text-textPrimary">{current.name}</span>
                <span className="inline-flex items-center gap-0.5 text-textMuted">
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  {current.city}
                </span>
                <span className="text-textSecondary">{current.action}</span>
              </span>
            </p>

            <span className="ms-auto hidden shrink-0 items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success sm:inline-flex">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              {tx.verified}
            </span>
          </div>

          {/* Aggregate rating / trust stats — divide-x is direction-agnostic */}
          <div className="flex items-stretch justify-center divide-x divide-border rounded-2xl border border-border bg-surface shadow-elevated rtl:divide-x-reverse lg:justify-start">
            {/* Rating cell — leads with stars */}
            <div className="flex flex-col items-center gap-1 px-5 py-3.5 sm:px-6">
              <div className="flex items-baseline gap-1" dir="ltr">
                <span className="font-display text-2xl font-bold leading-none text-textPrimary tabular">
                  {STAT_VALUES.rating.value}
                </span>
                <span className="font-mono text-xs text-textMuted">
                  {STAT_VALUES.rating.suffix}
                </span>
              </div>
              <div className="flex items-center gap-0.5" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star
                    key={i}
                    className="h-3 w-3 fill-primary text-primary"
                    strokeWidth={0}
                  />
                ))}
              </div>
              <span className="text-[11px] text-textMuted">{tx.stats.rating}</span>
            </div>

            {["buyers", "spec"].map((statKey) => (
              <div
                key={statKey}
                className="flex flex-col items-center justify-center gap-1 px-5 py-3.5 text-center sm:px-6"
              >
                <div className="flex items-baseline gap-0.5" dir="ltr">
                  <span className="font-display text-2xl font-bold leading-none text-textPrimary tabular">
                    {STAT_VALUES[statKey].value}
                  </span>
                  <span className="font-mono text-sm text-primary">
                    {STAT_VALUES[statKey].suffix}
                  </span>
                </div>
                <span className="max-w-[7.5rem] text-[11px] leading-tight text-textMuted">
                  {tx.stats[statKey]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Accessible, non-animated fallback summary for screen readers */}
        <p className="sr-only">{tx.sr}</p>
      </div>
    </section>
  );
}

export default SocialProof;
