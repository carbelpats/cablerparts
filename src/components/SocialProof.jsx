import { ShieldCheck, Truck, Wrench, Clock, Banknote, Lock } from "lucide-react";
import { useLang } from "../context/LanguageContext";

// -----------------------------------------------------------------------------
// SocialProof — HONEST guarantees only.
//
// Deliberately contains NO fabricated claims: no invented ratings, buyer counts,
// "verified" certifications, or fake live activity. Just the real promises the
// store actually makes (warranty, OEM-grade parts, GCC + same-day-Riyadh
// delivery, cash on delivery, secure checkout). The store's Commercial
// Registration / VAT details live in the CMS-driven footer compliance block.
// -----------------------------------------------------------------------------

const STRINGS = {
  en: {
    sectionLabel: "Our guarantees",
    items: [
      { key: "warranty", title: "2-Year Warranty", sub: "On eligible parts" },
      { key: "oem", title: "OEM-Grade Parts", sub: "Built to factory spec" },
      { key: "gcc", title: "GCC-Wide Delivery", sub: "Shipped across the Gulf" },
      { key: "riyadh", title: "Same-Day in Riyadh", sub: "Delivered by us" },
      { key: "cod", title: "Cash on Delivery", sub: "Pay when it arrives" },
      { key: "secure", title: "Secure Checkout", sub: "Encrypted & protected" },
    ],
  },
  ar: {
    sectionLabel: "ضماناتنا",
    items: [
      { key: "warranty", title: "ضمان سنتين", sub: "على القطع المؤهّلة" },
      { key: "oem", title: "قطع بجودة الوكالة", sub: "مطابقة لمواصفات المصنع" },
      { key: "gcc", title: "توصيل لكل دول الخليج", sub: "نشحن عبر الخليج" },
      { key: "riyadh", title: "توصيل نفس اليوم بالرياض", sub: "نوصلها بأنفسنا" },
      { key: "cod", title: "الدفع عند الاستلام", sub: "ادفع وقت الوصول" },
      { key: "secure", title: "دفع آمن", sub: "مشفّر ومحمي" },
    ],
  },
};

const ICONS = {
  warranty: ShieldCheck,
  oem: Wrench,
  gcc: Truck,
  riyadh: Clock,
  cod: Banknote,
  secure: Lock,
};

export default function SocialProof() {
  const { lang } = useLang();
  const tx = STRINGS[lang] || STRINGS.en;

  return (
    <section
      aria-label={tx.sectionLabel}
      className="w-full border-y border-border bg-bg py-10 sm:py-12"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none mx-auto mb-9 h-px max-w-7xl bg-gradient-to-r from-transparent via-primary/30 to-transparent"
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
          {tx.items.map((it) => {
            const Icon = ICONS[it.key];
            return (
              <li
                key={it.key}
                className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-5 text-center shadow-elevated transition-colors duration-300 hover:border-primary/40"
              >
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary"
                  aria-hidden="true"
                >
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <span className="text-sm font-bold leading-tight text-textPrimary">
                  {it.title}
                </span>
                <span className="text-[11px] leading-tight text-textMuted">
                  {it.sub}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
