import { useCallback, useEffect, useRef } from "react";
import { useLang } from "../context/LanguageContext";
import BrandLogo from "./BrandLogo";

/**
 * WelcomeLanguageModal
 * --------------------
 * A sleek, animated first-visit modal that greets the user and offers two
 * large language choices: العربية (RTL) and English (LTR). Each choice calls
 * useLang().chooseLang, which sets the language, persists the welcome flag,
 * and closes the modal.
 *
 * Rendered once at the App root; renders nothing unless isLangModalOpen.
 * Branded (Midnight-Tachometer), backdrop blur, scale/fade entrance via the
 * existing `garage-open` / `fade-up` keyframes, reduced-motion safe,
 * role=dialog / aria-modal, Escape closes.
 */

// Component-local strings (independent of the active app language, since the
// whole point of this modal is to choose that language).
const STRINGS = {
  en: {
    welcome: "Welcome to Cabler Parts",
    tagline: "Premium Chinese auto parts, the GCC standard.",
    choose: "Choose your language",
    chooseAr: "اختر لغتك",
    close: "Close",
  },
};

export default function WelcomeLanguageModal() {
  const { isLangModalOpen, closeLangModal, chooseLang } = useLang();

  const panelRef = useRef(null);
  const firstBtnRef = useRef(null);

  // ---- Escape to close + focus trap ----------------------------------------
  useEffect(() => {
    if (!isLangModalOpen) return;
    if (typeof document === "undefined") return;

    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeLangModal();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll(
          'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])',
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
  }, [isLangModalOpen, closeLangModal]);

  // ---- Body scroll lock + move focus in ------------------------------------
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!isLangModalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => firstBtnRef.current?.focus(), 80);
    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(t);
    };
  }, [isLangModalOpen]);

  const onBackdrop = useCallback(
    (e) => {
      if (e.target === e.currentTarget) closeLangModal();
    },
    [closeLangModal],
  );

  // Render nothing until the modal is requested.
  if (!isLangModalOpen) return null;

  const t = STRINGS.en;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6"
      onMouseDown={onBackdrop}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-bg/80 backdrop-blur-md animate-fade-up motion-reduce:animate-none"
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-lang-title"
        dir="ltr"
        className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-border bg-surfaceElevated shadow-2xl shadow-black/40 animate-garage-open motion-reduce:animate-none"
      >
        {/* Amber glow header band */}
        <div className="relative px-6 pt-8 pb-6 text-center">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-primary/15 to-transparent"
            aria-hidden="true"
          />
          <div className="relative flex justify-center">
            <BrandLogo className="h-12 w-auto text-primary" withWordmark />
          </div>

          <h2
            id="welcome-lang-title"
            className="mt-6 font-display text-xl font-bold text-textPrimary"
          >
            {t.welcome}
          </h2>
          <p className="mx-auto mt-2 max-w-xs text-sm text-textSecondary">
            {t.tagline}
          </p>

          <div className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wide text-textMuted">
            <span className="h-px w-8 bg-border" aria-hidden="true" />
            <span>
              {t.choose} · {t.chooseAr}
            </span>
            <span className="h-px w-8 bg-border" aria-hidden="true" />
          </div>
        </div>

        {/* Language choices */}
        <div className="grid grid-cols-1 gap-3 px-6 pb-7 sm:grid-cols-2">
          {/* Arabic (RTL) */}
          <button
            ref={firstBtnRef}
            type="button"
            dir="rtl"
            lang="ar"
            onClick={() => chooseLang("ar")}
            className="group flex flex-col items-center gap-1 rounded-2xl border border-border bg-surface px-4 py-5 text-center transition hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surfaceElevated"
          >
            <span className="font-display text-2xl font-bold text-textPrimary transition group-hover:text-primary">
              العربية
            </span>
            <span className="text-xs font-medium text-textMuted">
              اللغة العربية
            </span>
          </button>

          {/* English (LTR) */}
          <button
            type="button"
            dir="ltr"
            lang="en"
            onClick={() => chooseLang("en")}
            className="group flex flex-col items-center gap-1 rounded-2xl border border-border bg-surface px-4 py-5 text-center transition hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surfaceElevated"
          >
            <span className="font-display text-2xl font-bold text-textPrimary transition group-hover:text-primary">
              English
            </span>
            <span className="text-xs font-medium text-textMuted">
              English language
            </span>
          </button>
        </div>

        {/* Close (subtle; choosing a language is the primary action) */}
        <button
          type="button"
          onClick={closeLangModal}
          aria-label={t.close}
          className="absolute end-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-textMuted transition hover:bg-surface hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
