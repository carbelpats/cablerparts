// -----------------------------------------------------------------------------
// AL-MEYAR — ProfileSettings (protected sub-page)
//
// Edit name + email via useAuth().updateProfile (sync -> {ok,error?}), with
// localized success + error feedback (role=alert), a read-only account summary
// (email, member-since), quick preferences (theme / language / currency wired to
// the existing contexts), and a Sign out button.
//
// Bilingual: own local STRINGS={en,ar} via useLang().lang. AUTH_ERRORS codes are
// localized here. a11y: labelled inputs, aria-invalid/aria-describedby, role=alert
// for messages, focus-visible rings. RTL via logical utilities; email/dates kept
// dir="ltr" mono tabular-nums.
// -----------------------------------------------------------------------------

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Check,
  AlertCircle,
  Sun,
  Moon,
  Languages,
  Coins,
  LogOut,
  CalendarDays,
} from "lucide-react";
import { useAuth, AUTH_ERRORS } from "../../context/AuthContext";
import { useLang } from "../../context/LanguageContext";
import { useTheme } from "../../context/ThemeContext";
import { useGeo } from "../../context/GeoContext";
import { useDocumentMeta } from "../../hooks/useDocumentMeta";

const STRINGS = {
  en: {
    profile: "Profile",
    profileDesc: "Update the name and email tied to your account.",
    name: "Full name",
    namePh: "Your name",
    email: "Email address",
    emailPh: "you@example.com",
    saveChanges: "Save changes",
    saving: "Saving…",
    saved: "Your profile has been updated.",
    summary: "Account summary",
    memberSince: "Member since",
    accountEmail: "Email",
    prefs: "Quick preferences",
    prefsDesc: "These apply across the whole store.",
    theme: "Theme",
    dark: "Dark",
    light: "Light",
    language: "Language",
    english: "English",
    arabic: "العربية",
    currency: "Currency & region",
    signOut: "Sign out",
    errors: {
      [AUTH_ERRORS.NAME_REQUIRED]: "Please enter your name.",
      [AUTH_ERRORS.INVALID_EMAIL]: "Please enter a valid email address.",
      [AUTH_ERRORS.EMAIL_TAKEN]: "That email is already in use.",
      [AUTH_ERRORS.NOT_AUTHED]: "You need to sign in again.",
      [AUTH_ERRORS.STORAGE]: "Couldn't save — storage is unavailable.",
      generic: "Something went wrong. Please try again.",
    },
  },
  ar: {
    profile: "الملف الشخصي",
    profileDesc: "حدِّث الاسم والبريد المرتبطين بحسابك.",
    name: "الاسم الكامل",
    namePh: "اسمك",
    email: "البريد الإلكتروني",
    emailPh: "you@example.com",
    saveChanges: "حفظ التغييرات",
    saving: "جارٍ الحفظ…",
    saved: "تم تحديث ملفك الشخصي.",
    summary: "ملخّص الحساب",
    memberSince: "عضو منذ",
    accountEmail: "البريد الإلكتروني",
    prefs: "تفضيلات سريعة",
    prefsDesc: "تُطبَّق على المتجر بالكامل.",
    theme: "المظهر",
    dark: "داكن",
    light: "فاتح",
    language: "اللغة",
    english: "English",
    arabic: "العربية",
    currency: "العملة والمنطقة",
    signOut: "تسجيل الخروج",
    errors: {
      [AUTH_ERRORS.NAME_REQUIRED]: "يرجى إدخال اسمك.",
      [AUTH_ERRORS.INVALID_EMAIL]: "يرجى إدخال بريد إلكتروني صالح.",
      [AUTH_ERRORS.EMAIL_TAKEN]: "هذا البريد مستخدَم بالفعل.",
      [AUTH_ERRORS.NOT_AUTHED]: "تحتاج إلى تسجيل الدخول مرة أخرى.",
      [AUTH_ERRORS.STORAGE]: "تعذّر الحفظ — وحدة التخزين غير متاحة.",
      generic: "حدث خطأ ما. يرجى المحاولة مرة أخرى.",
    },
  },
};

const USERS_KEY = "almeyar:users";

// read the persisted record only to surface a "member since" date (read-only)
function readMemberSince(userId) {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const found = parsed.find((u) => u && u.id === userId);
    return found && found.createdAt ? found.createdAt : null;
  } catch {
    return null;
  }
}

function formatDate(ms, lang) {
  if (!ms) return "—";
  try {
    return new Intl.DateTimeFormat(lang === "ar" ? "ar" : "en", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(ms));
  } catch {
    return "—";
  }
}

function FieldRow({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-b-0">
      <span className="text-sm text-textSecondary text-start">{label}</span>
      {children}
    </div>
  );
}

export default function ProfileSettings() {
  const { user, updateProfile, signOut, clearError } = useAuth();
  const { lang, isRTL, toggleLang, setLang } = useLang();
  const { theme, setTheme } = useTheme();
  const { region, regions, setRegion } = useGeo();
  const navigate = useNavigate();

  const t = STRINGS[lang] || STRINGS.en;

  useDocumentMeta({ title: t.profile });

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [errCode, setErrCode] = useState(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // keep the form in sync if the underlying user changes
  useEffect(() => {
    setName(user?.name || "");
    setEmail(user?.email || "");
  }, [user?.name, user?.email]);

  // clear any stale auth error on mount/unmount
  useEffect(() => {
    clearError();
    return () => clearError();
  }, [clearError]);

  const memberSince = useMemo(
    () => readMemberSince(user?.id),
    [user?.id]
  );

  const errorText =
    errCode != null ? t.errors[errCode] || t.errors.generic : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaved(false);
    setErrCode(null);
    setSubmitting(true);
    const res = await updateProfile({ name, email });
    setSubmitting(false);
    if (res?.ok) {
      setSaved(true);
    } else {
      setErrCode(res?.error || "generic");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const nameInvalid = errCode === AUTH_ERRORS.NAME_REQUIRED;
  const emailInvalid =
    errCode === AUTH_ERRORS.INVALID_EMAIL ||
    errCode === AUTH_ERRORS.EMAIL_TAKEN;

  return (
    <div className="space-y-6">
      {/* edit form card */}
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <h2 className="font-display text-lg font-bold text-textPrimary text-start">
          {t.profile}
        </h2>
        <p className="mt-1 text-sm text-textSecondary text-start">
          {t.profileDesc}
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
          {/* name */}
          <div>
            <label
              htmlFor="profile-name"
              className="mb-1.5 block text-sm font-medium text-textPrimary text-start"
            >
              {t.name}
            </label>
            <div className="relative">
              <User
                className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-textMuted"
                aria-hidden="true"
              />
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setSaved(false);
                  setErrCode(null);
                }}
                placeholder={t.namePh}
                autoComplete="name"
                aria-invalid={nameInvalid || undefined}
                aria-describedby={errorText ? "profile-feedback" : undefined}
                className="w-full rounded-xl border border-border bg-surfaceElevated py-2.5 ps-9 pe-3 text-base md:text-sm text-textPrimary placeholder:text-textMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-start"
              />
            </div>
          </div>

          {/* email */}
          <div>
            <label
              htmlFor="profile-email"
              className="mb-1.5 block text-sm font-medium text-textPrimary text-start"
            >
              {t.email}
            </label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-textMuted"
                aria-hidden="true"
              />
              <input
                id="profile-email"
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setSaved(false);
                  setErrCode(null);
                }}
                placeholder={t.emailPh}
                autoComplete="email"
                aria-invalid={emailInvalid || undefined}
                aria-describedby={errorText ? "profile-feedback" : undefined}
                className="w-full rounded-xl border border-border bg-surfaceElevated py-2.5 ps-9 pe-3 font-mono text-base md:text-sm text-textPrimary placeholder:text-textMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-start"
              />
            </div>
          </div>

          {/* feedback */}
          {errorText && (
            <p
              id="profile-feedback"
              role="alert"
              className="flex items-center gap-2 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger text-start"
            >
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{errorText}</span>
            </p>
          )}
          {saved && !errorText && (
            <p
              role="status"
              className="flex items-center gap-2 rounded-xl bg-success/10 px-3 py-2 text-sm text-success text-start"
            >
              <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{t.saved}</span>
            </p>
          )}

          <div className="flex justify-start">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {submitting ? t.saving : t.saveChanges}
            </button>
          </div>
        </form>
      </section>

      {/* read-only account summary */}
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <h2 className="font-display text-lg font-bold text-textPrimary text-start">
          {t.summary}
        </h2>
        <div className="mt-3">
          <FieldRow label={t.accountEmail}>
            <span
              dir="ltr"
              className="truncate font-mono text-sm tabular-nums text-textPrimary"
            >
              {user?.email || "—"}
            </span>
          </FieldRow>
          <FieldRow label={t.memberSince}>
            <span className="inline-flex items-center gap-1.5 text-sm text-textPrimary">
              <CalendarDays className="h-4 w-4 text-textMuted" aria-hidden="true" />
              <span dir="ltr" className="tabular-nums">
                {formatDate(memberSince, lang)}
              </span>
            </span>
          </FieldRow>
        </div>
      </section>

      {/* quick preferences */}
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <h2 className="font-display text-lg font-bold text-textPrimary text-start">
          {t.prefs}
        </h2>
        <p className="mt-1 text-sm text-textSecondary text-start">
          {t.prefsDesc}
        </p>

        <div className="mt-4 space-y-4">
          {/* theme */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-textPrimary">
              {theme === "dark" ? (
                <Moon className="h-4 w-4 text-textMuted" aria-hidden="true" />
              ) : (
                <Sun className="h-4 w-4 text-textMuted" aria-hidden="true" />
              )}
              {t.theme}
            </span>
            <div
              role="group"
              aria-label={t.theme}
              className="inline-flex rounded-xl border border-border bg-surfaceElevated p-1"
            >
              <button
                type="button"
                onClick={() => setTheme("dark")}
                aria-pressed={theme === "dark"}
                className={[
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  theme === "dark"
                    ? "bg-primary text-white"
                    : "text-textSecondary hover:text-textPrimary",
                ].join(" ")}
              >
                {t.dark}
              </button>
              <button
                type="button"
                onClick={() => setTheme("light")}
                aria-pressed={theme === "light"}
                className={[
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  theme === "light"
                    ? "bg-primary text-white"
                    : "text-textSecondary hover:text-textPrimary",
                ].join(" ")}
              >
                {t.light}
              </button>
            </div>
          </div>

          {/* language */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-textPrimary">
              <Languages className="h-4 w-4 text-textMuted" aria-hidden="true" />
              {t.language}
            </span>
            <div
              role="group"
              aria-label={t.language}
              className="inline-flex rounded-xl border border-border bg-surfaceElevated p-1"
            >
              <button
                type="button"
                onClick={() => setLang("en")}
                aria-pressed={lang === "en"}
                className={[
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  lang === "en"
                    ? "bg-primary text-white"
                    : "text-textSecondary hover:text-textPrimary",
                ].join(" ")}
              >
                {t.english}
              </button>
              <button
                type="button"
                onClick={() => setLang("ar")}
                aria-pressed={lang === "ar"}
                className={[
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  lang === "ar"
                    ? "bg-primary text-white"
                    : "text-textSecondary hover:text-textPrimary",
                ].join(" ")}
              >
                {t.arabic}
              </button>
            </div>
          </div>

          {/* currency / region */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-textPrimary">
              <Coins className="h-4 w-4 text-textMuted" aria-hidden="true" />
              {t.currency}
            </span>
            <label className="sr-only" htmlFor="profile-region">
              {t.currency}
            </label>
            <select
              id="profile-region"
              value={region.code}
              onChange={(e) => setRegion(e.target.value)}
              className="rounded-xl border border-border bg-surfaceElevated px-3 py-1.5 text-base md:text-xs font-semibold text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-start"
            >
              {regions.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.flag} {r.country} · {r.currency}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* sign out */}
      <div className="flex justify-start">
        <button
          type="button"
          onClick={handleSignOut}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-textSecondary transition-colors hover:border-danger/40 hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LogOut className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
          {t.signOut}
        </button>
      </div>
    </div>
  );
}
