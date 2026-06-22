import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

// -----------------------------------------------------------------------------
// Al-Meyar — holds the product currently shown in the full-screen
// ProductDetailModal. A null product means the modal is closed. Lives near the
// provider root so any card / related-product tile can open the modal.
// -----------------------------------------------------------------------------

const ProductModalContext = createContext(null);

export function ProductModalProvider({ children }) {
  const [product, setProduct] = useState(null);

  const openProduct = useCallback((p) => setProduct(p || null), []);
  const closeProduct = useCallback(() => setProduct(null), []);

  const value = useMemo(
    () => ({ product, openProduct, closeProduct }),
    [product, openProduct, closeProduct]
  );

  return (
    <ProductModalContext.Provider value={value}>
      {children}
    </ProductModalContext.Provider>
  );
}

export function useProductModal() {
  const ctx = useContext(ProductModalContext);
  if (!ctx)
    throw new Error(
      "useProductModal must be used within a ProductModalProvider"
    );
  return ctx;
}
