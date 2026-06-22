import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

// -----------------------------------------------------------------------------
// Al-Meyar — catalog browse state consumed by ProductGrid. Holds the active
// category filter,
// the "fits my vehicle only" toggle, and a focus nonce that lets any consumer
// request the #catalog section be scrolled into view.
// -----------------------------------------------------------------------------

const CatalogContext = createContext(null);

export function CatalogProvider({ children }) {
  const [category, setCategoryState] = useState("All");
  const [fitsOnly, setFitsOnlyState] = useState(false);
  const [focusNonce, setFocusNonce] = useState(0);

  const setCategory = useCallback((c) => setCategoryState(c || "All"), []);
  const setFitsOnly = useCallback((b) => setFitsOnlyState(Boolean(b)), []);
  const focusCatalog = useCallback(() => setFocusNonce((n) => n + 1), []);

  const value = useMemo(
    () => ({
      category,
      setCategory,
      fitsOnly,
      setFitsOnly,
      focusNonce,
      focusCatalog,
    }),
    [category, setCategory, fitsOnly, setFitsOnly, focusNonce, focusCatalog]
  );

  return (
    <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
  );
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used within a CatalogProvider");
  return ctx;
}
