import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  COUPONS,
  FREE_SHIPPING_USD,
  SHIPPING_FLAT_USD,
} from "../lib/data";
import { useGarage } from "./GarageContext";
import { useAuth } from "./AuthContext";
import { loadCart, saveCart } from "../services/cartService";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  // CartProvider must be nested INSIDE GarageProvider — coupons can require a vehicle.
  const { hasVehicle } = useGarage();
  // ...and INSIDE AuthProvider — the cart is persisted per signed-in user.
  const { user } = useAuth();
  const userId = user?.id || null;

  const [items, setItems] = useState([]);
  const [coupon, setCoupon] = useState(null);
  const [couponError, setCouponError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  // Mini-cart signal: the most recently added line + a monotonic nonce so the
  // MiniCart re-triggers even when the SAME product is added twice in a row.
  // This does NOT open the full drawer — that contract is preserved below.
  const [lastAdded, setLastAdded] = useState(null);
  const addNonceRef = useRef(0);

  // Guards so the load-driven setState doesn't immediately re-persist, and so we
  // don't save before the first load for a given user has resolved.
  const loadedForRef = useRef(undefined); // userId the current state was loaded for
  const skipNextSaveRef = useRef(false);

  // ---- load on mount + whenever the signed-in user changes ------------------
  useEffect(() => {
    let cancelled = false;
    skipNextSaveRef.current = true; // the setState below is hydration, not a user edit
    loadCart(userId)
      .then((cart) => {
        if (cancelled) return;
        setItems(Array.isArray(cart.items) ? cart.items : []);
        setCoupon(cart.coupon && cart.coupon.code ? cart.coupon : null);
        setCouponError(null);
        loadedForRef.current = userId;
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
        setCoupon(null);
        loadedForRef.current = userId;
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // ---- persist items + coupon (after the cart for this user has loaded) ------
  useEffect(() => {
    // don't save until the first load for the current user has completed
    if (loadedForRef.current !== userId) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    saveCart(userId, { items, coupon });
  }, [items, coupon, userId]);

  // ---- line items -----------------------------------------------------------
  const addItem = useCallback((product) => {
    if (!product || !product.id) return;
    let addedQty = 1;
    setItems((prev) => {
      const existing = prev.find((it) => it.id === product.id);
      if (existing) {
        addedQty = existing.qty + 1;
        return prev.map((it) =>
          it.id === product.id ? { ...it, qty: it.qty + 1 } : it
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          nameAr: product.nameAr,
          brand: product.brand,
          priceUSD: product.priceUSD,
          qty: 1,
          icon: product.icon,
          accent: product.accent,
          fitment: product.fitment || [],
        },
      ];
    });
    // Emit the mini-cart signal (a compact snapshot of the added line + a fresh
    // nonce). The MiniCart surface watches this; the full drawer stays closed —
    // UI still calls openCart() explicitly when it wants the drawer.
    addNonceRef.current += 1;
    setLastAdded({
      nonce: addNonceRef.current,
      item: {
        id: product.id,
        name: product.name,
        nameAr: product.nameAr,
        brand: product.brand,
        priceUSD: product.priceUSD,
        icon: product.icon,
        accent: product.accent,
        qty: addedQty,
      },
    });
    // NOTE: addItem does NOT auto-open the cart — UI calls openCart() explicitly.
  }, []);

  const clearLastAdded = useCallback(() => setLastAdded(null), []);

  const removeItem = useCallback((id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const updateQty = useCallback((id, qty) => {
    const next = Math.max(0, Math.floor(Number(qty) || 0));
    setItems((prev) =>
      next <= 0
        ? prev.filter((it) => it.id !== id)
        : prev.map((it) => (it.id === id ? { ...it, qty: next } : it))
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setCoupon(null);
    setCouponError(null);
  }, []);

  // ---- drawer ---------------------------------------------------------------
  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  // ---- totals ---------------------------------------------------------------
  const count = useMemo(
    () => items.reduce((sum, it) => sum + it.qty, 0),
    [items]
  );

  const subtotalUSD = useMemo(
    () => items.reduce((sum, it) => sum + it.priceUSD * it.qty, 0),
    [items]
  );

  // ---- coupons --------------------------------------------------------------
  // Validate the active coupon against current subtotal + garage state.
  const couponValid = useMemo(() => {
    if (!coupon) return false;
    if (subtotalUSD < coupon.minUSD) return false;
    if (coupon.requiresGarage && !hasVehicle) return false;
    return true;
  }, [coupon, subtotalUSD, hasVehicle]);

  const applyCoupon = useCallback(
    (code) => {
      const normalized = String(code || "").trim().toUpperCase();
      if (!normalized) {
        setCouponError("Enter a coupon code.");
        return false;
      }
      const found = COUPONS.find((c) => c.code === normalized);
      if (!found) {
        setCouponError("Invalid coupon code.");
        return false;
      }
      if (found.requiresGarage && !hasVehicle) {
        setCouponError("Add a vehicle to your Garage to use this code.");
        return false;
      }
      if (subtotalUSD < found.minUSD) {
        setCouponError(
          `Spend at least $${found.minUSD} to use ${found.code}.`
        );
        return false;
      }
      setCoupon(found);
      setCouponError(null);
      return true;
    },
    [hasVehicle, subtotalUSD]
  );

  const removeCoupon = useCallback(() => {
    setCoupon(null);
    setCouponError(null);
  }, []);

  // ---- discount / shipping / total -----------------------------------------
  const discountUSD = useMemo(() => {
    if (!coupon || !couponValid) return 0;
    if (coupon.type === "percent") {
      return (subtotalUSD * coupon.value) / 100;
    }
    return 0; // shipping coupons discount shipping, not subtotal
  }, [coupon, couponValid, subtotalUSD]);

  const shippingUSD = useMemo(() => {
    if (subtotalUSD <= 0) return 0;
    const freeViaCoupon =
      coupon && couponValid && coupon.type === "shipping";
    if (freeViaCoupon) return 0;
    if (subtotalUSD >= FREE_SHIPPING_USD) return 0;
    return SHIPPING_FLAT_USD;
  }, [coupon, couponValid, subtotalUSD]);

  const totalUSD = useMemo(
    () => Math.max(0, subtotalUSD - discountUSD) + shippingUSD,
    [subtotalUSD, discountUSD, shippingUSD]
  );

  const freeShippingRemainingUSD = useMemo(
    () => Math.max(0, FREE_SHIPPING_USD - subtotalUSD),
    [subtotalUSD]
  );

  const value = {
    items,
    addItem,
    removeItem,
    updateQty,
    clearCart,
    isOpen,
    openCart,
    closeCart,
    lastAdded,
    clearLastAdded,
    count,
    subtotalUSD,
    coupon, // stored coupon object (or null); validity is reflected in discountUSD/shippingUSD
    couponError,
    applyCoupon,
    removeCoupon,
    discountUSD,
    shippingUSD,
    totalUSD,
    freeShippingRemainingUSD,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
