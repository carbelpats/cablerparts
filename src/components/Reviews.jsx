import { useEffect, useMemo, useState } from "react";
import {
  Star,
  CheckCircle2,
  MessageSquarePlus,
  Send,
  ShieldCheck,
  LogIn,
  Lock,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useLang } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { useOrders } from "../context/OrdersContext";

/* -------------------------------------------------------------------------- */
/*  Local copy — per project convention each component owns its STRINGS dict.  */
/* -------------------------------------------------------------------------- */
const STRINGS = {
  en: {
    heading: "Customer Reviews",
    basedOn: (n) => `Based on ${n} verified ${n === 1 ? "review" : "reviews"}`,
    outOf: "out of 5",
    stars: "stars",
    verifiedPurchase: "Verified Purchase",
    writeReview: "Write a Review",
    yourRating: "Your rating",
    name: "Your name",
    namePh: "e.g. Ahmed K.",
    title: "Review title",
    titlePh: "Sum up your experience",
    body: "Your review",
    bodyPh: "What did you like or dislike? How was the fit and quality?",
    submit: "Submit Review",
    submitting: "Submitting…",
    thanks: "Thank you — your review has been posted.",
    justNow: "Just now",
    you: "You",
    rateAria: (n) => `Rate ${n} ${n === 1 ? "star" : "stars"}`,
    selected: (n) => `${n} of 5 stars selected`,
    empty: "Be the first to review this part.",
    // --- verified-purchase gate ---
    signInTitle: "Sign in to write a review",
    signInBody:
      "Reviews come from verified buyers. Sign in to your account to share your experience with this part.",
    signInCta: "Sign in",
    verifiedOnlyTitle: "Only verified purchasers can review this part",
    verifiedOnlyBody:
      "To keep ratings honest and trustworthy, reviews are reserved for customers who have purchased this part. Order it and your review will carry a Verified Purchase badge.",
    verifiedBadgeHint: "Your review will be marked",
  },
  ar: {
    heading: "تقييمات العملاء",
    basedOn: (n) => `استنادًا إلى ${n} تقييم موثّق`,
    outOf: "من 5",
    stars: "نجوم",
    verifiedPurchase: "عملية شراء موثّقة",
    writeReview: "اكتب تقييمًا",
    yourRating: "تقييمك",
    name: "اسمك",
    namePh: "مثال: أحمد ك.",
    title: "عنوان التقييم",
    titlePh: "لخّص تجربتك",
    body: "تقييمك",
    bodyPh: "ما الذي أعجبك أو لم يعجبك؟ كيف كان التركيب والجودة؟",
    submit: "إرسال التقييم",
    submitting: "جارٍ الإرسال…",
    thanks: "شكرًا لك — تم نشر تقييمك.",
    justNow: "الآن",
    you: "أنت",
    rateAria: (n) => `قيّم بـ ${n} نجوم`,
    selected: (n) => `تم اختيار ${n} من 5 نجوم`,
    empty: "كن أول من يقيّم هذه القطعة.",
    // --- verified-purchase gate ---
    signInTitle: "سجّل الدخول لكتابة تقييم",
    signInBody:
      "التقييمات تأتي من مشترين موثّقين. سجّل الدخول إلى حسابك لمشاركة تجربتك مع هذه القطعة.",
    signInCta: "تسجيل الدخول",
    verifiedOnlyTitle: "التقييم متاح للمشترين الموثّقين فقط",
    verifiedOnlyBody:
      "للحفاظ على مصداقية التقييمات وموثوقيتها، التقييمات محصورة بالعملاء الذين اشتروا هذه القطعة. اطلبها وسيحمل تقييمك شارة عملية شراء موثّقة.",
    verifiedBadgeHint: "سيُوسم تقييمك بشارة",
  },
};

/* -------------------------------------------------------------------------- */
/*  localStorage helpers — SSR-safe, per-product review persistence.           */
/*  Key: "almeyar:reviews:" + product.id  -> Array<Review>                      */
/* -------------------------------------------------------------------------- */
const reviewsKey = (productId) => `almeyar:reviews:${productId}`;

function readStoredReviews(productId) {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(reviewsKey(productId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredReviews(productId, list) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(reviewsKey(productId), JSON.stringify(list));
  } catch {
    /* quota / private-mode — non-fatal for a demo */
  }
}

/* -------------------------------------------------------------------------- */
/*  Static star row (display only). Mirrors the ProductCard star treatment.    */
/* -------------------------------------------------------------------------- */
function StarRow({ rating, size = "h-4 w-4" }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="flex items-center gap-0.5" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => {
        const on = i < full || (i === full && half);
        return (
          <Star
            key={i}
            className={`${size} ${on ? "fill-warning text-warning" : "text-border"}`}
            strokeWidth={1.5}
          />
        );
      })}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Interactive star picker for the write-a-review form.                       */
/* -------------------------------------------------------------------------- */
function StarPicker({ value, onChange, tx }) {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  return (
    <div
      className="flex items-center gap-1"
      role="radiogroup"
      aria-label={tx.yourRating}
    >
      {Array.from({ length: 5 }).map((_, i) => {
        const n = i + 1;
        const on = n <= active;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={tx.rateAria(n)}
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onFocus={() => setHover(n)}
            onBlur={() => setHover(0)}
            className="rounded p-0.5 transition-transform duration-150 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none"
          >
            <Star
              className={`h-7 w-7 transition-colors ${
                on ? "fill-warning text-warning" : "text-border"
              }`}
              strokeWidth={1.5}
            />
          </button>
        );
      })}
      <span className="sr-only" aria-live="polite">
        {tx.selected(value)}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Reviews — rating summary + distribution + list + write-a-review form.      */
/*                                                                            */
/*  The write-a-review form is gated by a verified-purchase check:            */
/*    (a) signed out                 -> sign-in CTA panel                      */
/*    (b) authed, not a purchaser    -> "verified buyers only" notice          */
/*    (c) authed AND has purchased   -> the actual form (verified:true)        */
/* -------------------------------------------------------------------------- */
export default function Reviews({ product }) {
  const { lang } = useLang();
  const tx = STRINGS[lang];
  const location = useLocation();
  const { isAuthed, user } = useAuth();
  const { hasPurchased } = useOrders();

  // Verified-purchase eligibility for the current user.
  const purchased = isAuthed && hasPurchased(product.id);

  // Live review list = product seed + any persisted local reviews (newest first).
  const [stored, setStored] = useState(() => readStoredReviews(product.id));

  // Re-hydrate persisted reviews whenever the product changes.
  useEffect(() => {
    setStored(readStoredReviews(product.id));
  }, [product.id]);

  // Merge stored (newest first) on top of the product's seed list.
  const reviews = useMemo(
    () => [...stored, ...(product.reviewList || [])],
    [stored, product.reviewList]
  );

  // Form state.
  const [rating, setRating] = useState(0);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [posted, setPosted] = useState(false);

  // Auto-dismiss the "thank you" confirmation so it doesn't linger forever.
  useEffect(() => {
    if (!posted) return;
    const t = setTimeout(() => setPosted(false), 3500);
    return () => clearTimeout(t);
  }, [posted]);

  // Summary metrics derived from the (live) merged list.
  const summary = useMemo(() => {
    const count = reviews.length;
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    const avg = count ? sum / count : product.rating || 0;
    // 5-row distribution, index 0 => 5 stars … index 4 => 1 star.
    const dist = [5, 4, 3, 2, 1].map((stars) => {
      const n = reviews.filter((r) => Math.round(r.rating) === stars).length;
      return { stars, n, pct: count ? (n / count) * 100 : 0 };
    });
    return { count, avg, dist };
  }, [reviews, product.rating]);

  const canSubmit =
    rating > 0 && name.trim() && title.trim() && body.trim() && !submitting;

  const handleSubmit = (e) => {
    e.preventDefault();
    // Hard guard — only verified purchasers can reach a working submit.
    if (!purchased || !canSubmit) return;
    setSubmitting(true);

    const trimmedName = name.trim();
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    // Date.now() is fine inside a runtime handler (not at module top level).
    const now = Date.now();

    const newReview = {
      id: `rv-local-${product.id}-${now}`,
      author: trimmedName,
      authorAr: trimmedName, // user-entered name is shown verbatim in both langs
      rating,
      dateEn: "Just now",
      dateAr: "الآن",
      titleEn: trimmedTitle,
      titleAr: trimmedTitle,
      bodyEn: trimmedBody,
      bodyAr: trimmedBody,
      verified: true, // verified purchaser — carries the trust badge
      isMine: true,
      createdAt: now,
    };

    // Persist (newest first) and update the live list.
    const next = [newReview, ...stored];
    writeStoredReviews(product.id, next);
    setStored(next);

    setRating(0);
    setName("");
    setTitle("");
    setBody("");
    setSubmitting(false);
    setPosted(true);
  };

  // Prefill the name field from the signed-in user once eligible.
  useEffect(() => {
    if (purchased && user?.name && !name) setName(user.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchased, user]);

  // `from` location so /login can bounce the user back here after auth.
  const from = { pathname: location.pathname, search: location.search };

  return (
    <section aria-labelledby="reviews-heading" className="space-y-8">
      <h3
        id="reviews-heading"
        className="font-display text-xl font-700 text-textPrimary"
      >
        {tx.heading}
      </h3>

      {/* ---- Summary + distribution ---- */}
      <div className="grid gap-6 rounded-2xl border border-border bg-surfaceElevated p-5 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-8">
        {/* average */}
        <div className="flex flex-col items-center gap-1 text-center sm:border-e sm:border-border sm:pe-8">
          <span className="font-display text-5xl font-700 tabular-nums text-textPrimary">
            {summary.avg.toFixed(1)}
          </span>
          <StarRow rating={summary.avg} size="h-4 w-4" />
          <span className="mt-1 text-xs text-textMuted">
            {tx.basedOn(summary.count)}
          </span>
        </div>

        {/* distribution bars */}
        <div className="flex flex-col gap-1.5">
          {summary.dist.map(({ stars, n, pct }) => (
            <div key={stars} className="flex items-center gap-3">
              <span className="flex w-12 shrink-0 items-center gap-1 font-mono text-xs tabular-nums text-textSecondary">
                {stars}
                <Star
                  className="h-3 w-3 fill-warning text-warning"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </span>
              <div
                className="h-2 flex-1 overflow-hidden rounded-full bg-border"
                role="img"
                aria-label={`${stars} ${tx.stars}: ${n}`}
              >
                <div
                  className="h-full rounded-full bg-warning transition-[width] duration-500 ease-out motion-reduce:transition-none"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-end font-mono text-xs tabular-nums text-textMuted">
                {n}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ---- Review list ---- */}
      {reviews.length === 0 ? (
        <p className="text-sm text-textMuted">{tx.empty}</p>
      ) : (
        <ul className="space-y-4">
          {reviews.map((r) => {
            const author = lang === "ar" ? r.authorAr : r.author;
            const reviewTitle = lang === "ar" ? r.titleAr : r.titleEn;
            const reviewBody = lang === "ar" ? r.bodyAr : r.bodyEn;
            const date = lang === "ar" ? r.dateAr : r.dateEn;
            return (
              <li
                key={r.id}
                className={
                  "rounded-2xl border bg-surface p-4 shadow-elevated transition-colors " +
                  (r.isMine
                    ? "border-primary/40 ring-1 ring-primary/20"
                    : "border-border")
                }
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-sm font-600 text-textPrimary">
                        {author}
                      </span>
                      {r.verified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                          <CheckCircle2 className="h-3 w-3" strokeWidth={2.5} />
                          {tx.verifiedPurchase}
                        </span>
                      ) : r.isMine ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                          {tx.you}
                        </span>
                      ) : null}
                    </div>
                    <StarRow rating={r.rating} size="h-3.5 w-3.5" />
                  </div>
                  <span className="font-mono text-[11px] tabular-nums text-textMuted">
                    {date}
                  </span>
                </div>

                <h4 className="mt-3 font-display text-sm font-600 text-textPrimary">
                  {reviewTitle}
                </h4>
                <p className="mt-1 text-sm leading-relaxed text-textSecondary">
                  {reviewBody}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {/* ---- Write-a-review : verified-purchase gate ---- */}
      {!isAuthed ? (
        /* (a) Signed out -> sign-in CTA */
        <div
          className="flex flex-col gap-4 rounded-2xl border border-border bg-surfaceElevated p-5 sm:flex-row sm:items-center sm:justify-between"
          role="note"
        >
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <LogIn className="h-5 w-5 rtl:-scale-x-100" strokeWidth={2} aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <h4 className="font-display text-base font-600 text-textPrimary">
                {tx.signInTitle}
              </h4>
              <p className="max-w-prose text-sm leading-relaxed text-textSecondary">
                {tx.signInBody}
              </p>
            </div>
          </div>
          <Link
            to="/login"
            state={{ from }}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-display text-sm font-600 uppercase tracking-wide text-white transition-all duration-300 ease-out hover:bg-primaryHover hover:shadow-glow active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surfaceElevated motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            <LogIn className="h-4 w-4 rtl:-scale-x-100" strokeWidth={2.25} aria-hidden="true" />
            {tx.signInCta}
          </Link>
        </div>
      ) : !purchased ? (
        /* (b) Authed but not a verified purchaser -> tasteful notice */
        <div
          className="flex items-start gap-3 rounded-2xl border border-border bg-surfaceElevated p-5"
          role="note"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
            <ShieldCheck className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          </span>
          <div className="space-y-1">
            <h4 className="flex items-center gap-2 font-display text-base font-600 text-textPrimary">
              <Lock className="h-4 w-4 text-textMuted" strokeWidth={2} aria-hidden="true" />
              {tx.verifiedOnlyTitle}
            </h4>
            <p className="max-w-prose text-sm leading-relaxed text-textSecondary">
              {tx.verifiedOnlyBody}
            </p>
          </div>
        </div>
      ) : (
        /* (c) Verified purchaser -> the write-a-review form */
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-border bg-surfaceElevated p-5"
          aria-labelledby="write-review-heading"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MessageSquarePlus
                className="h-5 w-5 text-primary"
                strokeWidth={2}
                aria-hidden="true"
              />
              <h4
                id="write-review-heading"
                className="font-display text-base font-600 text-textPrimary"
              >
                {tx.writeReview}
              </h4>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
              <ShieldCheck className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
              {tx.verifiedBadgeHint} · {tx.verifiedPurchase}
            </span>
          </div>

          {/* star picker */}
          <div className="space-y-1.5">
            <span className="block text-xs font-medium text-textSecondary">
              {tx.yourRating}
            </span>
            <StarPicker value={rating} onChange={setRating} tx={tx} />
          </div>

          {/* name + title */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="block text-xs font-medium text-textSecondary">
                {tx.name}
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={tx.namePh}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-base md:text-sm text-textPrimary placeholder:text-textMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <label className="space-y-1.5">
              <span className="block text-xs font-medium text-textSecondary">
                {tx.title}
              </span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={tx.titlePh}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-base md:text-sm text-textPrimary placeholder:text-textMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
          </div>

          {/* body */}
          <label className="block space-y-1.5">
            <span className="block text-xs font-medium text-textSecondary">
              {tx.body}
            </span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={tx.bodyPh}
              rows={4}
              className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-base md:text-sm leading-relaxed text-textPrimary placeholder:text-textMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-display text-sm font-600 uppercase tracking-wide text-white transition-all duration-300 ease-out hover:bg-primaryHover hover:shadow-glow active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surfaceElevated disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-primary disabled:hover:shadow-none motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              <Send
                className="h-4 w-4 rtl:-scale-x-100"
                strokeWidth={2.25}
                aria-hidden="true"
              />
              {submitting ? tx.submitting : tx.submit}
            </button>
            {posted && (
              <span
                className="inline-flex items-center gap-1.5 text-sm font-medium text-success"
                role="status"
              >
                <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} />
                {tx.thanks}
              </span>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
