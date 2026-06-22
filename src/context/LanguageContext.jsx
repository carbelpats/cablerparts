import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

const STORAGE_KEY = "almeyar-lang";
const WELCOME_KEY = "almeyar:welcomed";
const LanguageContext = createContext(null);

function readStored() {
  // Default language is Arabic (RTL). A previously-persisted choice wins;
  // anything missing/invalid falls back to "ar".
  if (typeof window === "undefined") return "ar";
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "ar" || v === "en" ? v : "ar";
  } catch {
    return "ar";
  }
}

function readWelcomed() {
  // First visit => no "almeyar:welcomed" flag => show the welcome modal.
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(WELCOME_KEY) === "1";
  } catch {
    return false;
  }
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(readStored);
  // Open on first visit (when the welcome flag has not been persisted yet).
  const [isLangModalOpen, setIsLangModalOpen] = useState(() => !readWelcomed());

  const dir = lang === "ar" ? "rtl" : "ltr";
  const isRTL = lang === "ar";

  // Reflect lang/dir onto <html> and persist.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.lang = lang;
    root.dir = dir;
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore quota / privacy errors */
    }
  }, [lang, dir]);

  const setLang = useCallback((l) => {
    setLangState(l === "ar" ? "ar" : "en");
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((prev) => (prev === "ar" ? "en" : "ar"));
  }, []);

  const openLangModal = useCallback(() => setIsLangModalOpen(true), []);
  const closeLangModal = useCallback(() => setIsLangModalOpen(false), []);

  // First-visit choice: set the language, persist the welcome flag, close modal.
  const chooseLang = useCallback(
    (l) => {
      setLangState(l === "ar" ? "ar" : "en");
      try {
        window.localStorage.setItem(WELCOME_KEY, "1");
      } catch {
        /* ignore quota / privacy errors */
      }
      setIsLangModalOpen(false);
    },
    [],
  );

  return (
    <LanguageContext.Provider
      value={{
        lang,
        dir,
        isRTL,
        toggleLang,
        setLang,
        isLangModalOpen,
        openLangModal,
        closeLangModal,
        chooseLang,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used within a LanguageProvider");
  return ctx;
}
