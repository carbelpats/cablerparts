import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

// -----------------------------------------------------------------------------
// Al-Meyar — controls the full-screen CheckoutModal (boost-gauge stepper).
// A simple boolean open/closed flag, mirroring ProductModalContext. SSR-safe
// (no window access, no persistence). Lives near the provider root so the
// CartDrawer's "Secure Checkout" button can open it from anywhere.
//
// Provider nesting (load-bearing): it sits OUTSIDE CatalogProvider but INSIDE
// CartProvider, so the modal can read useCart totals + clearCart on success.
// -----------------------------------------------------------------------------

const CheckoutContext = createContext(null);

export function CheckoutProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  const openCheckout = useCallback(() => setIsOpen(true), []);
  const closeCheckout = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({ isOpen, openCheckout, closeCheckout }),
    [isOpen, openCheckout, closeCheckout]
  );

  return (
    <CheckoutContext.Provider value={value}>
      {children}
    </CheckoutContext.Provider>
  );
}

export function useCheckout() {
  const ctx = useContext(CheckoutContext);
  if (!ctx)
    throw new Error("useCheckout must be used within a CheckoutProvider");
  return ctx;
}
