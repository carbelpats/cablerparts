import { CheckCircle2, Info, X } from "lucide-react";
import { useToast } from "../context/ToastContext";
import { useLang } from "../context/LanguageContext";

/* ----------------------------------------------------------------------------
   Toaster — the visual surface for the toast queue (see ToastContext).

   A fixed, RTL-aware stack of "Midnight-Tachometer" pills anchored to the
   bottom-center of the viewport. role="status" + aria-live="polite" so screen
   readers announce new toasts without stealing focus. Each pill carries a
   manual dismiss button; entrance is reduced-motion safe.

   Rendered exactly once at the app root. When the queue is empty the live
   region stays mounted (still announcing) but renders nothing visible.
---------------------------------------------------------------------------- */

const STRINGS = {
  en: { dismiss: "Dismiss notification" },
  ar: { dismiss: "إغلاق الإشعار" },
};

export default function Toaster() {
  const { toasts, dismissToast } = useToast();
  const { lang } = useLang();
  const tx = STRINGS[lang] || STRINGS.en;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex flex-col items-center gap-2 px-4 sm:bottom-6"
    >
      {toasts.map((toast) => {
        const isSuccess = toast.tone === "success";
        const Icon = isSuccess ? CheckCircle2 : Info;
        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border border-border bg-surfaceElevated px-4 py-3 text-sm text-textPrimary shadow-lg ring-1 ring-black/5 animate-fade-up motion-reduce:animate-none"
          >
            <Icon
              className={`h-5 w-5 shrink-0 ${
                isSuccess ? "text-success" : "text-primary"
              }`}
              aria-hidden="true"
            />
            <p className="flex-1 leading-snug text-start">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label={tx.dismiss}
              className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-textMuted transition-colors hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
