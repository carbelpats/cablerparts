// -----------------------------------------------------------------------------
// AL-MEYAR — ProductsContext
//
// Backs the storefront + admin product catalog with productsService, which
// auto-selects a Supabase adapter when configured (VITE_SUPABASE_URL +
// VITE_SUPABASE_ANON_KEY) else a LOCAL localStorage adapter seeded from
// data.js PRODUCTS. The whole app therefore works with or without a backend.
//
// Placed INSIDE <AuthProvider> in the provider tree (admin mutations are
// role-gated at the route level; this context just consumes the service).
//
// Surface — useProducts() -> {
//   products, loading, error,
//   getProduct(id),
//   createProduct(p), updateProduct(id, patch), deleteProduct(id),
//   refresh()
// }
//
// Mutations are OPTIMISTIC: local state updates immediately, the service call
// runs, then we reconcile with the server-returned record (or roll back +
// rethrow on failure so the caller can surface a toast).
//
// No Date.now()/Math.random at module top level.
// -----------------------------------------------------------------------------

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import * as productsService from "../services/productsService";
import { PRODUCTS as SEED_PRODUCTS } from "../lib/data";
import { markAppReady, markLoadSettled } from "../lib/bootHealth";

const ProductsContext = createContext(null);

// The initial catalog load races this deadline: past it, the seed catalog is
// shown and the real fetch keeps retrying in the background. The storefront
// therefore can NEVER sit on skeletons indefinitely (the stale-auth-token
// freeze), and a late-arriving cloud catalog still swaps in seamlessly.
const INITIAL_LOAD_DEADLINE_MS = 7000;
const RETRY_DELAY_MS = 10000;
const MAX_BACKGROUND_RETRIES = 3;

export function ProductsProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // "live"  -> products came from the real adapter (cloud or local store);
  // "seed"  -> the deadline fallback is showing build-time seed data. Checkout
  //            blocks real payments while "seed" (prices could be stale).
  const [catalogSource, setCatalogSource] = useState("live");

  // guards against setState after unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (mountedRef.current) {
      setLoading(true);
      setError(null);
    }
    try {
      const list = await productsService.listProducts();
      if (mountedRef.current) {
        setProducts(Array.isArray(list) ? list : []);
      }
      return list;
    } catch (err) {
      if (mountedRef.current) {
        setError(err?.message || "products_load_failed");
        setProducts([]);
      }
      throw err;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // Initial load — one fetch, one deadline timer, one settle handler (no
  // Promise.race, so there is exactly one owner for every state transition):
  //   • fetch resolves (any time)  -> live catalog + markAppReady.
  //   • deadline fires first       -> seed fallback shows; the still-pending
  //     fetch keeps running and swaps in seamlessly whenever it settles.
  //   • fetch rejects              -> seed fallback + bounded background
  //     retries (swap in-place; never flip `loading` back to skeletons).
  // markLoadSettled tells the boot watchdog the pipeline is ALIVE (a rejection
  // is an outage, not the auth wedge); only a real success marks the boot
  // healthy, so the watchdog can still heal a poisoned token across visits.
  useEffect(() => {
    let disposed = false;
    let retryTimer = null;
    let fellBack = false;
    let loaded = false;

    // Background retry — swaps data in-place WITHOUT flipping `loading`.
    const attempt = (retriesLeft) => {
      productsService
        .listProducts()
        .then((list) => {
          markLoadSettled();
          if (disposed || !mountedRef.current) return;
          setProducts(Array.isArray(list) ? list : []);
          setCatalogSource("live");
          setError(null);
          markAppReady();
        })
        .catch(() => {
          markLoadSettled();
          if (disposed || retriesLeft <= 0) return;
          retryTimer = setTimeout(
            () => attempt(retriesLeft - 1),
            RETRY_DELAY_MS
          );
        });
    };

    const deadlineTimer = setTimeout(() => {
      if (disposed || !mountedRef.current || loaded) return;
      fellBack = true;
      setProducts((prev) => (prev.length ? prev : SEED_PRODUCTS));
      setCatalogSource("seed");
      setLoading(false);
    }, INITIAL_LOAD_DEADLINE_MS);

    productsService
      .listProducts()
      .then((list) => {
        loaded = true;
        markLoadSettled();
        clearTimeout(deadlineTimer);
        if (disposed || !mountedRef.current) return;
        setProducts(Array.isArray(list) ? list : []);
        setCatalogSource("live");
        setError(null);
        setLoading(false);
        markAppReady();
      })
      .catch(() => {
        markLoadSettled(); // rejected = pipeline alive; outage, not a hang
        clearTimeout(deadlineTimer);
        if (disposed || !mountedRef.current) return;
        if (!fellBack) {
          fellBack = true;
          setProducts((prev) => (prev.length ? prev : SEED_PRODUCTS));
          setCatalogSource("seed");
          setLoading(false);
        }
        attempt(MAX_BACKGROUND_RETRIES);
      });

    return () => {
      disposed = true;
      clearTimeout(deadlineTimer);
      if (retryTimer) clearTimeout(retryTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // read-through helper: prefer the in-memory list, fall back to the service
  const getProduct = useCallback(
    async (id) => {
      const local = products.find((p) => String(p.id) === String(id));
      if (local) return local;
      return productsService.getProduct(id);
    },
    [products]
  );

  const createProduct = useCallback(async (p) => {
    setError(null);
    const created = await productsService.createProduct(p);
    if (mountedRef.current) {
      setProducts((prev) => {
        // replace if an entry with this id already exists, else append
        const exists = prev.some(
          (x) => String(x.id) === String(created.id)
        );
        return exists
          ? prev.map((x) =>
              String(x.id) === String(created.id) ? created : x
            )
          : [...prev, created];
      });
    }
    return created;
  }, []);

  const updateProduct = useCallback(async (id, patch) => {
    setError(null);

    // optimistic: snapshot the previous record for rollback
    let previous;
    if (mountedRef.current) {
      setProducts((prev) =>
        prev.map((x) => {
          if (String(x.id) === String(id)) {
            previous = x;
            return { ...x, ...patch, id: x.id };
          }
          return x;
        })
      );
    }

    try {
      const updated = await productsService.updateProduct(id, patch);
      if (mountedRef.current) {
        setProducts((prev) =>
          prev.map((x) =>
            String(x.id) === String(updated.id) ? updated : x
          )
        );
      }
      return updated;
    } catch (err) {
      // roll back the optimistic patch
      if (mountedRef.current && previous) {
        setProducts((prev) =>
          prev.map((x) => (String(x.id) === String(id) ? previous : x))
        );
      }
      if (mountedRef.current) setError(err?.message || "product_update_failed");
      throw err;
    }
  }, []);

  const deleteProduct = useCallback(async (id) => {
    setError(null);

    // optimistic: snapshot the removed record for rollback
    let removed;
    if (mountedRef.current) {
      setProducts((prev) => {
        removed = prev.find((x) => String(x.id) === String(id));
        return prev.filter((x) => String(x.id) !== String(id));
      });
    }

    try {
      await productsService.deleteProduct(id);
    } catch (err) {
      // roll back the optimistic removal
      if (mountedRef.current && removed) {
        setProducts((prev) =>
          prev.some((x) => String(x.id) === String(id))
            ? prev
            : [...prev, removed]
        );
      }
      if (mountedRef.current) setError(err?.message || "product_delete_failed");
      throw err;
    }
  }, []);

  const value = useMemo(
    () => ({
      products,
      loading,
      error,
      catalogSource,
      getProduct,
      createProduct,
      updateProduct,
      deleteProduct,
      refresh,
    }),
    [
      products,
      loading,
      error,
      catalogSource,
      getProduct,
      createProduct,
      updateProduct,
      deleteProduct,
      refresh,
    ]
  );

  return (
    <ProductsContext.Provider value={value}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  const ctx = useContext(ProductsContext);
  if (!ctx)
    throw new Error("useProducts must be used within a ProductsProvider");
  return ctx;
}
