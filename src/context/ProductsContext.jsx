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

const ProductsContext = createContext(null);

export function ProductsProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  // load once on mount
  useEffect(() => {
    refresh().catch(() => {
      /* error already captured in state */
    });
  }, [refresh]);

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
