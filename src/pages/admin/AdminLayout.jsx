// -----------------------------------------------------------------------------
// CABLER PARTS — AdminLayout (role-protected control chrome)
//
// Rendered inside <AdminRoute> (see App route table). Provides a distinct admin
// shell — still Midnight-Tachometer — with a "Cabler Parts · Control" header that
// shows the signed-in admin email + a back-to-store link, a side nav on md+ /
// top tabs on mobile (Products, Orders), then the active sub-page via <Outlet/>.
//
// Bilingual: own local STRINGS={en,ar} via useLang().lang. RTL-aware via logical
// utilities (ps/pe, text-start, start/end); mirror chevrons rtl:-scale-x-100.
// -----------------------------------------------------------------------------

import { NavLink, Outlet, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  SlidersHorizontal,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LanguageContext";

const STRINGS = {
  en: {
    brand: "Cabler Parts",
    control: "Control",
    nav: "Admin navigation",
    products: "Products",
    orders: "Orders",
    settings: "Settings",
    backToStore: "Back to store",
    signedInAs: "Signed in as",
    section: "Management",
  },
  ar: {
    brand: "كابلر بارتس",
    control: "لوحة التحكّم",
    nav: "تنقّل لوحة التحكّم",
    products: "المنتجات",
    orders: "الطلبات",
    settings: "الإعدادات",
    backToStore: "العودة للمتجر",
    signedInAs: "مسجّل الدخول باسم",
    section: "الإدارة",
  },
};

function NavItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isActive
            ? "bg-primary/15 text-primary"
            : "text-textSecondary hover:bg-surfaceElevated hover:text-textPrimary",
        ].join(" ")
      }
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="truncate text-start">{label}</span>
    </NavLink>
  );
}

export default function AdminLayout() {
  const { user } = useAuth();
  const { lang } = useLang();
  const t = STRINGS[lang] || STRINGS.en;

  return (
    <div className="min-h-screen bg-bg">
      {/* Admin header — distinct from the storefront navbar */}
      <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-primary shadow-glow"
              aria-hidden="true"
            >
              <LayoutDashboard className="h-5 w-5" />
            </span>
            <div className="flex min-w-0 flex-col leading-none">
              <span className="flex items-center gap-1.5 font-display text-base font-bold uppercase tracking-tight text-textPrimary">
                {t.brand}
                <span className="text-textMuted" aria-hidden="true">
                  ·
                </span>
                <span className="text-primary">{t.control}</span>
              </span>
              {user?.email && (
                <span className="mt-1 flex items-center gap-1 truncate text-[11px] text-textMuted">
                  <ShieldCheck
                    className="h-3 w-3 shrink-0 text-success"
                    aria-hidden="true"
                  />
                  <span className="hidden sm:inline">{t.signedInAs}</span>
                  <span dir="ltr" className="truncate font-mono">
                    {user.email}
                  </span>
                </span>
              )}
            </div>
          </div>

          <Link
            to="/"
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-textSecondary transition-all duration-200 hover:border-primary/40 hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <ArrowLeft
              className="h-4 w-4 rtl:-scale-x-100"
              aria-hidden="true"
            />
            <span className="hidden sm:inline">{t.backToStore}</span>
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          {/* side nav (md+) / top tabs (mobile) */}
          <nav aria-label={t.nav} className="md:w-56 md:shrink-0">
            <div className="rounded-2xl border border-border bg-surface p-2 shadow-sm md:p-3">
              <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-textMuted text-start">
                {t.section}
              </p>
              <div className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
                <div className="shrink-0 md:w-full">
                  <NavItem to="products" icon={Package} label={t.products} />
                </div>
                <div className="shrink-0 md:w-full">
                  <NavItem to="orders" icon={ClipboardList} label={t.orders} />
                </div>
                <div className="shrink-0 md:w-full">
                  <NavItem
                    to="settings"
                    icon={SlidersHorizontal}
                    label={t.settings}
                  />
                </div>
              </div>
            </div>
          </nav>

          {/* active sub-page */}
          <main className="min-w-0 flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
