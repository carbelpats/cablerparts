// -----------------------------------------------------------------------------
// CABLER PARTS — AuthPage (/login)
//
// Premium brand-marked auth card with segmented "Sign In | Sign Up" tabs,
// validated forms, localized useAuth().error, loading state, and post-auth
// navigation to (from || "/account/orders"). If already authed, redirects
// away immediately.
//
// Bilingual: own local STRINGS={en,ar} selected by useLang().lang. Logical
// utilities (ps/pe, text-start, ms/me), RTL-aware mirrored arrows, Latin
// emails kept dir="ltr". Semantic Tailwind tokens only. a11y: labelled
// inputs, aria-invalid/describedby, role=alert errors, focus-visible rings.
//
// NOTE: the underlying auth is a CLIENT-SIDE DEMO mock (see AuthContext) —
// not real security. This page is just the UI.
// -----------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { useAuth, AUTH_ERRORS } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { validateEmail } from "../lib/validation";
import { isSupabaseConfigured } from "../services/supabaseClient";

/* ----------------------------------------------------------------------------
   Local copy — component-specific strings stay out of i18n.js (project rule).
---------------------------------------------------------------------------- */
const STRINGS = {
  en: {
    metaSignIn: "Sign in",
    metaSignUp: "Create account",
    metaDescription:
      "Sign in or create your Cabler Parts account to track orders, save your garage, and leave verified reviews.",
    pageAria: "Account sign-in",
    standard: "The Standard",
    // hero / value
    welcome: "Welcome to Cabler Parts",
    subtitle:
      "Sign in to track orders, save your garage, and leave verified reviews.",
    // tabs
    tabSignIn: "Sign In",
    tabSignUp: "Sign Up",
    tabsAria: "Choose sign in or sign up",
    // headings
    signInTitle: "Sign in to your account",
    signInSub: "Pick up right where you left off.",
    signUpTitle: "Create your account",
    signUpSub: "It takes less than a minute.",
    // fields
    name: "Full name",
    namePlaceholder: "e.g. Sami Al-Harbi",
    email: "Email address",
    emailPlaceholder: "you@example.com",
    password: "Password",
    passwordPlaceholder: "••••••••",
    passwordHint: "At least 6 characters.",
    showPassword: "Show password",
    hidePassword: "Hide password",
    strengthLabel: "Password strength",
    strengthWeak: "Weak",
    strengthMedium: "Medium",
    strengthStrong: "Strong",
    // actions
    signInCta: "Sign In",
    signUpCta: "Create Account",
    working: "Just a moment…",
    // switch prompts
    noAccount: "New to Cabler Parts?",
    createOne: "Create an account",
    haveAccount: "Already have an account?",
    signInInstead: "Sign in",
    // trust / footer
    secureNote: "Demo account — stored locally on this device only.",
    secureNoteCloud: "Secured by encrypted cloud accounts.",
    backHome: "Back to storefront",
    // error codes -> localized messages
    errors: {
      [AUTH_ERRORS.NAME_REQUIRED]: "Please enter your name.",
      [AUTH_ERRORS.INVALID_EMAIL]: "Enter a valid email address.",
      [AUTH_ERRORS.WEAK_PASSWORD]: "Password must be at least 6 characters.",
      [AUTH_ERRORS.EMAIL_TAKEN]:
        "An account with this email already exists. Try signing in.",
      [AUTH_ERRORS.WRONG_CREDENTIALS]:
        "Incorrect email or password. Please try again.",
      [AUTH_ERRORS.NOT_AUTHED]: "You need to be signed in for that.",
      [AUTH_ERRORS.STORAGE]: "Something went wrong saving your account.",
      generic: "Something went wrong. Please try again.",
    },
  },
  ar: {
    metaSignIn: "تسجيل الدخول",
    metaSignUp: "إنشاء حساب",
    metaDescription:
      "سجّل الدخول أو أنشئ حسابك في كابلر بارتس لتتبّع الطلبات، وحفظ مرآبك، وكتابة تقييمات موثّقة.",
    pageAria: "تسجيل الدخول إلى الحساب",
    standard: "المرجع",
    welcome: "مرحبًا بك في كابلر بارتس",
    subtitle: "سجّل الدخول لتتبّع الطلبات، وحفظ مرآبك، وكتابة تقييمات موثّقة.",
    tabSignIn: "تسجيل الدخول",
    tabSignUp: "إنشاء حساب",
    tabsAria: "اختر تسجيل الدخول أو إنشاء حساب",
    signInTitle: "سجّل الدخول إلى حسابك",
    signInSub: "تابع من حيث توقّفت.",
    signUpTitle: "أنشئ حسابك",
    signUpSub: "يستغرق الأمر أقل من دقيقة.",
    name: "الاسم الكامل",
    namePlaceholder: "مثال: سامي الحربي",
    email: "البريد الإلكتروني",
    emailPlaceholder: "you@example.com",
    password: "كلمة المرور",
    passwordPlaceholder: "••••••••",
    passwordHint: "٦ أحرف على الأقل.",
    showPassword: "إظهار كلمة المرور",
    hidePassword: "إخفاء كلمة المرور",
    strengthLabel: "قوة كلمة المرور",
    strengthWeak: "ضعيف",
    strengthMedium: "متوسط",
    strengthStrong: "قوي",
    signInCta: "تسجيل الدخول",
    signUpCta: "إنشاء الحساب",
    working: "لحظة من فضلك…",
    noAccount: "جديد على كابلر بارتس؟",
    createOne: "أنشئ حسابًا",
    haveAccount: "لديك حساب بالفعل؟",
    signInInstead: "سجّل الدخول",
    secureNote: "حساب تجريبي — يُخزَّن محليًا على هذا الجهاز فقط.",
    secureNoteCloud: "حساب آمن محفوظ في السحابة المشفّرة.",
    backHome: "العودة إلى المتجر",
    errors: {
      [AUTH_ERRORS.NAME_REQUIRED]: "يرجى إدخال اسمك.",
      [AUTH_ERRORS.INVALID_EMAIL]: "أدخل بريدًا إلكترونيًا صحيحًا.",
      [AUTH_ERRORS.WEAK_PASSWORD]: "يجب ألّا تقل كلمة المرور عن ٦ أحرف.",
      [AUTH_ERRORS.EMAIL_TAKEN]:
        "يوجد حساب بهذا البريد الإلكتروني بالفعل. جرّب تسجيل الدخول.",
      [AUTH_ERRORS.WRONG_CREDENTIALS]:
        "البريد الإلكتروني أو كلمة المرور غير صحيحة. حاول مرة أخرى.",
      [AUTH_ERRORS.NOT_AUTHED]: "يلزم تسجيل الدخول للقيام بذلك.",
      [AUTH_ERRORS.STORAGE]: "حدث خطأ أثناء حفظ حسابك.",
      generic: "حدث خطأ ما. يرجى المحاولة مرة أخرى.",
    },
  },
};

const MIN_PASSWORD = 6;
const DEFAULT_DEST = "/account/orders";

/* ----------------------------------------------------------------------------
   Precision / "standard" mark — caliper + crosshair (matches navbar brand).
---------------------------------------------------------------------------- */
function StandardMark({ className = "" }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="16" cy="16" r="13" className="opacity-40" />
      <path d="M16 3v6M16 23v6M3 16h6M23 16h6" />
      <path d="M16 16L24 9" className="text-primary" stroke="currentColor" />
      <circle cx="16" cy="16" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* ----------------------------------------------------------------------------
   Labelled field with leading icon + inline error wiring.
---------------------------------------------------------------------------- */
function Field({
  id,
  label,
  icon: Icon,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  error,
  hint,
  ltr = false,
  trailing = null,
}) {
  const errId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy = [errId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-start text-sm font-medium text-textSecondary"
      >
        {label}
      </label>
      <div className="relative">
        <span
          className="pointer-events-none absolute inset-y-0 start-0 grid w-10 place-items-center text-textMuted"
          aria-hidden="true"
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          dir={ltr ? "ltr" : undefined}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
          className={`w-full rounded-xl border bg-surface py-2.5 ps-10 ${
            trailing ? "pe-10" : "pe-3"
          } text-base md:text-sm text-textPrimary placeholder:text-textMuted transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 ${
            ltr ? "font-mono tabular-nums text-start" : ""
          } ${
            error
              ? "border-danger/70 focus-visible:ring-danger/50"
              : "border-border hover:border-primary/40 focus:border-primary/50"
          }`}
        />
        {trailing && (
          <span className="absolute inset-y-0 end-0 grid w-10 place-items-center">
            {trailing}
          </span>
        )}
      </div>
      {hint && !error && (
        <p id={hintId} className="text-start text-xs text-textMuted">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errId}
          role="alert"
          className="flex items-center gap-1.5 text-start text-xs font-medium text-danger"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------------
   Password strength scoring (FIX #6)
   0 = empty (no meter), 1 = Weak (red), 2 = Medium (yellow), 3 = Strong (green)
     Weak:   < 6 chars
     Medium: 6–8 chars AND contains a number
     Strong: 8+ chars AND a number AND a special symbol
---------------------------------------------------------------------------- */
function scorePassword(pw) {
  if (!pw) return 0;
  const hasNumber = /\d/.test(pw);
  const hasSymbol = /[^A-Za-z0-9]/.test(pw);
  if (pw.length >= 8 && hasNumber && hasSymbol) return 3;
  if (pw.length >= 6 && hasNumber) return 2;
  return 1;
}

/* ----------------------------------------------------------------------------
   3-bar multi-color password strength meter + live bilingual label.
---------------------------------------------------------------------------- */
function PasswordStrengthMeter({ score, tx }) {
  if (!score) return null;

  const meta = {
    1: { label: tx.strengthWeak, bar: "bg-danger", text: "text-danger" },
    2: { label: tx.strengthMedium, bar: "bg-warning", text: "text-warning" },
    3: { label: tx.strengthStrong, bar: "bg-success", text: "text-success" },
  }[score];

  return (
    <div className="mt-1.5 flex flex-col gap-1">
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-200 motion-reduce:transition-none ${
              i <= score ? meta.bar : "bg-border"
            }`}
          />
        ))}
      </div>
      <p
        aria-live="polite"
        className={`text-start text-xs font-medium ${meta.text}`}
      >
        {tx.strengthLabel}: {meta.label}
      </p>
    </div>
  );
}

/* ----------------------------------------------------------------------------
   AuthPage
---------------------------------------------------------------------------- */
export default function AuthPage() {
  const { lang, isRTL } = useLang();
  const tx = STRINGS[lang];

  const { isAuthed, status, error, signIn, signUp, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Where to send the user after auth — the page they were gated from, else
  // the orders dashboard. Read from router state set by ProtectedRoute.
  const dest = useMemo(() => {
    const from = location.state?.from;
    if (from?.pathname) {
      return `${from.pathname}${from.search || ""}${from.hash || ""}`;
    }
    return DEFAULT_DEST;
  }, [location.state]);

  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState(false); // submitted at least once

  const loading = status === "loading";
  const isSignUp = mode === "signup";

  // Live password strength (FIX #6) — only meaningful in sign-up mode.
  const passwordScore = useMemo(() => scorePassword(password), [password]);

  useDocumentMeta({
    title: isSignUp ? tx.metaSignUp : tx.metaSignIn,
    description: tx.metaDescription,
  });

  // Clear any stale auth error when switching modes / unmounting.
  useEffect(() => {
    clearError();
    setTouched(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => () => clearError(), [clearError]);

  // ---- client-side field validation (mirrors AuthContext rules) -------------
  const fieldErrors = useMemo(() => {
    const e = {};
    if (isSignUp && !name.trim()) e.name = AUTH_ERRORS.NAME_REQUIRED;
    if (!validateEmail(email).ok) e.email = AUTH_ERRORS.INVALID_EMAIL;
    if (password.length < MIN_PASSWORD) e.password = AUTH_ERRORS.WEAK_PASSWORD;
    return e;
  }, [isSignUp, name, email, password]);

  // Only surface a field error after a submit attempt (don't shout on load).
  const visibleFieldError = (key) =>
    touched && fieldErrors[key] ? tx.errors[fieldErrors[key]] : null;

  const localizedAuthError =
    error && !loading ? tx.errors[error] || tx.errors.generic : null;

  // If already signed in, never show the form — bounce to the destination.
  if (isAuthed) {
    return <Navigate to={dest} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (Object.keys(fieldErrors).length > 0) return;

    const result = isSignUp
      ? await signUp({ name, email, password })
      : await signIn(email, password);

    if (result?.ok) {
      navigate(dest, { replace: true });
    }
  };

  const switchMode = (next) => {
    if (next === mode) return;
    setMode(next);
  };

  return (
    <main
      aria-label={tx.pageAria}
      className="relative flex min-h-[calc(100vh-68px)] items-center justify-center overflow-hidden px-4 py-10 sm:px-6"
    >
      {/* ambient tachometer glow backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute start-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 end-0 h-72 w-72 translate-x-1/3 translate-y-1/3 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        {/* Brand mark + welcome */}
        <div className="mb-6 flex flex-col items-center text-center">
          <Link
            to="/"
            aria-label={tx.backHome}
            className="group inline-flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary shadow-glow transition-transform duration-300 group-hover:-translate-y-0.5 motion-reduce:transition-none">
              <StandardMark className="h-7 w-7" />
            </span>
            <span className="flex flex-col items-start leading-none">
              <span className="font-display text-xl font-bold uppercase tracking-tight text-textPrimary">
                Cabler Parts
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-textMuted">
                {tx.standard}
              </span>
            </span>
          </Link>
          <h1 className="mt-5 font-display text-2xl font-bold text-textPrimary">
            {tx.welcome}
          </h1>
          <p className="mt-1.5 max-w-xs text-sm text-textSecondary">
            {tx.subtitle}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-surfaceElevated p-5 shadow-elevated sm:p-7">
          {/* Segmented tabs */}
          <div
            role="tablist"
            aria-label={tx.tabsAria}
            className="relative mb-6 grid grid-cols-2 gap-1 rounded-xl border border-border bg-surface p-1"
          >
            {/* sliding indicator */}
            <span
              aria-hidden="true"
              className="absolute inset-y-1 w-[calc(50%-0.25rem)] rounded-lg bg-primary/15 shadow-glow transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
              style={{
                transform: isSignUp
                  ? isRTL
                    ? "translateX(-100%)"
                    : "translateX(100%)"
                  : "translateX(0)",
              }}
            />
            <button
              type="button"
              role="tab"
              id="tab-signin"
              aria-selected={!isSignUp}
              aria-controls="auth-panel"
              onClick={() => switchMode("signin")}
              className={`relative z-10 rounded-lg py-2 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 ${
                !isSignUp
                  ? "text-textPrimary"
                  : "text-textSecondary hover:text-textPrimary"
              }`}
            >
              {tx.tabSignIn}
            </button>
            <button
              type="button"
              role="tab"
              id="tab-signup"
              aria-selected={isSignUp}
              aria-controls="auth-panel"
              onClick={() => switchMode("signup")}
              className={`relative z-10 rounded-lg py-2 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 ${
                isSignUp
                  ? "text-textPrimary"
                  : "text-textSecondary hover:text-textPrimary"
              }`}
            >
              {tx.tabSignUp}
            </button>
          </div>

          {/* Panel heading */}
          <div className="mb-5 text-start">
            <h2 className="font-display text-lg font-bold text-textPrimary">
              {isSignUp ? tx.signUpTitle : tx.signInTitle}
            </h2>
            <p className="mt-0.5 text-sm text-textSecondary">
              {isSignUp ? tx.signUpSub : tx.signInSub}
            </p>
          </div>

          {/* Server-level auth error */}
          {localizedAuthError && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-xl border border-danger/40 bg-danger/10 px-3 py-2.5 text-start text-sm text-danger"
            >
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <span>{localizedAuthError}</span>
            </div>
          )}

          {/* Form */}
          <form
            id="auth-panel"
            role="tabpanel"
            aria-labelledby={isSignUp ? "tab-signup" : "tab-signin"}
            onSubmit={handleSubmit}
            noValidate
            className="flex flex-col gap-4"
          >
            {isSignUp && (
              <Field
                id="auth-name"
                label={tx.name}
                icon={User}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={tx.namePlaceholder}
                autoComplete="name"
                error={visibleFieldError("name")}
              />
            )}

            <Field
              id="auth-email"
              label={tx.email}
              icon={Mail}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={tx.emailPlaceholder}
              autoComplete="email"
              ltr
              error={visibleFieldError("email")}
            />

            <Field
              id="auth-password"
              label={tx.password}
              icon={Lock}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={tx.passwordPlaceholder}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              hint={isSignUp ? tx.passwordHint : undefined}
              error={visibleFieldError("password")}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? tx.hidePassword : tx.showPassword}
                  aria-pressed={showPassword}
                  className="grid h-8 w-8 place-items-center rounded-lg text-textMuted transition-colors duration-150 hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                >
                  {showPassword ? (
                    <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" />
                  ) : (
                    <Eye className="h-[18px] w-[18px]" aria-hidden="true" />
                  )}
                </button>
              }
            />

            {/* Password strength meter (sign-up only) — FIX #6 */}
            {isSignUp && (
              <PasswordStrengthMeter score={passwordScore} tx={tx} />
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="group mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-display text-sm font-bold uppercase tracking-wide text-white shadow-glow transition-all duration-200 hover:bg-primaryHover hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {loading ? (
                <>
                  <Loader2
                    className="h-4 w-4 animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                  <span>{tx.working}</span>
                </>
              ) : (
                <>
                  <span>{isSignUp ? tx.signUpCta : tx.signInCta}</span>
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </>
              )}
            </button>
          </form>

          {/* Switch prompt */}
          <p className="mt-5 text-center text-sm text-textSecondary">
            {isSignUp ? tx.haveAccount : tx.noAccount}{" "}
            <button
              type="button"
              onClick={() => switchMode(isSignUp ? "signin" : "signup")}
              className="font-semibold text-primary underline-offset-4 transition-colors duration-150 hover:text-primaryHover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              {isSignUp ? tx.signInInstead : tx.createOne}
            </button>
          </p>
        </div>

        {/* Trust note */}
        <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-textMuted">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{isSupabaseConfigured ? tx.secureNoteCloud : tx.secureNote}</span>
        </p>
      </div>
    </main>
  );
}
