import { lazy, Suspense, useEffect } from "react";
import {
  Routes,
  Route,
  Outlet,
  Navigate,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  ShieldCheck,
  Truck,
  RotateCcw,
  Wrench,
  Mail,
  Phone,
  MapPin,
  Instagram,
  Twitter,
  Youtube,
  Facebook,
  Loader2,
} from "lucide-react";

import { ToastProvider, useToast } from "./context/ToastContext";
import Toaster from "./components/Toaster";

import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import { GeoProvider } from "./context/GeoContext";
import { GarageProvider } from "./context/GarageContext";
import { CartProvider } from "./context/CartContext";
import { CheckoutProvider } from "./context/CheckoutContext";
import { OrdersProvider } from "./context/OrdersContext";
import { ProductsProvider } from "./context/ProductsContext";
import { CatalogProvider } from "./context/CatalogContext";
import { ProductModalProvider } from "./context/ProductModalContext";
import { SettingsProvider } from "./context/SettingsContext";

import { useLang } from "./context/LanguageContext";
import { useGeo } from "./context/GeoContext";
import { useCatalog } from "./context/CatalogContext";
import { useSettings } from "./context/SettingsContext";
import { COMMON } from "./lib/i18n";

import Navbar from "./components/Navbar";
import CartDrawer from "./components/CartDrawer";
import MiniCart from "./components/MiniCart";
import ProductDetailModal from "./components/ProductDetailModal";
import CheckoutModal from "./components/CheckoutModal";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import BrandLogo from "./components/BrandLogo";
import WelcomeLanguageModal from "./components/WelcomeLanguageModal";

import Landing from "./pages/Landing";

/* Heavier, less-trafficked routes are code-split so the landing stays light. */
const AuthPage = lazy(() => import("./pages/AuthPage"));
const TrackOrder = lazy(() => import("./pages/TrackOrder"));
const InfoPage = lazy(() => import("./pages/InfoPage"));
const AccountLayout = lazy(() => import("./pages/account/AccountLayout"));
const ProfileSettings = lazy(() => import("./pages/account/ProfileSettings"));
const OrderHistory = lazy(() => import("./pages/account/OrderHistory"));
const OrderDetail = lazy(() => import("./pages/account/OrderDetail"));

/* Admin dashboard — role-gated, lazy so it never weighs on the storefront. */
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));

/* ----------------------------------------------------------------------------
   Footer — brand mark, link columns, GCC trust/payment marks, copyright.
   Built inline so the storefront ships a complete, polished page. Fully
   localized via a component-local STRINGS dict (+ shared COMMON) and RTL-aware
   through logical Tailwind utilities. Payment marks adapt to the active region
   (SAR shows GCC wallets; USD shows the international set). Links route via
   react-router: landing sections use "/#hash" (ScrollToHash scrolls them),
   "Track Order" goes to "/track".
---------------------------------------------------------------------------- */

const STRINGS = {
  en: {
    footerHeading: "Cabler Parts footer",
    backToTop: "Cabler Parts — home",
    blurb:
      "Engineered-to-standard performance parts for the Gulf. Every component is traceable by part number, verified for fitment, and backed across the GCC.",
    trust: [
      "ISO 9001 · OEM-Grade",
      "GCC-Wide Delivery",
      "2-Yr Warranty Returns",
    ],
    contact: {
      address: "Dammam Distribution Center, KSA",
      phone: "+966 800 000 000",
      email: "support@cablerparts.com",
    },
    comingSoon: "Page content coming soon",
    columns: [
      {
        title: "Catalog",
        links: [
          { label: "Braking", category: "Braking" },
          { label: "Suspension", category: "Suspension" },
          { label: "Engine", category: "Engine" },
          { label: "Electrical", category: "Electrical" },
          { label: "All Parts", category: "All" },
        ],
      },
      {
        title: "The Garage",
        links: [
          { label: "Build your Garage", garage: true },
          { label: "Verified Fitment", garage: true },
          { label: "Browse Catalog", category: "All" },
          { label: "Service History", soon: true },
        ],
      },
      {
        title: "Support",
        links: [
          { label: "Track Order", to: "/track" },
          { label: "Returns & Warranty", to: "/returns" },
          { label: "Shipping across GCC", to: "/shipping" },
          { label: "Contact Us", to: "/contact" },
        ],
      },
    ],
    securePayments: "Secure payments",
    complianceHeading: "Licenses & Compliance",
    crLabel: "Commercial Registration",
    vatLabel: "VAT",
    maroofLabel: "Maroof",
    legal: [
      { label: "Privacy", to: "/privacy" },
      { label: "Data Protection", to: "/pdpl" },
      { label: "Disclaimer", to: "/disclaimer" },
      { label: "Terms", to: "/terms" },
      { label: "Warranty", to: "/returns" },
    ],
    copyright: "© 2026 Cabler Parts — The Standard",
  },
  ar: {
    footerHeading: "تذييل كابلر بارتس",
    backToTop: "كابلر بارتس — الصفحة الرئيسية",
    blurb:
      "قطع أداء مهندَسة بمعايير الوكالة لمنطقة الخليج. كل قطعة قابلة للتتبّع برقمها، موثّقة التوافق، ومدعومة في جميع أنحاء دول الخليج.",
    trust: [
      "آيزو 9001 · بمستوى الوكالة",
      "توصيل لكل دول الخليج",
      "إرجاع بضمان سنتين",
    ],
    contact: {
      address: "مركز توزيع الدمّام، السعودية",
      phone: "+966 800 000 000",
      email: "support@cablerparts.com",
    },
    comingSoon: "المحتوى قريباً",
    columns: [
      {
        title: "الكتالوج",
        links: [
          { label: "المكابح", category: "Braking" },
          { label: "نظام التعليق", category: "Suspension" },
          { label: "المحرك", category: "Engine" },
          { label: "الكهرباء", category: "Electrical" },
          { label: "كل القطع", category: "All" },
        ],
      },
      {
        title: "المرآب",
        links: [
          { label: "أنشئ مرآبك", garage: true },
          { label: "توافق موثّق", garage: true },
          { label: "تصفّح الكتالوج", category: "All" },
          { label: "سجلّ الصيانة", soon: true },
        ],
      },
      {
        title: "الدعم",
        links: [
          { label: "تتبّع الطلب", to: "/track" },
          { label: "الإرجاع والضمان", to: "/returns" },
          { label: "الشحن داخل الخليج", to: "/shipping" },
          { label: "تواصل معنا", to: "/contact" },
        ],
      },
    ],
    securePayments: "مدفوعات آمنة",
    complianceHeading: "التراخيص والامتثال",
    crLabel: "السجل التجاري",
    vatLabel: "الرقم الضريبي",
    maroofLabel: "معروف",
    legal: [
      { label: "الخصوصية", to: "/privacy" },
      { label: "حماية البيانات", to: "/pdpl" },
      { label: "إخلاء المسؤولية", to: "/disclaimer" },
      { label: "الشروط", to: "/terms" },
      { label: "الضمان", to: "/returns" },
    ],
    copyright: "© 2026 كابلر بارتس — The Standard",
  },
};

const FOOTER_TRUST_ICONS = [ShieldCheck, Truck, RotateCcw];

/* ----------------------------------------------------------------------------
   Payment brand badges — authentic-looking inline SVGs (no external assets).
   Each renders a tasteful rounded card carrying the brand wordmark/glyph in
   its own colors. The visible set adapts to the active currency region: GCC
   wallets for SAR, the international set for USD.
---------------------------------------------------------------------------- */

/* Shared rounded card chrome around each brand mark. */
function PayCard({ label, bg = "#FFFFFF", border, children }) {
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className="inline-flex h-7 w-12 items-center justify-center overflow-hidden rounded-md border shadow-sm"
      style={{ backgroundColor: bg, borderColor: border || "rgba(0,0,0,0.08)" }}
    >
      {children}
    </span>
  );
}

function VisaMark() {
  return (
    <PayCard label="Visa" bg="#1A1F71">
      <span
        className="font-display text-[11px] font-bold italic tracking-tight text-white"
        aria-hidden="true"
      >
        VISA
      </span>
    </PayCard>
  );
}

function MastercardMark() {
  return (
    <PayCard label="Mastercard">
      <svg viewBox="0 0 48 30" className="h-5 w-auto" aria-hidden="true">
        <circle cx="19" cy="15" r="9" fill="#EB001B" />
        <circle cx="29" cy="15" r="9" fill="#F79E1B" />
        <path
          d="M24 8a9 9 0 0 1 0 14 9 9 0 0 1 0-14Z"
          fill="#FF5F00"
        />
      </svg>
    </PayCard>
  );
}

function MadaMark() {
  return (
    <PayCard label="mada">
      <svg viewBox="0 0 48 24" className="h-4 w-auto" aria-hidden="true">
        <text
          x="2"
          y="17"
          fontFamily="Arial, sans-serif"
          fontSize="13"
          fontWeight="700"
          fill="#231F20"
        >
          mada
        </text>
        <rect x="33" y="4" width="11" height="5" rx="1" fill="#84B740" />
        <rect x="33" y="11" width="11" height="5" rx="1" fill="#231F20" />
      </svg>
    </PayCard>
  );
}

function ApplePayMark() {
  return (
    <PayCard label="Apple Pay" bg="#000000" border="rgba(255,255,255,0.18)">
      <svg viewBox="0 0 60 24" className="h-3.5 w-auto" aria-hidden="true">
        <path
          d="M11.7 6.3c-.6.7-1.6 1.3-2.5 1.2-.1-1 .4-2 .9-2.6.6-.7 1.6-1.2 2.5-1.3.1 1-.3 2-.9 2.7Zm.9 1.4c-1.4-.1-2.6.8-3.2.8-.7 0-1.7-.7-2.7-.7-1.4 0-2.7.8-3.4 2-1.4 2.5-.4 6.2 1 8.2.7 1 1.5 2.1 2.5 2 1-.1 1.4-.6 2.6-.6s1.5.6 2.6.6 1.7-1 2.4-2c.7-1.1 1-2.1 1-2.2 0 0-2-.8-2-3 0-1.9 1.5-2.8 1.6-2.8-.9-1.3-2.3-1.5-2.8-1.5Z"
          fill="#FFFFFF"
        />
        <text
          x="20"
          y="17"
          fontFamily="Arial, sans-serif"
          fontSize="11"
          fontWeight="600"
          fill="#FFFFFF"
        >
          Pay
        </text>
      </svg>
    </PayCard>
  );
}

function AmexMark() {
  return (
    <PayCard label="American Express" bg="#2E77BC">
      <span
        className="font-display text-[8px] font-bold leading-tight text-white"
        aria-hidden="true"
      >
        AMEX
      </span>
    </PayCard>
  );
}

function PayPalMark() {
  return (
    <PayCard label="PayPal">
      <svg viewBox="0 0 48 24" className="h-4 w-auto" aria-hidden="true">
        <text
          x="3"
          y="17"
          fontFamily="Arial, sans-serif"
          fontSize="12"
          fontWeight="700"
          fontStyle="italic"
          fill="#003087"
        >
          Pay
        </text>
        <text
          x="24"
          y="17"
          fontFamily="Arial, sans-serif"
          fontSize="12"
          fontWeight="700"
          fontStyle="italic"
          fill="#009CDE"
        >
          Pal
        </text>
      </svg>
    </PayCard>
  );
}

function GooglePayMark() {
  return (
    <PayCard label="Google Pay">
      <svg viewBox="0 0 60 24" className="h-3.5 w-auto" aria-hidden="true">
        <text x="2" y="17" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="600">
          <tspan fill="#4285F4">G</tspan>
          <tspan fill="#EA4335">o</tspan>
          <tspan fill="#FBBC05">o</tspan>
          <tspan fill="#4285F4">g</tspan>
          <tspan fill="#34A853">l</tspan>
          <tspan fill="#EA4335">e</tspan>
        </text>
        <text
          x="40"
          y="17"
          fontFamily="Arial, sans-serif"
          fontSize="11"
          fontWeight="600"
          fill="#5F6368"
        >
          Pay
        </text>
      </svg>
    </PayCard>
  );
}

function TabbyMark() {
  return (
    <PayCard label="Tabby" bg="#3EE6B9">
      <span
        className="font-display text-[10px] font-bold tracking-tight"
        style={{ color: "#0A1F1A" }}
        aria-hidden="true"
      >
        tabby
      </span>
    </PayCard>
  );
}

function TamaraMark() {
  return (
    <PayCard label="Tamara" bg="#1E1B4B">
      <span
        className="font-display text-[9px] font-bold tracking-tight"
        style={{ color: "#F8C8DC" }}
        aria-hidden="true"
      >
        tamara
      </span>
    </PayCard>
  );
}

const PAYMENT_MARKS = {
  SA: [VisaMark, MastercardMark, MadaMark, ApplePayMark, TabbyMark, TamaraMark],
  US: [
    VisaMark,
    MastercardMark,
    AmexMark,
    ApplePayMark,
    PayPalMark,
    GooglePayMark,
  ],
};

/* Map a CMS payment provider (by its name) to a built-in inline-SVG mark, used
   as the fallback when that provider has no uploaded/linked logoUrl. Keyed by a
   normalized (lowercased, trimmed) name so "Apple Pay" / "apple pay" both hit. */
const PAYMENT_MARK_BY_NAME = {
  "apple pay": ApplePayMark,
  mada: MadaMark,
  visa: VisaMark,
  mastercard: MastercardMark,
  tabby: TabbyMark,
  tamara: TamaraMark,
  amex: AmexMark,
  "american express": AmexMark,
  paypal: PayPalMark,
  "google pay": GooglePayMark,
};

/* Generic fallback chip for an unknown provider with no logo — shows the
   provider's name in the shared rounded card chrome. */
function GenericPayMark({ name }) {
  return (
    <PayCard label={name || "Payment"} bg="#FFFFFF">
      <span
        className="px-1 font-display text-[8px] font-bold uppercase tracking-tight text-[#231F20] truncate"
        aria-hidden="true"
      >
        {name}
      </span>
    </PayCard>
  );
}

/* ----------------------------------------------------------------------------
   Social brand icons — lucide covers Instagram / X / YouTube; TikTok,
   Snapchat, and WhatsApp lack brand glyphs there, so they ship as small
   inline SVGs (currentColor so they inherit the link's hover color).
---------------------------------------------------------------------------- */

function TikTokIcon({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M16.5 3a5.6 5.6 0 0 0 4 3.9v3a8.5 8.5 0 0 1-4-1.2v6.1a6 6 0 1 1-6-6c.3 0 .6 0 .9.1v3.1a3 3 0 1 0 2.1 2.8V3h3Z" />
    </svg>
  );
}

function SnapchatIcon({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 2.2c2.6 0 4.3 2 4.4 4.6 0 .6 0 1.2-.1 1.7.3.2.7.2 1.1.1.5-.2.9.1 1 .5.1.5-.3.8-.8 1-.5.2-1.2.4-1.3.8-.1.3.1.6.3.9.6.9 1.6 1.6 2.7 2 .4.1.5.4.4.7-.2.6-1.3.9-2.1 1-.1.3-.1.7-.3.9-.2.2-.6.1-1 .1-.6 0-1.3-.1-2 .2-.6.3-1.1.9-2.3.9s-1.7-.6-2.3-.9c-.7-.3-1.4-.2-2-.2-.4 0-.8.1-1-.1-.2-.2-.2-.6-.3-.9-.8-.1-1.9-.4-2.1-1-.1-.3 0-.6.4-.7 1.1-.4 2.1-1.1 2.7-2 .2-.3.4-.6.3-.9-.1-.4-.8-.6-1.3-.8-.5-.2-.9-.5-.8-1 .1-.4.5-.7 1-.5.4.1.8.1 1.1-.1-.1-.5-.1-1.1-.1-1.7C7.7 4.2 9.4 2.2 12 2.2Z" />
    </svg>
  );
}

function WhatsAppIcon({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.4A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A8 8 0 1 1 12 20Zm4.4-6c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1-.7-.3-1.4-.7-2-1.4-.4-.5-.8-1-.9-1.2-.1-.2 0-.4.1-.5l.4-.4c.1-.1.2-.3.2-.4.1-.2 0-.3 0-.4 0-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2 1 2.4c.1.2 1.6 2.5 4 3.4.6.2 1 .4 1.3.5.6.2 1.1.2 1.5.1.5-.1 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1-.1-.1-.2-.1-.4-.2Z" />
    </svg>
  );
}

/* Social channels — keyed to settings.social fields. Each row is rendered ONLY
   when settings.social[key] holds a non-empty URL (admin-managed via the CMS).
   `label` is bilingual so screen-reader text follows the active language. */
const SOCIAL_CHANNELS = [
  {
    key: "instagram",
    Icon: Instagram,
    label: { en: "Cabler Parts on Instagram", ar: "كابلر بارتس على إنستغرام" },
  },
  {
    key: "x",
    Icon: Twitter,
    label: { en: "Cabler Parts on X", ar: "كابلر بارتس على X" },
  },
  {
    key: "youtube",
    Icon: Youtube,
    label: { en: "Cabler Parts on YouTube", ar: "كابلر بارتس على يوتيوب" },
  },
  {
    key: "facebook",
    Icon: Facebook,
    label: { en: "Cabler Parts on Facebook", ar: "كابلر بارتس على فيسبوك" },
  },
  {
    key: "tiktok",
    Icon: TikTokIcon,
    label: { en: "Cabler Parts on TikTok", ar: "كابلر بارتس على تيك توك" },
  },
  {
    key: "snapchat",
    Icon: SnapchatIcon,
    label: { en: "Cabler Parts on Snapchat", ar: "كابلر بارتس على سناب شات" },
  },
  {
    key: "whatsapp",
    Icon: WhatsAppIcon,
    label: { en: "Cabler Parts on WhatsApp", ar: "كابلر بارتس على واتساب" },
  },
];

function Footer() {
  const { lang } = useLang();
  const { region } = useGeo();
  const { showToast } = useToast();
  const { settings } = useSettings();
  const { setCategory } = useCatalog();
  const navigate = useNavigate();
  const tx = STRINGS[lang];

  // CMS-driven contact + footer tagline (fall back to the localized defaults).
  const cmsContact = settings?.contact || {};
  const contactAddress =
    (cmsContact.address && cmsContact.address[lang]) || tx.contact.address;
  const contactPhone = cmsContact.phone || tx.contact.phone;
  const contactEmail = cmsContact.email || tx.contact.email;
  const footerTagline =
    (settings?.footer?.tagline && settings.footer.tagline[lang]) || tx.blurb;

  // CMS-driven payments row (fall back to the region-aware built-in set).
  const cmsPayments = Array.isArray(settings?.payments) ? settings.payments : [];

  // CMS-driven social links — only channels with a non-empty URL are shown.
  const cmsSocial = settings?.social || {};
  const socialLinks = SOCIAL_CHANNELS.filter((s) => {
    const url = cmsSocial[s.key];
    return typeof url === "string" && url.trim() !== "";
  });

  // CMS-driven legal/trust compliance — CR + VAT numbers, the Maroof trust
  // badge, and any business licenses. Owner fills these in later, so every
  // piece is opt-in: we only render a value when it's a non-empty string, and
  // skip the whole block when nothing is present.
  const compliance = settings?.compliance || {};
  const crNumber =
    typeof compliance.crNumber === "string" ? compliance.crNumber.trim() : "";
  const vatNumber =
    typeof compliance.vatNumber === "string" ? compliance.vatNumber.trim() : "";
  const maroof = compliance.maroof || {};
  const maroofUrl =
    typeof maroof.url === "string" ? maroof.url.trim() : "";
  const licenses = Array.isArray(compliance.licenses)
    ? compliance.licenses
    : [];
  const hasCompliance =
    crNumber !== "" ||
    vatNumber !== "" ||
    maroofUrl !== "" ||
    licenses.length > 0;

  // Catalog/Garage footer links REALLY filter: set the category, then navigate
  // to the landing's #catalog — ScrollToHash performs the single scroll (works
  // from any route). One scroll trigger only, so no double-scroll jump.
  const goCategory = (category) => {
    setCategory(category || "All");
    navigate("/#catalog");
  };
  const goGarage = () => {
    navigate("/#garage");
  };

  const paymentMarks = PAYMENT_MARKS[region.code] || PAYMENT_MARKS.SA;

  return (
    <footer
      className="relative mt-8 border-t border-border bg-surface"
      aria-labelledby="footer-heading"
    >
      <h2 id="footer-heading" className="sr-only">
        {tx.footerHeading}
      </h2>

      {/* hairline ignition glow at the top edge */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
      />

      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Brand column */}
          <div>
            <Link
              to="/"
              className="inline-flex items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              aria-label={tx.backToTop}
            >
              <BrandLogo className="h-10 w-10" withWordmark />
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-relaxed text-textSecondary text-balance text-start">
              {footerTagline}
            </p>

            {/* Trust row */}
            <ul className="mt-5 flex flex-col gap-2">
              {tx.trust.map((label, i) => {
                const Icon = FOOTER_TRUST_ICONS[i];
                return (
                  <li
                    key={label}
                    className="flex items-center gap-2 text-xs text-textSecondary"
                  >
                    <Icon
                      className="h-4 w-4 shrink-0 text-accent"
                      aria-hidden="true"
                    />
                    {label}
                  </li>
                );
              })}
            </ul>

            {/* Contact */}
            <ul className="mt-5 flex flex-col gap-2 font-mono text-xs text-textMuted">
              <li className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                {contactAddress}
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <span dir="ltr" className="tabular-nums">
                  {contactPhone}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <span dir="ltr">{contactEmail}</span>
              </li>
            </ul>

            {/* Compliance — legally-required trust signals for KSA commerce:
                Commercial Registration + VAT numbers (mono chips), the Maroof
                trust badge, and any business licenses. Every piece is opt-in
                (owner fills them via the CMS), so the whole section only mounts
                once at least one value exists. */}
            {hasCompliance && (
              <div className="mt-6">
                <h3 className="flex items-center gap-2 font-display text-xs font-700 uppercase tracking-wider text-textPrimary">
                  <ShieldCheck
                    className="h-3.5 w-3.5 text-primary"
                    aria-hidden="true"
                  />
                  {tx.complianceHeading}
                </h3>

                {/* CR + VAT — small mono chips, Latin numerals stay LTR. */}
                {(crNumber !== "" || vatNumber !== "") && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {crNumber !== "" && (
                      <li className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surfaceElevated px-2 py-1 font-mono text-[11px] text-textSecondary">
                        <span>{tx.crLabel}:</span>
                        <span dir="ltr" className="tabular-nums text-textPrimary">
                          {crNumber}
                        </span>
                      </li>
                    )}
                    {vatNumber !== "" && (
                      <li className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surfaceElevated px-2 py-1 font-mono text-[11px] text-textSecondary">
                        <span>{tx.vatLabel}:</span>
                        <span dir="ltr" className="tabular-nums text-textPrimary">
                          {vatNumber}
                        </span>
                      </li>
                    )}
                  </ul>
                )}

                {/* Trust badges — Maroof + business licenses. Each links out
                    (new tab) when a URL is set, and shows its uploaded logo
                    when one is present, else a tidy text badge. */}
                {(maroofUrl !== "" || licenses.length > 0) && (
                  <ul className="mt-3 flex flex-wrap items-center gap-2.5">
                    {maroofUrl !== "" && (
                      <li>
                        <a
                          href={maroofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={tx.maroofLabel}
                          title={tx.maroofLabel}
                          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surfaceElevated px-2 py-1 text-[11px] text-textSecondary transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                        >
                          {maroof.logoUrl ? (
                            <img
                              src={maroof.logoUrl}
                              alt={tx.maroofLabel}
                              className="h-5 w-auto object-contain"
                              loading="lazy"
                            />
                          ) : (
                            <span className="font-display font-700">
                              {tx.maroofLabel}
                            </span>
                          )}
                        </a>
                      </li>
                    )}

                    {licenses.map((lic, i) => {
                      const name =
                        typeof lic?.name === "string"
                          ? lic.name
                          : (lic?.name && (lic.name[lang] || lic.name.en)) || "";
                      const number =
                        typeof lic?.number === "string"
                          ? lic.number.trim()
                          : "";
                      const url =
                        typeof lic?.url === "string" ? lic.url.trim() : "";
                      if (!name && !number && !lic?.logoUrl) return null;

                      const inner = (
                        <>
                          {lic?.logoUrl ? (
                            <img
                              src={lic.logoUrl}
                              alt={name || tx.complianceHeading}
                              className="h-5 w-auto object-contain"
                              loading="lazy"
                            />
                          ) : (
                            name && (
                              <span className="font-display font-700">
                                {name}
                              </span>
                            )
                          )}
                          {number !== "" && (
                            <span dir="ltr" className="font-mono tabular-nums">
                              {number}
                            </span>
                          )}
                        </>
                      );

                      const chipClass =
                        "inline-flex items-center gap-1.5 rounded-md border border-border bg-surfaceElevated px-2 py-1 text-[11px] text-textSecondary";

                      return (
                        <li key={lic?.id || `${name}-${i}`}>
                          {url !== "" ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={name || tx.complianceHeading}
                              title={name || tx.complianceHeading}
                              className={`${chipClass} transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60`}
                            >
                              {inner}
                            </a>
                          ) : (
                            <span className={chipClass} title={name || undefined}>
                              {inner}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Link columns */}
          {tx.columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="flex items-center gap-2 font-display text-sm font-700 uppercase tracking-wider text-textPrimary">
                <Wrench className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                {col.title}
              </h3>
              <ul className="mt-4 flex flex-col gap-2.5">
                {col.links.map((link) => {
                  const linkClass =
                    "group inline-flex items-center text-sm text-textSecondary transition-colors duration-200 hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 rounded";
                  const inner = (
                    <span className="relative">
                      {link.label}
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-0 -bottom-0.5 h-px origin-[var(--underline-origin)] scale-x-0 bg-primary transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100 motion-reduce:transition-none"
                        style={{
                          "--underline-origin":
                            lang === "ar" ? "right" : "left",
                        }}
                      />
                    </span>
                  );
                  // Each footer link routes by intent:
                  //  - category: REALLY filter the catalog + scroll to #catalog
                  //  - garage:   scroll to the #garage section
                  //  - soon:     polite bilingual "coming soon" toast (no 404)
                  //  - to:       a plain react-router destination (e.g. /track)
                  let onActivate = null;
                  if (link.category !== undefined) {
                    onActivate = () => goCategory(link.category);
                  } else if (link.garage) {
                    onActivate = goGarage;
                  } else if (link.soon || (!link.to && !link.category)) {
                    onActivate = () => showToast(tx.comingSoon);
                  }

                  return (
                    <li key={link.label}>
                      {link.to ? (
                        <Link to={link.to} className={linkClass}>
                          {inner}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={onActivate}
                          className={`${linkClass} text-start`}
                        >
                          {inner}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>
          ))}
        </div>

        {/* Payment + social strip */}
        <div className="mt-12 flex flex-col gap-6 border-t border-border pt-8 lg:flex-row lg:items-center lg:justify-between">
          {/* Region-aware payment marks */}
          <div className="flex flex-col gap-2.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-textMuted">
              {tx.securePayments} · {region.currency}
            </span>
            <ul className="flex flex-wrap items-center gap-2">
              {cmsPayments.length > 0
                ? cmsPayments.map((p) => {
                    // Uploaded/linked logo → render as an <img> in a consistent
                    // aspect-ratio chip; otherwise fall back to the matching
                    // built-in inline-SVG brand mark (or a generic name chip).
                    if (p.logoUrl) {
                      return (
                        <li key={p.id || p.name}>
                          <span
                            role="img"
                            aria-label={p.name}
                            title={p.name}
                            className="inline-flex h-7 w-12 items-center justify-center overflow-hidden rounded-md border border-black/10 bg-white shadow-sm"
                          >
                            <img
                              src={p.logoUrl}
                              alt={p.name}
                              className="h-full w-full object-contain"
                              loading="lazy"
                            />
                          </span>
                        </li>
                      );
                    }
                    const Mark =
                      PAYMENT_MARK_BY_NAME[(p.name || "").trim().toLowerCase()];
                    return (
                      <li key={p.id || p.name}>
                        {Mark ? <Mark /> : <GenericPayMark name={p.name} />}
                      </li>
                    );
                  })
                : paymentMarks.map((Mark, i) => (
                    <li key={i}>
                      <Mark />
                    </li>
                  ))}
            </ul>
          </div>

          {/* Social — rendered from CMS settings.social (non-empty URLs only) */}
          {socialLinks.length > 0 && (
            <ul className="flex items-center gap-2.5">
              {socialLinks.map(({ key, Icon, label }) => {
                const href = cmsSocial[key];
                const aria = label[lang] || label.en;
                return (
                  <li key={key}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={aria}
                      title={aria}
                      className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surfaceElevated text-textSecondary transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                    >
                      <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Copyright */}
        <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6 text-xs text-textMuted sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono">{tx.copyright}</p>
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {tx.legal.map(({ label, to }) => (
              <li key={label}>
                {/* Legal pages route to their real InfoPage (CMS content or an
                    editable coming-soon fallback) — no more 404/toast. */}
                <Link
                  to={to}
                  className="transition-colors duration-200 hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 rounded"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

/* ----------------------------------------------------------------------------
   ScrollToHash — router-aware smooth anchor scrolling.

   On every location change it (a) installs a smooth scroll-behavior +
   scroll-padding-top on <html> so anchored navigation clears the sticky
   navbar, then (b) if the URL carries a hash, scrolls that element into view
   (after a paint so lazily-mounted sections exist). reduced-motion safe;
   re-runs on dir change so it survives an LTR ⇄ RTL switch.
---------------------------------------------------------------------------- */
function ScrollToHash() {
  const { hash, pathname } = useLocation();
  const { dir } = useLang();

  // Persistent <html> scroll styling (smooth + navbar offset).
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const prevBehavior = root.style.scrollBehavior;
    const prevScrollPad = root.style.scrollPaddingTop;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!reduce) root.style.scrollBehavior = "smooth";
    root.style.scrollPaddingTop = "84px";

    return () => {
      root.style.scrollBehavior = prevBehavior;
      root.style.scrollPaddingTop = prevScrollPad;
    };
  }, [dir]);

  // Scroll to the hashed element (or top) on navigation.
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const reduce =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior = reduce ? "auto" : "smooth";

    if (!hash) {
      // Plain navigation → return to top.
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }

    // Cross-route hashes (e.g. "/#catalog" navigated to FROM /about) require the
    // landing's sections to mount + paint before they exist in the DOM. We retry
    // across a few frames until the target appears, then scroll once.
    let rafId = 0;
    let attempts = 0;
    const MAX_ATTEMPTS = 30; // ~0.5s at 60fps — covers a route swap + paint
    const tryScroll = () => {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior, block: "start" });
        return;
      }
      if (attempts++ < MAX_ATTEMPTS) {
        rafId = window.requestAnimationFrame(tryScroll);
      }
    };
    rafId = window.requestAnimationFrame(tryScroll);

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [hash, pathname]);

  return null;
}

/* Suspense fallback for code-split routes — calm, on-brand spinner. */
function RouteFallback() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <Loader2
        className="h-6 w-6 animate-spin text-primary motion-reduce:animate-none"
        aria-label="Loading"
      />
    </div>
  );
}

/* ----------------------------------------------------------------------------
   StorefrontLayout — persistent chrome wrapping every route.
   Navbar + ScrollToHash + <Outlet/> + Footer, plus the three fixed overlays
   (CartDrawer / ProductDetailModal / CheckoutModal) mounted once at the root,
   inside all providers.
---------------------------------------------------------------------------- */
function StorefrontLayout() {
  return (
    <div id="top" className="min-h-screen bg-bg text-textPrimary">
      <Navbar />
      <ScrollToHash />

      <main id="main" className="scroll-mt-24">
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>

      <Footer />

      {/* Fixed overlays — sit outside the document flow, inside all providers.
          CheckoutModal (z-[70]) overlays CartDrawer (z-[60]) overlays
          ProductDetailModal (z-[50]). MiniCart is the transient "added to
          cart" peek that rides alongside the full CartDrawer. */}
      <CartDrawer />
      <MiniCart />
      <ProductDetailModal />
      <CheckoutModal />
    </div>
  );
}

/* ----------------------------------------------------------------------------
   AppRoutes — the route table (see README). Wrapped in the persistent
   StorefrontLayout; account/* is gated behind ProtectedRoute.
---------------------------------------------------------------------------- */
function AppRoutes() {
  return (
    <Routes>
      {/* Storefront — persistent chrome + the three overlays. */}
      <Route element={<StorefrontLayout />}>
        <Route index element={<Landing />} />
        <Route path="login" element={<AuthPage />} />
        <Route path="track" element={<TrackOrder />} />

        {/* Bilingual info / legal pages — one InfoPage driven by slug. */}
        <Route path="about" element={<InfoPage slug="about" />} />
        <Route path="contact" element={<InfoPage slug="contact" />} />
        <Route path="support" element={<InfoPage slug="support" />} />
        <Route path="returns" element={<InfoPage slug="returns" />} />
        <Route path="shipping" element={<InfoPage slug="shipping" />} />
        <Route path="privacy" element={<InfoPage slug="privacy" />} />
        <Route path="pdpl" element={<InfoPage slug="pdpl" />} />
        <Route path="disclaimer" element={<InfoPage slug="disclaimer" />} />
        <Route path="terms" element={<InfoPage slug="terms" />} />

        <Route
          path="account"
          element={
            <ProtectedRoute>
              <AccountLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="orders" replace />} />
          <Route path="profile" element={<ProfileSettings />} />
          <Route path="orders" element={<OrderHistory />} />
          <Route path="orders/:orderId" element={<OrderDetail />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>

      {/* Admin dashboard — role-gated chrome, separate from the storefront
          layout but still inside every provider (mounted within <App/>). */}
      <Route
        path="admin"
        element={
          <AdminRoute>
            <Suspense fallback={<RouteFallback />}>
              <AdminLayout />
            </Suspense>
          </AdminRoute>
        }
      >
        <Route index element={<Navigate to="orders" replace />} />
        <Route
          path="products"
          element={
            <Suspense fallback={<RouteFallback />}>
              <AdminProducts />
            </Suspense>
          }
        />
        <Route
          path="orders"
          element={
            <Suspense fallback={<RouteFallback />}>
              <AdminOrders />
            </Suspense>
          }
        />
        <Route
          path="settings"
          element={
            <Suspense fallback={<RouteFallback />}>
              <AdminSettings />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  );
}

/**
 * App — provider shell for Cabler Parts (12 providers).
 * Nesting order is load-bearing:
 *   ThemeProvider > AuthProvider > LanguageProvider > ToastProvider >
 *   GeoProvider > GarageProvider > CartProvider > CheckoutProvider >
 *   OrdersProvider > ProductsProvider > CatalogProvider >
 *   ProductModalProvider > <Routes>
 * - ToastProvider sits just inside LanguageProvider so both <Toaster/> (which
 *   reads useLang) and the footer's coming-soon links can consume useToast.
 * - CartProvider reads useGarage, so it sits inside GarageProvider.
 * - CheckoutModal reads useCart, so CheckoutProvider sits inside CartProvider.
 * - OrdersProvider + ProductsProvider depend on useAuth, so they sit inside
 *   AuthProvider; both wrap <AppRoutes/> so the storefront AND the admin
 *   dashboard share the same live product/order stores.
 * <BrowserRouter> wraps <App/> in main.jsx.
 */
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <LanguageProvider>
          <ToastProvider>
            <SettingsProvider>
              <GeoProvider>
              <GarageProvider>
                <CartProvider>
                  <CheckoutProvider>
                    <OrdersProvider>
                      <ProductsProvider>
                        <CatalogProvider>
                          <ProductModalProvider>
                            <AppRoutes />
                            <WelcomeLanguageModal />
                            <Toaster />
                          </ProductModalProvider>
                        </CatalogProvider>
                      </ProductsProvider>
                    </OrdersProvider>
                  </CheckoutProvider>
                </CartProvider>
              </GarageProvider>
              </GeoProvider>
            </SettingsProvider>
          </ToastProvider>
        </LanguageProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
