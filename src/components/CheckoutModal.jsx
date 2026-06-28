import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  ArrowRight,
  ArrowLeft,
  Check,
  Copy,
  User,
  Truck,
  CreditCard,
  ShieldCheck,
  Lock,
  PartyPopper,
  Package,
  Gauge,
  LogIn,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCheckout } from "../context/CheckoutContext";
import { useCart } from "../context/CartContext";
import { useGeo } from "../context/GeoContext";
import { useGarage } from "../context/GarageContext";
import { useLang } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { useOrders } from "../context/OrdersContext";
import { PART_ICONS } from "../lib/partIcons";
import {
  createPayment,
  PAYMENT_METHODS,
} from "../services/paymentService";
import {
  validateEmail,
  validatePhone,
  cardNumberValid,
  expiryValid,
  cvcValid,
  detectCardBrand,
} from "../lib/validation";
import {
  getShippingMethods,
  getShippingMethod,
  estimateDelivery,
} from "../services/shippingService";

// ---- Localized copy (component-local per project convention) ----------------
const STRINGS = {
  en: {
    title: "Secure Checkout",
    closeAria: "Close checkout",
    stepOf: (n, t) => `Step ${n} of ${t}`,
    // gauge
    boost: "BOOST",
    ready: "READY",
    progressLabel: "Checkout progress",
    // step names
    steps: ["Contact", "Shipping", "Payment"],
    // step 1 — contact
    contactTitle: "Contact details",
    contactHint: "We'll send order updates here.",
    name: "Full name",
    namePh: "e.g. Khalid Al-Otaibi",
    email: "Email address",
    emailPh: "you@example.com",
    phone: "Phone number",
    phonePh: "+966 5X XXX XXXX",
    // step 2 — shipping
    shippingTitle: "Shipping address",
    shippingForVehicle: (v) => `Shipping parts for your ${v}.`,
    address: "Address line",
    addressPh: "Building, street, district",
    city: "City",
    cityPh: "e.g. Riyadh",
    region: "Region",
    // shipping-method selector
    shipMethodLabel: "Delivery speed",
    shipEta: (a, b) =>
      a === b ? `${a} business day` : `${a}–${b} business days`,
    // step 3 — payment
    paymentTitle: "Payment",
    paymentHint: "Demo only — no real card is charged.",
    // payment-method selector
    payMethodLabel: "Payment method",
    payMethods: {
      mada: "مدى",
      card: "Visa / Mastercard",
      applepay: "Apple Pay",
      stcpay: "STC Pay",
      tabby: "Tabby",
      tamara: "Tamara",
      cod: "Cash on delivery",
    },
    codNote: "Pay in cash when your order is delivered.",
    redirectNote: (m) => `You'll be redirected to complete payment via ${m}.`,
    cardNumber: "Card number",
    cardPh: "•••• •••• •••• ••••",
    expiry: "Expiry",
    expiryPh: "MM/YY",
    cvc: "CVC",
    cvcPh: "123",
    mockNote: "This is a mock payment form. Do not enter real card details.",
    // test-card hint + processing / payment errors
    testCardsTitle: "Test cards",
    testCardSuccess: "Successful payment",
    testCardDeclined: "Card declined",
    processing: "Processing payment…",
    errDeclined: "Your card was declined. Try a different card.",
    errInvalidCard: "Card details are invalid. Please check and try again.",
    errPayGeneric: "Payment could not be completed. Please try again.",
    // summary
    summaryTitle: "Order summary",
    items: "items",
    item: "item",
    subtotal: "Subtotal",
    discount: "Discount",
    shipping: "Shipping",
    total: "Total",
    free: "Free",
    qty: "Qty",
    // actions
    back: "Back",
    next: "Continue",
    placeOrder: "Place Order",
    // auth gate (final step)
    gateTitle: "Sign in to complete your order",
    gateBody:
      "Create an account or sign in so we can save this order and let you track it anytime.",
    gateSignIn: "Sign in to continue",
    // success
    successTitle: "Order confirmed!",
    successBody: "Your parts are being prepared for GCC dispatch.",
    orderNo: "Order number",
    copyOrder: "Copy order number",
    copyDone: "Copied",
    trackOrder: "Track order",
    continueShopping: "Continue shopping",
    successVehicle: (v) => `Heading to your ${v}.`,
    // validation
    errRequired: "Required",
    errEmail: "Enter a valid email",
    errPhone: "Enter a valid phone",
    errCard: "Enter a valid card number",
    errExpiry: "Use MM/YY (not expired)",
    errCvc: "3–4 digits",
  },
  ar: {
    title: "إتمام شراء آمن",
    closeAria: "إغلاق الدفع",
    stepOf: (n, t) => `الخطوة ${n} من ${t}`,
    boost: "الدفع",
    ready: "جاهز",
    progressLabel: "تقدّم إتمام الشراء",
    steps: ["التواصل", "الشحن", "الدفع"],
    contactTitle: "بيانات التواصل",
    contactHint: "سنرسل تحديثات الطلب هنا.",
    name: "الاسم الكامل",
    namePh: "مثال: خالد العتيبي",
    email: "البريد الإلكتروني",
    emailPh: "you@example.com",
    phone: "رقم الجوال",
    phonePh: "+966 5X XXX XXXX",
    shippingTitle: "عنوان الشحن",
    shippingForVehicle: (v) => `نشحن قطع سيارتك ${v}.`,
    address: "العنوان",
    addressPh: "المبنى، الشارع، الحي",
    city: "المدينة",
    cityPh: "مثال: الرياض",
    region: "المنطقة",
    // shipping-method selector
    shipMethodLabel: "سرعة التوصيل",
    shipEta: (a, b) =>
      a === b ? `يوم عمل واحد` : `${a}–${b} أيام عمل`,
    paymentTitle: "الدفع",
    paymentHint: "للعرض فقط — لن يتم خصم أي بطاقة فعلية.",
    // payment-method selector
    payMethodLabel: "طريقة الدفع",
    payMethods: {
      mada: "مدى",
      card: "بطاقة Visa/Mastercard",
      applepay: "Apple Pay",
      stcpay: "STC Pay",
      tabby: "تابي",
      tamara: "تمارا",
      cod: "الدفع عند الاستلام",
    },
    codNote: "ادفع نقداً عند الاستلام.",
    redirectNote: (m) => `ستُحوّل لإتمام الدفع عبر ${m}.`,
    cardNumber: "رقم البطاقة",
    cardPh: "•••• •••• •••• ••••",
    expiry: "تاريخ الانتهاء",
    expiryPh: "MM/YY",
    cvc: "CVC",
    cvcPh: "123",
    mockNote: "هذا نموذج دفع تجريبي. لا تُدخل بيانات بطاقة حقيقية.",
    testCardsTitle: "بطاقات تجريبية",
    testCardSuccess: "عملية ناجحة",
    testCardDeclined: "بطاقة مرفوضة",
    processing: "جارٍ معالجة الدفع…",
    errDeclined: "تم رفض بطاقتك. جرّب بطاقة أخرى.",
    errInvalidCard: "بيانات البطاقة غير صحيحة. يرجى التحقق والمحاولة مجدداً.",
    errPayGeneric: "تعذّر إتمام الدفع. يرجى المحاولة مرة أخرى.",
    summaryTitle: "ملخّص الطلب",
    items: "قطعة",
    item: "قطعة",
    subtotal: "المجموع الفرعي",
    discount: "الخصم",
    shipping: "الشحن",
    total: "الإجمالي",
    free: "مجاني",
    qty: "الكمية",
    back: "رجوع",
    next: "متابعة",
    placeOrder: "تأكيد الطلب",
    gateTitle: "سجّل الدخول لإتمام طلبك",
    gateBody:
      "أنشئ حساباً أو سجّل الدخول لنحفظ هذا الطلب ونتيح لك تتبّعه في أي وقت.",
    gateSignIn: "سجّل الدخول للمتابعة",
    successTitle: "تم تأكيد الطلب!",
    successBody: "يتم تجهيز قطعك للشحن داخل دول الخليج.",
    orderNo: "رقم الطلب",
    copyOrder: "نسخ رقم الطلب",
    copyDone: "تم النسخ",
    trackOrder: "تتبّع الطلب",
    continueShopping: "متابعة التسوّق",
    successVehicle: (v) => `في طريقها إلى سيارتك ${v}.`,
    errRequired: "مطلوب",
    errEmail: "أدخل بريداً صحيحاً",
    errPhone: "أدخل رقماً صحيحاً",
    errCard: "أدخل رقم بطاقة صحيحاً",
    errExpiry: "استخدم MM/YY (غير منتهية)",
    errCvc: "3–4 أرقام",
  },
};

// Map the cart line icon keys -> shared part artwork (mini thumbs).
const STEP_ICONS = [User, Truck, CreditCard];

// Display labels for the detected card brand badge (Latin, shown dir="ltr").
const CARD_BRAND_LABEL = {
  mada: "mada",
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "Amex",
};

// ---- Boost gauge ------------------------------------------------------------
// A semicircular turbo/RPM gauge. `value` is 0..1 (fraction of the flow done).
// The amber arc + needle sweep up as steps complete; single-shot transitions
// that respect prefers-reduced-motion via the duration prop.
function BoostGauge({ value, labels, reduceMotion, complete }) {
  // Geometry for a 180° arc (a semicircle), 200x120 viewBox.
  const cx = 100;
  const cy = 100;
  const r = 80;
  const startA = Math.PI; // 180° (left)
  const sweep = Math.PI; // half turn to 0° (right)
  const clamped = Math.max(0, Math.min(1, value));

  const polar = (frac) => {
    const a = startA - sweep * frac; // left -> right
    return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
  };

  const [bgStartX, bgStartY] = polar(0);
  const [bgEndX, bgEndY] = polar(1);
  const trackPath = `M ${bgStartX} ${bgStartY} A ${r} ${r} 0 0 1 ${bgEndX} ${bgEndY}`;

  // Tick segments (8) for the turbo look.
  const ticks = Array.from({ length: 9 }, (_, i) => {
    const frac = i / 8;
    const [ox, oy] = polar(frac);
    const a = startA - sweep * frac;
    const ix = cx + (r - 10) * Math.cos(a);
    const iy = cy - (r - 10) * Math.sin(a);
    return { ox, oy, ix, iy, lit: frac <= clamped + 0.001 };
  });

  // Needle endpoint.
  const [nx, ny] = polar(clamped);
  const dur = reduceMotion ? "0s" : "0.7s";
  // Arc length of the lit portion (for the stroke-dash sweep).
  const arcLen = Math.PI * r;

  const pct = Math.round(clamped * 100);

  return (
    <div className="mx-auto flex w-full max-w-[18rem] flex-col items-center gap-2">
      {/* Text label — a NORMAL-FLOW block element ABOVE the gauge wrapper, on its
          own line, centered. It lives OUTSIDE the relative gauge wrapper below,
          so it can never collide with the centered percentage at any value
          (0%..100%) in LTR or RTL — overlap is mathematically impossible. */}
      <div className="flex items-center justify-center gap-1.5 font-mono text-[10px] font-bold uppercase leading-none tracking-[0.2em] text-primary">
        <Gauge size={12} aria-hidden="true" className="rtl:-scale-x-100" />
        {complete ? labels.ready : labels.boost}
      </div>

      {/* Gauge wrapper — the SVG plus the LONE absolutely-positioned child (the
          numeric percentage). Nothing else is absolute inside here. */}
      <div className="relative w-full">
      <svg
        viewBox="0 0 200 120"
        className="w-full overflow-visible"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={labels.progressLabel}
      >
        {/* Track */}
        <path
          d={trackPath}
          fill="none"
          stroke="rgb(var(--border))"
          strokeWidth="9"
          strokeLinecap="round"
        />
        {/* Lit fill — amber primary, single-shot sweep via dashoffset */}
        <path
          d={trackPath}
          fill="none"
          stroke="rgb(var(--primary))"
          strokeWidth="9"
          strokeLinecap="round"
          style={{
            strokeDasharray: arcLen,
            strokeDashoffset: arcLen * (1 - clamped),
            transition: `stroke-dashoffset ${dur} cubic-bezier(0.22,1,0.36,1)`,
            filter: "drop-shadow(0 0 6px rgb(var(--primary) / 0.55))",
          }}
        />
        {/* Ticks */}
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.ox}
            y1={t.oy}
            x2={t.ix}
            y2={t.iy}
            stroke={
              t.lit ? "rgb(var(--primary))" : "rgb(var(--text-muted) / 0.5)"
            }
            strokeWidth="2"
            strokeLinecap="round"
            style={{ transition: `stroke ${dur} ease` }}
          />
        ))}
        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={nx}
          y2={ny}
          stroke="rgb(var(--primary))"
          strokeWidth="3"
          strokeLinecap="round"
          style={{
            transition: reduceMotion
              ? "none"
              : `x2 ${dur} cubic-bezier(0.22,1,0.36,1), y2 ${dur} cubic-bezier(0.22,1,0.36,1)`,
            filter: "drop-shadow(0 0 4px rgb(var(--primary) / 0.6))",
          }}
        />
        <circle cx={cx} cy={cy} r="6" fill="rgb(var(--primary))" />
        <circle cx={cx} cy={cy} r="11" fill="none" stroke="rgb(var(--border))" strokeWidth="2" />
      </svg>

      {/* Hub readout — the ONLY absolutely-positioned child INSIDE the gauge
          wrapper: just the numeric percentage, centered in the needle hub
          (leading-none, mono tabular-nums). The label lives in normal flow
          ABOVE this wrapper, so collision is mathematically impossible. */}
      <span
        className="pointer-events-none absolute inset-x-0 bottom-1 flex items-baseline justify-center font-display text-2xl font-extrabold leading-none tabular-nums text-textPrimary"
        aria-hidden="true"
      >
        {pct}
        <span className="font-mono text-base leading-none text-textMuted">%</span>
      </span>
      </div>
    </div>
  );
}

// ---- Mini cart thumb --------------------------------------------------------
const ACCENT_THUMB = {
  primary: "from-primary/20 to-primary/5 text-primary ring-primary/25",
  accent: "from-accent/20 to-accent/5 text-accent ring-accent/25",
  success: "from-success/20 to-success/5 text-success ring-success/25",
};

function MiniThumb({ icon, accent }) {
  const thumb = ACCENT_THUMB[accent] || ACCENT_THUMB.primary;
  return (
    <span
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br ring-1 ring-inset ${thumb}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" className="h-5 w-5">
        {PART_ICONS[icon] || PART_ICONS.brake}
      </svg>
    </span>
  );
}

// ---- Reusable labelled field ------------------------------------------------
function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
  type = "text",
  inputMode,
  autoComplete,
  ltr = false,
  maxLength,
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block font-sans text-xs font-medium text-textSecondary"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete}
        maxLength={maxLength}
        dir={ltr ? "ltr" : undefined}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : undefined}
        className={`w-full rounded-lg border bg-surface px-3 py-2.5 font-sans text-base text-textPrimary placeholder:text-textMuted focus:outline-none focus:ring-2 focus:ring-ring/40 md:text-sm ${
          ltr ? "text-start font-mono tracking-wide" : ""
        } ${
          error
            ? "border-danger/60 focus:border-danger"
            : "border-border focus:border-primary/50"
        }`}
      />
      {error && (
        <p
          id={`${id}-err`}
          role="alert"
          className="mt-1 font-sans text-[11px] font-medium text-danger"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export default function CheckoutModal() {
  const { isOpen, closeCheckout } = useCheckout();
  const {
    items,
    count,
    subtotalUSD,
    discountUSD,
    shippingUSD,
    totalUSD,
    clearCart,
  } = useCart();
  const { format, region } = useGeo();
  const { hasVehicle, vehicle } = useGarage();
  const { lang, isRTL } = useLang();
  const { user, isAuthed } = useAuth();
  const { placeOrder } = useOrders();
  const navigate = useNavigate();
  const tx = STRINGS[lang] || STRINGS.en;

  const panelRef = useRef(null);
  const closeBtnRef = useRef(null);
  // Guards against setState after unmount for the async charge/place flow.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ---- Reduced motion (read once in the OUTER component) --------------------
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  // ---- Flow state ----------------------------------------------------------
  const TOTAL_STEPS = 3;
  const [step, setStep] = useState(0); // 0..2
  const [placed, setPlaced] = useState(false);
  // The REAL order returned by placeOrder() — drives the success screen.
  const [placedOrder, setPlacedOrder] = useState(null);
  const [copiedOrder, setCopiedOrder] = useState(false);
  // Payment processing state (charge runs before the order is placed).
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState(null); // localized message | null
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    card: "",
    expiry: "",
    cvc: "",
  });
  const [touched, setTouched] = useState({});
  // Selected payment + shipping methods (defaults: card / standard).
  const [payMethod, setPayMethod] = useState("card");
  const [shipMethod, setShipMethod] = useState("standard");

  const setField = useCallback(
    (k) => (v) => setForm((prev) => ({ ...prev, [k]: v })),
    []
  );

  // Payment methods available for the active region. `region:"*"` is global;
  // region-specific methods (mada / STC Pay are SA-only) drop out elsewhere.
  const payMethodsForRegion = useMemo(
    () =>
      PAYMENT_METHODS.filter(
        (m) => m.region === "*" || m.region === region.code
      ),
    [region.code]
  );

  // The definition of the currently selected method (drives card-field display).
  const activePayMethod = useMemo(
    () =>
      payMethodsForRegion.find((m) => m.id === payMethod) ||
      payMethodsForRegion[0],
    [payMethodsForRegion, payMethod]
  );
  const needsCard = !!activePayMethod?.needsCard;

  // Shipping methods (cost + ETA) shown on the shipping step.
  const shipMethods = useMemo(() => getShippingMethods(), []);

  // If the region change removed the selected payment method, fall back to a
  // still-available one (keeps the selector + card gating consistent).
  useEffect(() => {
    if (!payMethodsForRegion.some((m) => m.id === payMethod)) {
      setPayMethod(payMethodsForRegion[0]?.id || "card");
    }
  }, [payMethodsForRegion, payMethod]);

  // Reset the flow each time the modal opens fresh; prefill contact from the
  // signed-in user (name/email) when authed.
  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setPlaced(false);
      setPlacedOrder(null);
      setPaying(false);
      setPayError(null);
      setTouched({});
      setShipMethod("standard");
      setPayMethod("card");
      setForm((prev) => ({
        ...prev,
        name: user?.name || prev.name,
        email: user?.email || prev.email,
      }));
    }
  }, [isOpen, user]);

  // ---- Validation ----------------------------------------------------------
  // Backed by the shared validators in lib/validation.js so checkout enforces
  // the exact same email / phone / card rules as the rest of the app. Each
  // validator returns a STABLE error CODE which we map to localized copy here.
  // Empty fields collapse to `errRequired`; a present-but-bad value gets its
  // field-specific message. Card fields are only validated when the selected
  // payment method needs a card (mada / Visa-Mastercard).
  const errors = useMemo(() => {
    const e = {};
    const need = (v) => !String(v || "").trim();

    if (need(form.name)) e.name = tx.errRequired;

    // Email — validateEmail -> "required" | "format".
    const emailRes = validateEmail(form.email);
    if (!emailRes.ok)
      e.email = emailRes.error === "required" ? tx.errRequired : tx.errEmail;

    // Phone — validatePhone(value, region.code) -> "required" | "format".
    const phoneRes = validatePhone(form.phone, region.code);
    if (!phoneRes.ok)
      e.phone = phoneRes.error === "required" ? tx.errRequired : tx.errPhone;

    if (need(form.address)) e.address = tx.errRequired;
    if (need(form.city)) e.city = tx.errRequired;

    // Card fields — skipped entirely for non-card methods (COD / wallet / BNPL).
    if (needsCard) {
      if (need(form.card)) e.card = tx.errRequired;
      else if (!cardNumberValid(form.card)) e.card = tx.errCard;

      if (need(form.expiry)) e.expiry = tx.errRequired;
      else if (!expiryValid(form.expiry)) e.expiry = tx.errExpiry;

      if (need(form.cvc)) e.cvc = tx.errRequired;
      else if (!cvcValid(form.cvc, form.card)) e.cvc = tx.errCvc;
    }
    return e;
  }, [form, tx, region.code, needsCard]);

  // Detected brand for the inline badge near the card-number field.
  const cardBrand = useMemo(() => detectCardBrand(form.card), [form.card]);

  const STEP_FIELDS = useMemo(
    () => [
      ["name", "email", "phone"],
      ["address", "city"],
      // Card fields are only gating when the method needs a card; otherwise the
      // payment step validates with no card inputs at all.
      needsCard ? ["card", "expiry", "cvc"] : [],
    ],
    [needsCard]
  );

  const stepValid = useMemo(
    () => STEP_FIELDS[step].every((f) => !errors[f]),
    [STEP_FIELDS, step, errors]
  );

  // Only surface an error after the field is touched OR a Next was attempted.
  const showErr = (f) => (touched[f] ? errors[f] : undefined);
  const markTouched = (f) => setTouched((t) => ({ ...t, [f]: true }));

  // ---- Boost-gauge value ---------------------------------------------------
  // Sweeps in clean step increments; success pins it at full.
  const gaugeValue = placed ? 1 : step / TOTAL_STEPS;

  // ---- Deterministic order number ------------------------------------------
  // Derived from count + rounded subtotal + items length — no Date.now/random.
  const orderNumber = useMemo(() => {
    const base =
      count * 7919 +
      Math.round(subtotalUSD) * 31 +
      items.length * 101 +
      104729;
    const code = (base % 900000) + 100000; // always 6 digits
    return `MR-${code}`;
  }, [count, subtotalUSD, items.length]);

  // ---- Handlers ------------------------------------------------------------
  // Map a paymentService error code -> localized message.
  const payErrorMessage = useCallback(
    (code) => {
      if (code === "card_declined") return tx.errDeclined;
      if (code === "invalid_card") return tx.errInvalidCard;
      return tx.errPayGeneric;
    },
    [tx]
  );

  // Charge the card via paymentService, then commit the order via OrdersContext
  // and flip to the success screen with the REAL order. On a declined/invalid
  // charge we surface a localized error and STAY on the payment step. Only
  // reachable when authed (gate handles the rest).
  const commitOrder = useCallback(async () => {
    if (paying) return;
    setPayError(null);
    setPaying(true);

    let payment;
    try {
      payment = await createPayment({
        // Pass the chosen method so non-card flows (COD / wallet / BNPL) skip
        // the card processor; card is only sent when the method needs one.
        method: payMethod,
        amountUSD: totalUSD,
        currency: region.currency,
        card: needsCard
          ? {
              number: form.card,
              expiry: form.expiry,
              cvc: form.cvc,
              name: form.name.trim(),
            }
          : undefined,
      });
    } catch {
      payment = { ok: false, error: "generic" };
    }

    if (!mountedRef.current) return;

    if (!payment || !payment.ok) {
      // Decline / invalid -> stay on the payment step with a localized alert.
      setPayError(payErrorMessage(payment?.error));
      setPaying(false);
      return;
    }

    try {
      // Resolve the chosen shipping tier + a delivery estimate (upper-bound ETA
      // from now). Tracking number is assigned later by the admin (left null).
      const shippingDef = getShippingMethod(shipMethod);
      const estimatedDeliveryDate = estimateDelivery(shipMethod, Date.now());
      const order = await placeOrder({
        items,
        subtotalUSD,
        discountUSD,
        shippingUSD,
        totalUSD,
        paymentId: payment.id,
        // New order lifecycle fields.
        paymentMethod: payMethod,
        paymentStatus: payment.status,
        shippingMethod: shipMethod,
        courierProvider: shippingDef.courier,
        estimatedDeliveryDate,
        contact: {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
        },
        shipping: {
          address: form.address.trim(),
          city: form.city.trim(),
          regionCode: region.code,
        },
      });
      if (!mountedRef.current) return;
      setPlacedOrder(order);
      setPlaced(true);
    } catch {
      if (!mountedRef.current) return;
      setPayError(tx.errPayGeneric);
    } finally {
      if (mountedRef.current) setPaying(false);
    }
  }, [
    paying,
    payErrorMessage,
    placeOrder,
    items,
    subtotalUSD,
    discountUSD,
    shippingUSD,
    totalUSD,
    form,
    region,
    tx,
    payMethod,
    needsCard,
    shipMethod,
  ]);

  const goNext = useCallback(() => {
    STEP_FIELDS[step].forEach((f) =>
      setTouched((t) => ({ ...t, [f]: true }))
    );
    if (!stepValid) return;
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
    } else if (isAuthed) {
      // Final step + authed -> charge the card then place the real order.
      commitOrder();
    }
    // Final step + NOT authed: the gate renders below the form; the Place
    // Order button is hidden so we never reach here unauthenticated.
  }, [STEP_FIELDS, step, stepValid, isAuthed, commitOrder]);

  const goBack = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  const handleClose = useCallback(() => {
    closeCheckout();
  }, [closeCheckout]);

  // Sign-in gate CTA: close checkout, route to /login, remember to come back
  // to the storefront after auth.
  const handleGateSignIn = useCallback(() => {
    closeCheckout();
    navigate("/login", { state: { from: { pathname: "/" } } });
  }, [closeCheckout, navigate]);

  // Success -> track the just-placed order.
  const handleTrackOrder = useCallback(() => {
    const id = placedOrder?.id;
    closeCheckout();
    if (id) navigate("/account/orders/" + id);
    else navigate("/account/orders");
  }, [placedOrder, closeCheckout, navigate]);

  // Success -> copy the order number to the clipboard (brief confirmation).
  const handleCopyOrder = useCallback(() => {
    const id = placedOrder?.id || orderNumber;
    if (!id) return;
    try {
      navigator.clipboard?.writeText(String(id));
      setCopiedOrder(true);
      setTimeout(() => setCopiedOrder(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }, [placedOrder, orderNumber]);

  // Success -> keep shopping (clears the cart as before).
  const handleFinish = useCallback(() => {
    clearCart();
    closeCheckout();
  }, [clearCart, closeCheckout]);

  // ---- Escape + focus trap -------------------------------------------------
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll(
          'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, handleClose]);

  // ---- Body scroll lock + move focus in ------------------------------------
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const t = window.setTimeout(() => closeBtnRef.current?.focus(), 60);
      return () => {
        document.body.style.overflow = prev;
        window.clearTimeout(t);
      };
    }
  }, [isOpen]);

  // Returns null AFTER all hooks have run.
  if (!isOpen) return null;

  const vehicleLabel = vehicle
    ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
    : "";

  // ---- Order summary block (reused) ----------------------------------------
  const summary = (
    <div className="flex h-full flex-col">
      <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-textPrimary">
        <Package size={16} aria-hidden="true" className="text-primary" />
        {tx.summaryTitle}
        <span className="ms-auto font-mono text-[11px] font-normal tracking-normal text-textMuted">
          <span className="tabular-nums">{count}</span>{" "}
          {count === 1 ? tx.item : tx.items}
        </span>
      </h3>

      <ul className="mb-3 max-h-44 space-y-2 overflow-y-auto pe-1 lg:max-h-none lg:flex-1">
        {items.map((it) => {
          const name = isRTL && it.nameAr ? it.nameAr : it.name;
          return (
            <li key={it.id} className="flex items-center gap-2.5">
              <MiniThumb icon={it.icon} accent={it.accent} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-sans text-xs font-semibold text-textPrimary">
                  {name}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-wide text-textMuted">
                  {tx.qty} {it.qty}
                </p>
              </div>
              <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-textPrimary">
                {format(it.priceUSD * it.qty)}
              </span>
            </li>
          );
        })}
      </ul>

      <dl className="space-y-1.5 border-t border-border/60 pt-3">
        <div className="flex items-center justify-between">
          <dt className="font-sans text-sm text-textSecondary">{tx.subtotal}</dt>
          <dd className="font-mono text-sm tabular-nums text-textPrimary">
            {format(subtotalUSD)}
          </dd>
        </div>
        {discountUSD > 0 && (
          <div className="flex items-center justify-between">
            <dt className="font-sans text-sm text-success">{tx.discount}</dt>
            <dd className="font-mono text-sm font-semibold tabular-nums text-success">
              -{format(discountUSD)}
            </dd>
          </div>
        )}
        <div className="flex items-center justify-between">
          <dt className="font-sans text-sm text-textSecondary">{tx.shipping}</dt>
          <dd
            className={`font-mono text-sm tabular-nums ${
              shippingUSD === 0
                ? "font-semibold text-accent"
                : "text-textPrimary"
            }`}
          >
            {shippingUSD === 0 ? tx.free : format(shippingUSD)}
          </dd>
        </div>
        <div className="mt-1 flex items-center justify-between border-t border-border/60 pt-2.5">
          <dt className="font-display text-base font-bold text-textPrimary">
            {tx.total}
          </dt>
          <dd className="font-display text-xl font-extrabold tabular-nums text-textPrimary">
            {format(totalUSD)}
          </dd>
        </div>
      </dl>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[70] flex items-stretch justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={tx.title}
    >
      {/* Backdrop */}
      <div
        onClick={handleClose}
        aria-hidden="true"
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm ${
          reduceMotion ? "" : "animate-fade-up"
        }`}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`relative flex max-h-full w-full flex-col overflow-hidden border border-border bg-surface shadow-elevated sm:max-w-3xl sm:rounded-2xl ${
          reduceMotion ? "" : "animate-garage-open"
        }`}
      >
        {/* Header */}
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-primary/30">
              <Lock size={17} aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold leading-none text-textPrimary">
                {tx.title}
              </h2>
              {!placed && (
                <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-textMuted">
                  {tx.stepOf(step + 1, TOTAL_STEPS)}
                </p>
              )}
            </div>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={handleClose}
            aria-label={tx.closeAria}
            className="grid h-9 w-9 place-items-center rounded-lg text-textSecondary transition-colors duration-150 hover:bg-border/50 hover:text-textPrimary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        {/* Body */}
        <div className="grid flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[1fr_22rem]">
          {/* LEFT — gauge + flow / success */}
          <div className="flex flex-col gap-5 p-5 sm:p-6">
            {placed ? (
              // ---------- SUCCESS ----------
              <div
                className={`flex flex-1 flex-col items-center justify-center py-8 text-center ${
                  reduceMotion ? "" : "animate-fade-up"
                }`}
              >
                <span
                  className={`mb-5 grid h-20 w-20 place-items-center rounded-full bg-success/15 text-success ring-1 ring-inset ring-success/30 ${
                    reduceMotion ? "" : "animate-confetti-pop"
                  }`}
                >
                  <PartyPopper size={40} aria-hidden="true" />
                </span>
                <h3 className="font-display text-2xl font-extrabold text-textPrimary">
                  {tx.successTitle}
                </h3>
                <p className="mt-2 max-w-sm font-sans text-sm text-textSecondary">
                  {tx.successBody}
                </p>
                {hasVehicle && (
                  <p className="mt-1 font-sans text-sm text-textMuted">
                    {tx.successVehicle(vehicleLabel)}
                  </p>
                )}
                <div className="mt-5 rounded-xl border border-border bg-surfaceElevated px-5 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-textMuted">
                    {tx.orderNo}
                  </p>
                  <div className="mt-1 flex items-center justify-center gap-2">
                    <p
                      className="font-mono text-lg font-bold tracking-wide text-primary"
                      dir="ltr"
                    >
                      {placedOrder?.id || orderNumber}
                    </p>
                    <button
                      type="button"
                      onClick={handleCopyOrder}
                      aria-label={tx.copyOrder}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border text-textMuted transition-colors hover:bg-surface hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                    >
                      {copiedOrder ? (
                        <Check size={14} aria-hidden="true" className="text-success" />
                      ) : (
                        <Copy size={14} aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  {copiedOrder && (
                    <p className="mt-1 font-sans text-[11px] font-semibold text-success">
                      {tx.copyDone}
                    </p>
                  )}
                </div>
                <div className="mt-6 flex w-full max-w-sm flex-col gap-3 sm:flex-row sm:justify-center">
                  <button
                    type="button"
                    onClick={handleTrackOrder}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-display text-sm font-bold uppercase tracking-wide text-white shadow-glow transition-all duration-300 hover:bg-primaryHover hover:shadow-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                  >
                    <Truck
                      size={16}
                      aria-hidden="true"
                      className="rtl:-scale-x-100"
                    />
                    {tx.trackOrder}
                  </button>
                  <button
                    type="button"
                    onClick={handleFinish}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-6 py-3 font-display text-sm font-bold uppercase tracking-wide text-textSecondary transition-colors duration-200 hover:border-primary/40 hover:text-textPrimary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    {tx.continueShopping}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Boost gauge */}
                <BoostGauge
                  value={gaugeValue}
                  labels={tx}
                  reduceMotion={reduceMotion}
                  complete={false}
                />

                {/* Step labels */}
                <ol className="flex items-center justify-center gap-2">
                  {tx.steps.map((label, i) => {
                    const Icon = STEP_ICONS[i];
                    const done = i < step;
                    const active = i === step;
                    return (
                      <li key={label} className="flex items-center gap-2">
                        <span
                          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide transition-colors duration-300 ${
                            active
                              ? "bg-primary/15 text-primary ring-1 ring-inset ring-primary/30"
                              : done
                              ? "text-success"
                              : "text-textMuted"
                          }`}
                        >
                          {done ? (
                            <Check size={13} aria-hidden="true" />
                          ) : (
                            <Icon size={13} aria-hidden="true" />
                          )}
                          {label}
                        </span>
                        {i < tx.steps.length - 1 && (
                          <span
                            aria-hidden="true"
                            className="h-px w-4 bg-border"
                          />
                        )}
                      </li>
                    );
                  })}
                </ol>

                {/* Step form */}
                <div
                  key={step}
                  className={reduceMotion ? "" : "animate-fade-up"}
                >
                  {step === 0 && (
                    <fieldset className="space-y-3.5">
                      <legend className="mb-1 font-display text-base font-bold text-textPrimary">
                        {tx.contactTitle}
                      </legend>
                      <p className="-mt-1 mb-2 font-sans text-xs text-textMuted">
                        {tx.contactHint}
                      </p>
                      <Field
                        id="co-name"
                        label={tx.name}
                        value={form.name}
                        onChange={(v) => {
                          setField("name")(v);
                          markTouched("name");
                        }}
                        placeholder={tx.namePh}
                        autoComplete="name"
                        error={showErr("name")}
                      />
                      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                        <Field
                          id="co-email"
                          label={tx.email}
                          type="email"
                          value={form.email}
                          onChange={(v) => {
                            setField("email")(v);
                            markTouched("email");
                          }}
                          placeholder={tx.emailPh}
                          autoComplete="email"
                          inputMode="email"
                          ltr
                          error={showErr("email")}
                        />
                        <Field
                          id="co-phone"
                          label={tx.phone}
                          type="tel"
                          value={form.phone}
                          onChange={(v) => {
                            setField("phone")(v);
                            markTouched("phone");
                          }}
                          placeholder={tx.phonePh}
                          autoComplete="tel"
                          inputMode="tel"
                          ltr
                          error={showErr("phone")}
                        />
                      </div>
                    </fieldset>
                  )}

                  {step === 1 && (
                    <fieldset className="space-y-3.5">
                      <legend className="mb-1 font-display text-base font-bold text-textPrimary">
                        {tx.shippingTitle}
                      </legend>
                      {hasVehicle && (
                        <p className="-mt-1 mb-2 flex items-center gap-1.5 font-sans text-xs font-medium text-primary">
                          <Truck
                            size={13}
                            aria-hidden="true"
                            className="rtl:-scale-x-100"
                          />
                          {tx.shippingForVehicle(vehicleLabel)}
                        </p>
                      )}
                      <Field
                        id="co-address"
                        label={tx.address}
                        value={form.address}
                        onChange={(v) => {
                          setField("address")(v);
                          markTouched("address");
                        }}
                        placeholder={tx.addressPh}
                        autoComplete="street-address"
                        error={showErr("address")}
                      />
                      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                        <Field
                          id="co-city"
                          label={tx.city}
                          value={form.city}
                          onChange={(v) => {
                            setField("city")(v);
                            markTouched("city");
                          }}
                          placeholder={tx.cityPh}
                          autoComplete="address-level2"
                          error={showErr("city")}
                        />
                        <div>
                          <label
                            htmlFor="co-region"
                            className="mb-1.5 block font-sans text-xs font-medium text-textSecondary"
                          >
                            {tx.region}
                          </label>
                          <div
                            id="co-region"
                            className="flex items-center gap-2 rounded-lg border border-border bg-surfaceElevated px-3 py-2.5 font-sans text-sm text-textPrimary"
                          >
                            <span aria-hidden="true">{region.flag}</span>
                            <span>{region.country}</span>
                            <span className="ms-auto font-mono text-[11px] text-textMuted">
                              {region.currency}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Shipping-method selector — name/desc/ETA/price per tier.
                          Radiogroup of selectable cards; the chosen id drives the
                          courier + delivery estimate at order placement. */}
                      <div
                        role="radiogroup"
                        aria-label={tx.shipMethodLabel}
                        className="space-y-2"
                      >
                        <p className="font-sans text-xs font-medium text-textSecondary">
                          {tx.shipMethodLabel}
                        </p>
                        {shipMethods.map((m) => {
                          const selected = shipMethod === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              role="radio"
                              aria-checked={selected}
                              onClick={() => setShipMethod(m.id)}
                              className={`flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-start transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                                selected
                                  ? "border-primary/60 bg-primary/5 ring-1 ring-inset ring-primary/30"
                                  : "border-border bg-surface hover:border-primary/40"
                              }`}
                            >
                              <span
                                aria-hidden="true"
                                className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 transition-colors duration-200 ${
                                  selected
                                    ? "border-primary"
                                    : "border-border"
                                }`}
                              >
                                {selected && (
                                  <span className="h-2 w-2 rounded-full bg-primary" />
                                )}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="flex items-center justify-between gap-2">
                                  <span className="font-display text-sm font-bold text-textPrimary">
                                    {m.name[lang] || m.name.en}
                                  </span>
                                  <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-textPrimary">
                                    {m.priceUSD === 0 ? tx.free : format(m.priceUSD)}
                                  </span>
                                </span>
                                <span className="mt-0.5 block font-sans text-[11px] text-textMuted">
                                  {m.desc[lang] || m.desc.en}
                                </span>
                                <span className="mt-1 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide text-textSecondary">
                                  <Truck
                                    size={11}
                                    aria-hidden="true"
                                    className="rtl:-scale-x-100"
                                  />
                                  {tx.shipEta(m.etaDays[0], m.etaDays[1])}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>
                  )}

                  {step === 2 && (
                    <fieldset className="space-y-3.5">
                      <legend className="mb-1 font-display text-base font-bold text-textPrimary">
                        {tx.paymentTitle}
                      </legend>
                      <p className="-mt-1 mb-2 flex items-center gap-1.5 font-sans text-xs text-textMuted">
                        <ShieldCheck
                          size={13}
                          aria-hidden="true"
                          className="text-success"
                        />
                        {tx.paymentHint}
                      </p>

                      {/* Payment-method selector — segmented buttons sourced from
                          PAYMENT_METHODS (region-filtered). Selecting a method
                          toggles whether the card fields render below. */}
                      <div
                        role="radiogroup"
                        aria-label={tx.payMethodLabel}
                        className="space-y-2"
                      >
                        <p className="font-sans text-xs font-medium text-textSecondary">
                          {tx.payMethodLabel}
                        </p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {payMethodsForRegion.map((m) => {
                            const selected = payMethod === m.id;
                            return (
                              <button
                                key={m.id}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                onClick={() => {
                                  setPayMethod(m.id);
                                  if (payError) setPayError(null);
                                }}
                                className={`flex items-center justify-center rounded-lg border px-2.5 py-2 text-center font-sans text-xs font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                                  selected
                                    ? "border-primary/60 bg-primary/10 text-primary ring-1 ring-inset ring-primary/30"
                                    : "border-border bg-surface text-textSecondary hover:border-primary/40 hover:text-textPrimary"
                                }`}
                              >
                                {tx.payMethods[m.id] || m.id}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {needsCard ? (
                        <>
                          <div>
                            <Field
                              id="co-card"
                              label={tx.cardNumber}
                              value={form.card}
                              onChange={(v) => {
                                // Group into 4s, mask to digits+spaces, max 19 chars.
                                const digits = v
                                  .replace(/\D/g, "")
                                  .slice(0, 16);
                                const grouped = digits
                                  .replace(/(.{4})/g, "$1 ")
                                  .trim();
                                setField("card")(grouped);
                                markTouched("card");
                                if (payError) setPayError(null);
                              }}
                              placeholder={tx.cardPh}
                              inputMode="numeric"
                              autoComplete="cc-number"
                              ltr
                              maxLength={19}
                              error={showErr("card")}
                            />
                            {/* Detected-brand badge — appears once the number maps
                                to a known scheme (mada / visa / mastercard / amex). */}
                            {cardBrand !== "unknown" && (
                              <span
                                className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-border bg-surfaceElevated px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-textSecondary"
                                aria-label={cardBrand}
                              >
                                <CreditCard
                                  size={11}
                                  aria-hidden="true"
                                  className="text-primary"
                                />
                                <span dir="ltr">{CARD_BRAND_LABEL[cardBrand]}</span>
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-3.5">
                            <Field
                              id="co-expiry"
                              label={tx.expiry}
                              value={form.expiry}
                              onChange={(v) => {
                                let d = v.replace(/\D/g, "").slice(0, 4);
                                if (d.length >= 3)
                                  d = `${d.slice(0, 2)}/${d.slice(2)}`;
                                setField("expiry")(d);
                                markTouched("expiry");
                                if (payError) setPayError(null);
                              }}
                              placeholder={tx.expiryPh}
                              inputMode="numeric"
                              autoComplete="cc-exp"
                              ltr
                              maxLength={5}
                              error={showErr("expiry")}
                            />
                            <Field
                              id="co-cvc"
                              label={tx.cvc}
                              type="password"
                              value={form.cvc}
                              onChange={(v) => {
                                setField("cvc")(
                                  v.replace(/\D/g, "").slice(0, 4)
                                );
                                markTouched("cvc");
                                if (payError) setPayError(null);
                              }}
                              placeholder={tx.cvcPh}
                              inputMode="numeric"
                              autoComplete="cc-csc"
                              ltr
                              maxLength={4}
                              error={showErr("cvc")}
                            />
                          </div>
                        </>
                      ) : (
                        // Non-card methods: a short localized note instead of the
                        // card form (COD pays on delivery; wallet/BNPL redirect).
                        <p className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 font-sans text-[12px] font-medium text-textSecondary">
                          {payMethod === "cod" ? (
                            <Truck
                              size={15}
                              aria-hidden="true"
                              className="mt-px shrink-0 text-primary rtl:-scale-x-100"
                            />
                          ) : (
                            <CreditCard
                              size={15}
                              aria-hidden="true"
                              className="mt-px shrink-0 text-primary"
                            />
                          )}
                          {payMethod === "cod"
                            ? tx.codNote
                            : tx.redirectNote(tx.payMethods[payMethod] || payMethod)}
                        </p>
                      )}

                      {/* Decline / invalid charge error — localized live alert. */}
                      {payError && (
                        <p
                          role="alert"
                          className="flex items-start gap-1.5 rounded-lg border border-danger/50 bg-danger/5 px-3 py-2 font-sans text-[12px] font-medium text-danger"
                        >
                          <ShieldCheck
                            size={14}
                            aria-hidden="true"
                            className="mt-px shrink-0"
                          />
                          {payError}
                        </p>
                      )}

                    </fieldset>
                  )}
                </div>

                {/* Auth gate — final step requires a signed-in user before the
                    order can be placed. */}
                {step === TOTAL_STEPS - 1 && !isAuthed && (
                  <div
                    role="region"
                    aria-label={tx.gateTitle}
                    className="rounded-xl border border-primary/30 bg-primary/5 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary ring-1 ring-inset ring-primary/30">
                        <Lock size={16} aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-display text-sm font-bold text-textPrimary">
                          {tx.gateTitle}
                        </h4>
                        <p className="mt-1 font-sans text-xs text-textSecondary">
                          {tx.gateBody}
                        </p>
                        <button
                          type="button"
                          onClick={handleGateSignIn}
                          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-display text-xs font-bold uppercase tracking-wide text-white shadow-glow transition-all duration-300 hover:bg-primaryHover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                        >
                          <LogIn
                            size={15}
                            aria-hidden="true"
                            className="rtl:-scale-x-100"
                          />
                          {tx.gateSignIn}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Nav buttons */}
                <div className="mt-auto flex items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={goBack}
                    disabled={step === 0}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-4 py-2.5 font-sans text-sm font-semibold text-textSecondary transition-colors duration-200 hover:border-primary/40 hover:text-textPrimary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isRTL ? (
                      <ArrowRight size={16} aria-hidden="true" />
                    ) : (
                      <ArrowLeft size={16} aria-hidden="true" />
                    )}
                    {tx.back}
                  </button>
                  {/* On the final step the Place Order button only renders when
                      authed; otherwise the auth gate's sign-in CTA takes over. */}
                  {step === TOTAL_STEPS - 1 && !isAuthed ? (
                    <span aria-hidden="true" />
                  ) : (
                    <button
                      type="button"
                      onClick={goNext}
                      disabled={!stepValid || paying}
                      aria-busy={paying || undefined}
                      className="group inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 font-display text-sm font-bold uppercase tracking-wide text-white shadow-glow transition-all duration-300 hover:bg-primaryHover hover:shadow-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                    >
                      {step === TOTAL_STEPS - 1
                        ? paying
                          ? tx.processing
                          : tx.placeOrder
                        : tx.next}
                      {step === TOTAL_STEPS - 1 ? (
                        paying ? (
                          <Loader2
                            size={15}
                            aria-hidden="true"
                            className="animate-spin"
                          />
                        ) : (
                          <Lock size={15} aria-hidden="true" />
                        )
                      ) : isRTL ? (
                        <ArrowLeft
                          size={16}
                          aria-hidden="true"
                          className="transition-transform duration-200 group-hover:-translate-x-0.5"
                        />
                      ) : (
                        <ArrowRight
                          size={16}
                          aria-hidden="true"
                          className="transition-transform duration-200 group-hover:translate-x-0.5"
                        />
                      )}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* RIGHT — persistent order summary */}
          <aside className="border-t border-border bg-surfaceElevated/40 p-5 sm:p-6 lg:border-s lg:border-t-0">
            {summary}
          </aside>
        </div>
      </div>
    </div>
  );
}
