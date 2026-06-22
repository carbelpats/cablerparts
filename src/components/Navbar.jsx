import { useEffect, useRef, useState, useCallback } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Sun,
  Moon,
  Car,
  ChevronDown,
  Check,
  Menu,
  X,
  ShoppingBag,
  Plus,
  Globe,
  User,
  Package,
  LogOut,
  LayoutDashboard,
} from "lucide-react";
import { useGeo } from "../context/GeoContext";
import { useTheme } from "../context/ThemeContext";
import { useGarage } from "../context/GarageContext";
import { useCart } from "../context/CartContext";
import { useLang } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { COMMON } from "../lib/i18n";
import BrandLogo from "./BrandLogo";

/* ----------------------------------------------------------------------------
   Local copy — keep component-specific strings out of i18n.js (project rule).
---------------------------------------------------------------------------- */
const STRINGS = {
  en: {
    navAria: "Primary",
    home: "Cabler Parts — home",
    standard: "The Standard",
    // nav links
    homeLink: "Home",
    catalog: "Catalog",
    garage: "Garage",
    track: "Track Order",
    // region
    region: "Region",
    selectRegion: "Select region",
    regionAria: (country, currency) =>
      `Region: ${country}, currency ${currency}. Change region`,
    // theme
    toLight: "Switch to light mode",
    toDark: "Switch to dark mode",
    // language
    langChoose: "Choose language",
    // garage
    yourGarage: "Your Garage",
    change: "Change",
    addCar: "Add your car",
    addCarLong: "Add your car for guaranteed-fit parts",
    yourGarageTap: "Your Garage — tap to change",
    vehicleAria: (v) =>
      `Your vehicle: ${v.year} ${v.make} ${v.model}. Change it`,
    addCarAria: "Add your car to the Garage",
    // cart
    openCartEmpty: "Open cart, empty",
    openCartItems: (n) => `Open cart, ${n} item${n === 1 ? "" : "s"}`,
    // mobile
    openMenu: "Open menu",
    closeMenu: "Close menu",
    // account
    signIn: "Sign in",
    account: "Account",
    accountMenu: "Account menu",
    profile: "Profile",
    orders: "Orders",
    admin: "Admin Dashboard",
    signOut: "Sign out",
    signedInAs: "Signed in as",
  },
  ar: {
    navAria: "التنقّل الرئيسي",
    home: "كابلر بارتس — الرئيسية",
    standard: "المرجع",
    // nav links
    homeLink: "الرئيسية",
    catalog: "الكتالوج",
    garage: "المرآب",
    track: "تتبّع الطلب",
    // region
    region: "المنطقة",
    selectRegion: "اختر المنطقة",
    regionAria: (country, currency) =>
      `المنطقة: ${country}، العملة ${currency}. تغيير المنطقة`,
    // theme
    toLight: "التبديل إلى الوضع الفاتح",
    toDark: "التبديل إلى الوضع الداكن",
    // language
    langChoose: "اختيار اللغة",
    // garage
    yourGarage: "مرآبك",
    change: "تغيير",
    addCar: "أضف سيارتك",
    addCarLong: "أضف سيارتك للحصول على قطع مضمونة المطابقة",
    yourGarageTap: "مرآبك — اضغط للتغيير",
    vehicleAria: (v) =>
      `سيارتك: ${v.year} ${v.make} ${v.model}. تغييرها`,
    addCarAria: "أضف سيارتك إلى المرآب",
    // cart
    openCartEmpty: "فتح السلة، فارغة",
    openCartItems: (n) => `فتح السلة، ${n} قطعة`,
    // mobile
    openMenu: "فتح القائمة",
    closeMenu: "إغلاق القائمة",
    // account
    signIn: "تسجيل الدخول",
    account: "الحساب",
    accountMenu: "قائمة الحساب",
    profile: "الملف الشخصي",
    orders: "الطلبات",
    admin: "لوحة تحكّم المشرف",
    signOut: "تسجيل الخروج",
    signedInAs: "تم تسجيل الدخول باسم",
  },
};

/* Section links scroll-to-hash on the landing page; Track Order is its own route.
   Catalog/Garage point at "/#catalog" / "/#garage" so ScrollToHash can land them
   even when navigating from another route. */
const NAV_LINKS = [
  { key: "homeLink", to: "/", end: true },
  { key: "catalog", to: "/#catalog" },
  { key: "garage", to: "/#garage" },
  { key: "track", to: "/track" },
];

/* ----------------------------------------------------------------------------
   Hook: close on outside-click + Escape, returns a ref to attach to the popover
---------------------------------------------------------------------------- */
function useDismissable(open, onClose) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onPointer = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  return ref;
}

/* ----------------------------------------------------------------------------
   Language button — a compact globe that opens the Welcome/Language modal.
   Replaces the old EN/ع text toggle: a single decisive control that surfaces the
   full bilingual chooser (no cramped inline glyph, no overflow at 375px).
---------------------------------------------------------------------------- */
function LanguageButton() {
  const { lang, openLangModal } = useLang();
  const tx = STRINGS[lang];

  return (
    <button
      type="button"
      onClick={openLangModal}
      aria-label={tx.langChoose}
      title={tx.langChoose}
      className="group grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-surface text-textSecondary transition-all duration-200 hover:border-primary/40 hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
    >
      <Globe
        className="h-[18px] w-[18px] transition-transform duration-300 group-hover:rotate-12 motion-reduce:transition-none"
        aria-hidden="true"
      />
    </button>
  );
}

/* ----------------------------------------------------------------------------
   Region / currency selector — ONLY SAR + USD (two-region geo). Anchors to the
   inline-end so it mirrors correctly under RTL.
---------------------------------------------------------------------------- */
function RegionSelector() {
  const { region, regions, setRegion } = useGeo();
  const { lang } = useLang();
  const tx = STRINGS[lang];
  const t = COMMON[lang];
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismissable(open, close);

  // Localized currency word from the shared dict (sar / usd).
  const currencyWord = (code) =>
    code === "SA" ? t.sar : code === "US" ? t.usd : t.sar;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={tx.regionAria(region.country, region.currency)}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-2 text-sm font-medium text-textSecondary transition-all duration-200 hover:border-primary/40 hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <span className="text-base leading-none" aria-hidden="true">
          {region.flag}
        </span>
        <span className="font-mono text-xs tracking-wide tabular-nums">
          {region.currency}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={tx.selectRegion}
          className="absolute end-0 z-50 mt-2 w-60 origin-top animate-fade-up overflow-hidden rounded-xl border border-border bg-surfaceElevated shadow-elevated"
        >
          {regions.map((r) => {
            const active = r.code === region.code;
            return (
              <li key={r.code} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => {
                    setRegion(r.code);
                    close();
                  }}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-start text-sm transition-colors duration-150 focus-visible:bg-primary/10 focus-visible:outline-none ${
                    active
                      ? "bg-primary/10 text-textPrimary"
                      : "text-textSecondary hover:bg-primary/5 hover:text-textPrimary"
                  }`}
                >
                  <span className="text-lg leading-none" aria-hidden="true">
                    {r.flag}
                  </span>
                  <span className="flex-1">
                    <span className="block font-medium leading-tight">
                      {r.country}
                    </span>
                    <span className="block font-mono text-xs text-textMuted">
                      <span className="tabular-nums">{r.currency}</span> ·{" "}
                      {currencyWord(r.code)}
                    </span>
                  </span>
                  {active && (
                    <Check
                      className="h-4 w-4 text-primary"
                      aria-hidden="true"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------------
   Theme toggle — sun/moon morph
---------------------------------------------------------------------------- */
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { lang } = useLang();
  const tx = STRINGS[lang];
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? tx.toLight : tx.toDark}
      aria-pressed={isDark}
      className="relative grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface text-textSecondary transition-all duration-200 hover:border-primary/40 hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
    >
      <Sun
        className={`absolute h-[18px] w-[18px] transition-all duration-300 motion-reduce:transition-none ${
          isDark
            ? "rotate-90 scale-0 opacity-0"
            : "rotate-0 scale-100 text-warning opacity-100"
        }`}
        aria-hidden="true"
      />
      <Moon
        className={`absolute h-[18px] w-[18px] transition-all duration-300 motion-reduce:transition-none ${
          isDark
            ? "rotate-0 scale-100 text-accent opacity-100"
            : "-rotate-90 scale-0 opacity-0"
        }`}
        aria-hidden="true"
      />
    </button>
  );
}

/* ----------------------------------------------------------------------------
   Garage chip — endowment effect ("Your 2021 Patrol"). Routes to "/#garage"
   via <Link>; ScrollToHash performs the actual scroll on the landing page.
---------------------------------------------------------------------------- */
function GarageChip() {
  const { vehicle, hasVehicle } = useGarage();
  const { lang } = useLang();
  const tx = STRINGS[lang];

  if (hasVehicle && vehicle) {
    return (
      <Link
        to="/#garage"
        aria-label={tx.vehicleAria(vehicle)}
        className="group hidden items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-start shadow-glow transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 sm:flex"
      >
        <Car className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="flex flex-col leading-none">
          <span className="text-[10px] uppercase tracking-wider text-textMuted">
            {tx.yourGarage}
          </span>
          <span className="font-mono text-xs font-medium text-textPrimary tabular-nums">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </span>
        </span>
        <span className="ms-1 text-[10px] font-medium uppercase tracking-wide text-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          {tx.change}
        </span>
      </Link>
    );
  }

  return (
    <Link
      to="/#garage"
      aria-label={tx.addCarAria}
      className="hidden items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-textSecondary transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 sm:flex"
    >
      <Plus className="h-4 w-4 text-primary" aria-hidden="true" />
      <span>{tx.addCar}</span>
    </Link>
  );
}

/* ----------------------------------------------------------------------------
   Cart button — count badge with pop animation on change
---------------------------------------------------------------------------- */
function CartButton() {
  const { count, openCart } = useCart();
  const { lang } = useLang();
  const tx = STRINGS[lang];
  const [pop, setPop] = useState(false);
  const prev = useRef(count);

  useEffect(() => {
    if (count !== prev.current) {
      prev.current = count;
      if (count > 0) {
        setPop(true);
        const t = setTimeout(() => setPop(false), 360);
        return () => clearTimeout(t);
      }
    }
  }, [count]);

  return (
    <button
      type="button"
      onClick={openCart}
      aria-label={count > 0 ? tx.openCartItems(count) : tx.openCartEmpty}
      className="relative grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface text-textSecondary transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
    >
      <ShoppingBag className="h-[18px] w-[18px]" aria-hidden="true" />
      {count > 0 && (
        <span
          aria-hidden="true"
          className={`absolute -top-1.5 -end-1.5 grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-primary px-1 font-mono text-[11px] font-bold leading-none tabular-nums text-white shadow-glow ${
            pop ? "animate-count-up" : ""
          }`}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

/* ----------------------------------------------------------------------------
   Account control — auth-aware. Signed out -> a "Sign in" link to /login.
   Signed in -> an initials-avatar button opening a dropdown (Profile / Orders /
   Sign out). Dropdown closes on outside-click + Escape. RTL-anchored end-0.
---------------------------------------------------------------------------- */
function initialsOf(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function AccountControl() {
  const { isAuthed, user, isAdmin, signOut } = useAuth();
  const { lang } = useLang();
  const tx = STRINGS[lang];
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismissable(open, close);

  if (!isAuthed) {
    return (
      <Link
        to="/login"
        aria-label={tx.signIn}
        className="hidden items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-textSecondary transition-all duration-200 hover:border-primary/40 hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 sm:flex"
      >
        <User className="h-4 w-4" aria-hidden="true" />
        <span>{tx.signIn}</span>
      </Link>
    );
  }

  const handleSignOut = () => {
    close();
    signOut();
    navigate("/");
  };

  const menuItem =
    "flex w-full items-center gap-2.5 px-3 py-2.5 text-start text-sm transition-colors duration-150 focus-visible:bg-primary/10 focus-visible:outline-none";

  return (
    <div className="relative hidden sm:block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={tx.accountMenu}
        className="grid h-9 w-9 place-items-center rounded-lg border border-primary/30 bg-primary/10 font-display text-xs font-bold uppercase text-primary shadow-glow transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <span aria-hidden="true">{initialsOf(user?.name)}</span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label={tx.accountMenu}
          className="absolute end-0 z-50 mt-2 w-56 origin-top animate-fade-up overflow-hidden rounded-xl border border-border bg-surfaceElevated shadow-elevated"
        >
          {/* Signed-in identity header */}
          <div className="border-b border-border px-3 py-3">
            <span className="block text-[10px] uppercase tracking-wider text-textMuted">
              {tx.signedInAs}
            </span>
            <span className="block truncate text-sm font-medium text-textPrimary">
              {user?.name}
            </span>
            <span
              dir="ltr"
              className="block truncate font-mono text-xs text-textMuted"
            >
              {user?.email}
            </span>
          </div>

          <Link
            to="/account/profile"
            role="menuitem"
            onClick={close}
            className={`${menuItem} text-textSecondary hover:bg-primary/5 hover:text-textPrimary`}
          >
            <User className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>{tx.profile}</span>
          </Link>
          <Link
            to="/account/orders"
            role="menuitem"
            onClick={close}
            className={`${menuItem} text-textSecondary hover:bg-primary/5 hover:text-textPrimary`}
          >
            <Package className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>{tx.orders}</span>
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              role="menuitem"
              onClick={close}
              className={`${menuItem} text-textSecondary hover:bg-primary/5 hover:text-textPrimary`}
            >
              <LayoutDashboard
                className="h-4 w-4 text-primary"
                aria-hidden="true"
              />
              <span>{tx.admin}</span>
            </Link>
          )}

          <div className="border-t border-border">
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              className={`${menuItem} text-textSecondary hover:bg-danger/10 hover:text-danger`}
            >
              <LogOut
                className="h-4 w-4 rtl:-scale-x-100"
                aria-hidden="true"
              />
              <span>{tx.signOut}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------------
   Wordmark — routes home via <Link to="/">
---------------------------------------------------------------------------- */
function Wordmark() {
  const { lang } = useLang();
  const tx = STRINGS[lang];
  return (
    <Link
      to="/"
      className="flex min-w-0 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      aria-label={tx.home}
    >
      {/* Mark always shows; the wordmark lockup folds in from sm+ to protect the
          375px row. The mark alone (h-9) is enough to brand the header. */}
      <BrandLogo className="h-9 w-9 shrink-0" />
      <span className="ms-2.5 hidden min-w-0 sm:flex">
        <BrandLogoWordmarkOnly />
      </span>
    </Link>
  );
}

/* Wordmark text reused from BrandLogo's lockup without re-rendering the mark, so
   the nav can show mark-only on the tightest screens. */
function BrandLogoWordmarkOnly() {
  const { lang } = useLang();
  const primaryWord = lang === "ar" ? "كابلر" : "CABLER";
  const secondaryWord = lang === "ar" ? "CABLER" : "كابلر";
  return (
    <span className="flex min-w-0 flex-col leading-none">
      <span className="truncate font-display text-lg font-bold uppercase tracking-tight text-textPrimary">
        {primaryWord}
      </span>
      <span className="truncate font-sans text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-textMuted">
        {secondaryWord}
      </span>
    </span>
  );
}

/* ----------------------------------------------------------------------------
   Navbar
---------------------------------------------------------------------------- */
export default function Navbar() {
  const { lang, isRTL } = useLang();
  const tx = STRINGS[lang];
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const mobileRef = useDismissable(mobileOpen, closeMobile);

  // Track scroll — shrink + intensify blur.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll while the mobile sheet is open.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const { body } = document;
    if (mobileOpen) {
      const prev = body.style.overflow;
      body.style.overflow = "hidden";
      return () => {
        body.style.overflow = prev;
      };
    }
  }, [mobileOpen]);

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b transition-all duration-300 ${
        scrolled
          ? "border-border bg-bg/80 shadow-elevated backdrop-blur-xl"
          : "border-border/40 bg-bg/50 backdrop-blur-md"
      }`}
    >
      <nav
        aria-label={tx.navAria}
        className={`mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 transition-all duration-300 sm:gap-3 sm:px-6 lg:px-8 ${
          scrolled ? "h-14" : "h-[68px]"
        }`}
      >
        {/* Inline-start: wordmark — min-w-0 so it can shrink before overflowing */}
        <div className="flex min-w-0 items-center">
          <Wordmark />
        </div>

        {/* Center: nav links (md+) */}
        <ul className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.key}>
              <NavLink
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `group relative rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 ${
                    isActive
                      ? "text-textPrimary"
                      : "text-textSecondary hover:text-textPrimary"
                  }`
                }
              >
                {tx[link.key]}
                <span
                  className="pointer-events-none absolute inset-x-3 -bottom-0.5 h-0.5 origin-[var(--underline-origin)] scale-x-0 rounded-full bg-primary transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100 motion-reduce:transition-none"
                  style={{ "--underline-origin": isRTL ? "right" : "left" }}
                  aria-hidden="true"
                />
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Inline-end cluster — shrink-0 so controls never get squeezed, and
            secondary controls (garage / region / language / theme) collapse into
            the mobile sheet on the tightest screens to kill 375px overflow. The
            persistent mobile row keeps only cart + menu. */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <GarageChip />
          {/* Region: hidden until sm to free space on the 375 row (lives in the
              mobile sheet there). */}
          <div className="hidden sm:block">
            <RegionSelector />
          </div>
          {/* Language + theme: collapse into the sheet below sm. */}
          <div className="hidden sm:block">
            <LanguageButton />
          </div>
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          <CartButton />
          <AccountControl />

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? tx.closeMenu : tx.openMenu}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-surface text-textSecondary transition-all duration-200 hover:border-primary/40 hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 md:hidden"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile sheet */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 top-0 z-30 bg-bg/60 backdrop-blur-sm md:hidden"
            aria-hidden="true"
            onClick={closeMobile}
          />
          <div
            id="mobile-menu"
            ref={mobileRef}
            className="absolute inset-x-0 top-full z-40 origin-top animate-fade-up border-b border-border bg-surfaceElevated px-4 pb-5 pt-3 shadow-elevated md:hidden"
          >
            <ul className="flex flex-col gap-1">
              {NAV_LINKS.map((link, i) => (
                <li
                  key={link.key}
                  className="animate-fade-up"
                  style={{ animationDelay: `${i * 35}ms` }}
                >
                  <NavLink
                    to={link.to}
                    end={link.end}
                    onClick={closeMobile}
                    className={({ isActive }) =>
                      `flex items-center justify-between rounded-lg px-3 py-3 text-base font-medium transition-colors duration-200 focus-visible:bg-primary/10 focus-visible:outline-none ${
                        isActive
                          ? "bg-primary/5 text-textPrimary"
                          : "text-textSecondary hover:bg-primary/5 hover:text-textPrimary"
                      }`
                    }
                  >
                    {tx[link.key]}
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-primary/50"
                      aria-hidden="true"
                    />
                  </NavLink>
                </li>
              ))}
            </ul>

            {/* Quick controls — region / language / theme. These are hidden in
                the top bar below sm to protect the 375px row, so they live here.
                Hidden from sm+ since the bar shows them inline there. */}
            <div className="mt-3 flex items-center gap-2 border-t border-border pt-3 sm:hidden">
              <RegionSelector />
              <LanguageButton />
              <ThemeToggle />
            </div>

            {/* Garage CTA in the sheet (always visible on mobile) */}
            <div className="mt-3 border-t border-border pt-3">
              <MobileGarageRow onNavigate={closeMobile} />
            </div>

            {/* Account section in the sheet */}
            <div className="mt-3 border-t border-border pt-3">
              <MobileAccountRows onNavigate={closeMobile} />
            </div>
          </div>
        </>
      )}
    </header>
  );
}

/* Mobile garage row — same endowment copy, full-width tap target, routed */
function MobileGarageRow({ onNavigate }) {
  const { vehicle, hasVehicle } = useGarage();
  const { lang } = useLang();
  const tx = STRINGS[lang];
  return (
    <Link
      to="/#garage"
      onClick={onNavigate}
      aria-label={
        hasVehicle && vehicle ? tx.vehicleAria(vehicle) : tx.addCarAria
      }
      className="flex w-full items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 px-3 py-3 text-start transition-all duration-200 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
    >
      <Car className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      {hasVehicle && vehicle ? (
        <span className="flex flex-1 flex-col leading-tight">
          <span className="text-[10px] uppercase tracking-wider text-textMuted">
            {tx.yourGarageTap}
          </span>
          <span className="font-mono text-sm font-medium text-textPrimary tabular-nums">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </span>
        </span>
      ) : (
        <span className="flex-1 font-medium text-textPrimary">
          {tx.addCarLong}
        </span>
      )}
      <ChevronDown
        className="h-4 w-4 -rotate-90 text-primary rtl:rotate-90"
        aria-hidden="true"
      />
    </Link>
  );
}

/* Mobile account rows — auth-aware. Signed out -> Sign in CTA. Signed in ->
   identity header + Profile / Orders links + Sign out. */
function MobileAccountRows({ onNavigate }) {
  const { isAuthed, user, isAdmin, signOut } = useAuth();
  const { lang } = useLang();
  const tx = STRINGS[lang];
  const navigate = useNavigate();

  if (!isAuthed) {
    return (
      <Link
        to="/login"
        onClick={onNavigate}
        className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface px-3 py-3 text-start font-medium text-textPrimary transition-all duration-200 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <User className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <span className="flex-1">{tx.signIn}</span>
        <ChevronDown
          className="h-4 w-4 -rotate-90 text-primary rtl:rotate-90"
          aria-hidden="true"
        />
      </Link>
    );
  }

  const handleSignOut = () => {
    onNavigate();
    signOut();
    navigate("/");
  };

  const row =
    "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-start text-base font-medium transition-colors duration-200 focus-visible:bg-primary/10 focus-visible:outline-none";

  return (
    <div className="flex flex-col gap-1">
      {/* Identity header */}
      <div className="flex items-center gap-3 px-3 py-2">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-primary/30 bg-primary/10 font-display text-xs font-bold uppercase text-primary">
          {initialsOf(user?.name)}
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-medium text-textPrimary">
            {user?.name}
          </span>
          <span
            dir="ltr"
            className="truncate font-mono text-xs text-textMuted"
          >
            {user?.email}
          </span>
        </span>
      </div>

      <Link
        to="/account/profile"
        onClick={onNavigate}
        className={`${row} text-textSecondary hover:bg-primary/5 hover:text-textPrimary`}
      >
        <User className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <span className="flex-1">{tx.profile}</span>
      </Link>
      <Link
        to="/account/orders"
        onClick={onNavigate}
        className={`${row} text-textSecondary hover:bg-primary/5 hover:text-textPrimary`}
      >
        <Package className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <span className="flex-1">{tx.orders}</span>
      </Link>
      {isAdmin && (
        <Link
          to="/admin"
          onClick={onNavigate}
          className={`${row} text-textSecondary hover:bg-primary/5 hover:text-textPrimary`}
        >
          <LayoutDashboard
            className="h-5 w-5 shrink-0 text-primary"
            aria-hidden="true"
          />
          <span className="flex-1">{tx.admin}</span>
        </Link>
      )}
      <button
        type="button"
        onClick={handleSignOut}
        className={`${row} text-textSecondary hover:bg-danger/10 hover:text-danger`}
      >
        <LogOut
          className="h-5 w-5 shrink-0 rtl:-scale-x-100"
          aria-hidden="true"
        />
        <span className="flex-1">{tx.signOut}</span>
      </button>
    </div>
  );
}
