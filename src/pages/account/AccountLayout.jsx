// -----------------------------------------------------------------------------
// AL-MEYAR — AccountLayout (protected shell)
//
// Rendered inside <ProtectedRoute> (see route table). Provides the account
// chrome: a welcome header ("Welcome back, {name}"), a side nav on md+ /
// top tabs on mobile linking Profile + Orders, a "Track an order" link to
// /track, and a Sign out button — then renders the active sub-page via
// <Outlet/>.
//
// Bilingual: own local STRINGS={en,ar} selected by useLang().lang. RTL-aware
// via logical utilities (ps/pe, text-start, start/end) so the side-nav lands
// on the inline-start edge in both directions. Mirror chevrons rtl:-scale-x-100.
// -----------------------------------------------------------------------------

import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { User, Package, MapPin, LogOut, ChevronRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLang } from "../../context/LanguageContext";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";

const STRINGS = {
  en: {
    metaTitle: "My account",
    welcome: (name) => `Welcome back, ${name}`,
    subtitle: "Manage your profile, orders and preferences.",
    account: "Account",
    profile: "Profile",
    orders: "Orders",
    trackOrder: "Track an order",
    signOut: "Sign out",
    nav: "Account navigation",
  },
  ar: {
    metaTitle: "حسابي",
    welcome: (name) => `أهلًا بعودتك، ${name}`,
    subtitle: "أدِر ملفك الشخصي وطلباتك وتفضيلاتك.",
    account: "الحساب",
    profile: "الملف الشخصي",
    orders: "الطلبات",
    trackOrder: "تتبّع طلبًا",
    signOut: "تسجيل الخروج",
    nav: "تنقّل الحساب",
  },
};

function initialsOf(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "•";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function NavItem({ to, end, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      end={end}
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

export default function AccountLayout() {
  const { user, signOut } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();
  const t = STRINGS[lang] || STRINGS.en;

  useDocumentMeta({ title: t.metaTitle });

  const name = user?.name || "";

  const handleSignOut = () => {
    signOut();
    navigate("/");
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      {/* welcome header */}
      <header className="mb-8 flex items-center gap-4">
        <span
          className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/30 to-accent/20 text-lg font-bold text-primary ring-1 ring-border"
          aria-hidden="true"
        >
          {initialsOf(name)}
        </span>
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl font-bold text-textPrimary sm:text-3xl text-start">
            {t.welcome(name)}
          </h1>
          <p className="mt-1 text-sm text-textSecondary text-start">
            {t.subtitle}
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        {/* side nav (md+) / top tabs (mobile) */}
        <nav
          aria-label={t.nav}
          className="md:w-60 md:shrink-0"
        >
          <div className="rounded-2xl border border-border bg-surface p-2 shadow-sm md:p-3">
            <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-textMuted text-start">
              {t.account}
            </p>
            {/* horizontal scroll on mobile, stacked on md+ */}
            <div className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
              <div className="shrink-0 md:shrink md:w-full">
                <NavItem to="profile" icon={User} label={t.profile} />
              </div>
              <div className="shrink-0 md:shrink md:w-full">
                <NavItem to="orders" icon={Package} label={t.orders} />
              </div>
              <div className="shrink-0 md:shrink md:w-full">
                <NavItem to="/track" icon={MapPin} label={t.trackOrder} />
              </div>
            </div>

            <div className="mt-2 border-t border-border pt-2">
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-textSecondary transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <LogOut className="h-4 w-4 shrink-0 rtl:-scale-x-100" aria-hidden="true" />
                <span className="truncate text-start">{t.signOut}</span>
                <ChevronRight className="ms-auto hidden h-4 w-4 opacity-40 rtl:-scale-x-100 md:block" aria-hidden="true" />
              </button>
            </div>
          </div>
        </nav>

        {/* active sub-page */}
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
