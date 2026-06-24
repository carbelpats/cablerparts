// -----------------------------------------------------------------------------
// AL-MEYAR — OrdersContext (service-backed)
//
// Backed by src/services/ordersService.js, which auto-selects a Supabase adapter
// when configured (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY) and otherwise a
// LOCAL localStorage adapter ("almeyar:orders"). This context owns NO persistence
// logic of its own — it consumes the service and exposes a stable hook surface.
//
// Depends on useAuth — MUST be nested INSIDE <AuthProvider>. Current-user orders
// are (re)loaded on mount and whenever the signed-in user changes. Admins also
// get `allOrders` (the full order book) loaded when isAdmin becomes true.
//
// Status is now ADMIN-CONTROLLED (NOT elapsed-time): an order is "Processing"
// when placed and only advances when an admin calls updateStatus. getOrderStatus
// therefore derives the 3-step timeline from order.status + order.statusHistory
// timestamps, not from how long ago the order was created.
//
// No Date.now() at module top level — only inside functions/handlers/effects.
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
import { useAuth } from "./AuthContext";
import {
  listOrders as svcListOrders,
  placeOrder as svcPlaceOrder,
  getOrder as svcGetOrder,
  getAllOrders as svcGetAllOrders,
  updateOrderStatus as svcUpdateOrderStatus,
  updateOrderFields as svcUpdateOrderFields,
  trackById as svcTrackById,
  ORDER_STATUSES,
  CANCELLED_STATUS,
  TERMINAL_STATUSES,
} from "../services/ordersService";

const OrdersContext = createContext(null);

// stable stage keys (pages/timeline localize the labels). The linear lifecycle:
// Received -> PaymentConfirmed -> Processing -> Packed -> Shipped ->
// OutForDelivery -> Delivered.
const STAGES = ORDER_STATUSES;

// ---------------------------------------------------------------------------
// Derive the timeline from an order's CURRENT status + statusHistory.
//
// statusHistory is an append-only list of { status, at } entries (the timestamp
// recorded when each status was set). We find the timestamp for each known stage
// and mark stages at/below the current status index as "done"; the highest
// reached stage (when not yet Delivered) is "current".
//
// The step count is DYNAMIC (driven by STAGES) so adding/removing lifecycle
// stages needs no change here. Cancelled/Returned/Refunded are terminal,
// OFF-track statuses rendered as a distinct badge.
// ---------------------------------------------------------------------------
function deriveStatus(order) {
  const status = order?.status || STAGES[0];

  const history = Array.isArray(order?.statusHistory)
    ? order.statusHistory
    : [];

  // last recorded timestamp for a given status key (history is chronological)
  function atFor(stageKey) {
    for (let i = history.length - 1; i >= 0; i -= 1) {
      if (history[i] && history[i].status === stageKey) {
        return history[i].at ?? null;
      }
    }
    // fall back to createdAt for the first stage if no history exists
    if (stageKey === STAGES[0]) return order?.createdAt ?? null;
    return null;
  }

  // Highest linear stage the order reached before any terminal status (so a
  // returned order still shows it got as far as, say, Delivered).
  function highestReachedIndex() {
    let max = -1;
    for (const h of history) {
      const idx = STAGES.indexOf(h?.status);
      if (idx > max) max = idx;
    }
    return max;
  }

  // Terminal (off-track) statuses — report a distinct shape so the UI can render
  // a terminal state instead of the progress dots. `cancelled`/`cancelledAt` are
  // kept for back-compat; `terminalStatus`/`terminalAt`/`offTrack` are general.
  if (TERMINAL_STATUSES.includes(status)) {
    const reached = highestReachedIndex();
    return {
      stage: status,
      stageIndex: -1,
      offTrack: true,
      terminalStatus: status,
      terminalAt: atFor(status),
      // back-compat aliases (older consumers only know "cancelled")
      cancelled: status === CANCELLED_STATUS,
      cancelledAt: status === CANCELLED_STATUS ? atFor(status) : null,
      delivered: false,
      steps: STAGES.map((key, i) => ({
        key,
        at: atFor(key),
        done: i <= reached,
        current: false,
      })),
    };
  }

  let stageIndex = STAGES.indexOf(status);
  if (stageIndex < 0) stageIndex = 0;

  const delivered = stageIndex >= STAGES.length - 1;

  const steps = STAGES.map((key, i) => ({
    key,
    at: atFor(key),
    // a stage is complete once we've reached or passed it; the current,
    // non-final stage is "in progress" rather than fully done
    done: delivered ? i <= stageIndex : i < stageIndex,
    current: !delivered && i === stageIndex,
  }));

  return {
    stage: STAGES[stageIndex],
    stageIndex,
    steps,
    delivered,
    offTrack: false,
    terminalStatus: null,
    terminalAt: null,
    cancelled: false,
    cancelledAt: null,
  };
}

export function OrdersProvider({ children }) {
  const { user, isAdmin } = useAuth();
  const userId = user ? user.id : null;

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [allOrders, setAllOrders] = useState([]);

  // guards against state writes after unmount / stale async resolutions
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // -- current-user orders: load on mount + whenever the user changes ---------
  const refresh = useCallback(async () => {
    if (!userId) {
      setOrders([]);
      setLoading(false);
      return [];
    }
    setLoading(true);
    try {
      const list = await svcListOrders(userId);
      if (mountedRef.current) setOrders(Array.isArray(list) ? list : []);
      return list;
    } catch {
      if (mountedRef.current) setOrders([]);
      return [];
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // -- admin order book: load when isAdmin -----------------------------------
  const refreshAll = useCallback(async () => {
    if (!isAdmin) {
      setAllOrders([]);
      return [];
    }
    try {
      const list = await svcGetAllOrders();
      if (mountedRef.current) setAllOrders(Array.isArray(list) ? list : []);
      return list;
    } catch {
      if (mountedRef.current) setAllOrders([]);
      return [];
    }
  }, [isAdmin]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // -- place an order (attaches userId + paymentId) --------------------------
  const placeOrder = useCallback(
    async (payload = {}) => {
      const order = await svcPlaceOrder({
        ...payload,
        userId: userId ?? payload.userId ?? null,
        paymentId: payload.paymentId ?? null,
      });
      // optimistic: prepend to the current-user list (newest first)
      if (mountedRef.current && order && order.userId === userId) {
        setOrders((prev) => [order, ...prev]);
      }
      return order;
    },
    [userId]
  );

  // -- single order lookup (current user) ------------------------------------
  // Synchronous first (from the loaded list) so callers that read on render
  // keep working; falls back to a fresh service fetch when not in memory.
  const getOrder = useCallback(
    (orderId) => {
      const id = String(orderId || "");
      const local = orders.find(
        (o) => String(o.id).toLowerCase() === id.toLowerCase()
      );
      if (local) return local;
      return svcGetOrder(orderId, userId ?? undefined);
    },
    [orders, userId]
  );

  // -- derived 3-step timeline from status + statusHistory (NOT elapsed time)--
  const getOrderStatus = useCallback((order) => deriveStatus(order), []);

  // -- has the current user ever purchased a given product? ------------------
  const hasPurchased = useCallback(
    (productId) => {
      if (!userId || productId == null) return false;
      return orders.some((o) =>
        (o.items || []).some((it) => it.id === productId)
      );
    },
    [orders, userId]
  );

  // -- id-scoped tracking (service handles real-vs-demo) ---------------------
  // Enrich the service result with the derived timeline (`status`) so the Track
  // Order page can render <OrderStatusTimeline> for both real and demo orders.
  const trackById = useCallback(async (orderId) => {
    const res = await svcTrackById(orderId);
    if (res && res.order) {
      return { ...res, status: deriveStatus(res.order) };
    }
    return res;
  }, []);

  // -- admin: change an order's status, then reflect everywhere --------------
  const updateStatus = useCallback(
    async (id, status) => {
      const updated = await svcUpdateOrderStatus(id, status);
      if (mountedRef.current && updated) {
        const matches = (o) =>
          String(o.id).toLowerCase() === String(id).toLowerCase();
        setAllOrders((prev) => prev.map((o) => (matches(o) ? updated : o)));
        setOrders((prev) => prev.map((o) => (matches(o) ? updated : o)));
      }
      return updated;
    },
    []
  );

  // -- admin: patch shipping/tracking fields on an order ---------------------
  const updateTracking = useCallback(async (id, fields) => {
    const updated = await svcUpdateOrderFields(id, fields);
    if (mountedRef.current && updated) {
      const matches = (o) =>
        String(o.id).toLowerCase() === String(id).toLowerCase();
      setAllOrders((prev) => prev.map((o) => (matches(o) ? updated : o)));
      setOrders((prev) => prev.map((o) => (matches(o) ? updated : o)));
    }
    return updated;
  }, []);

  const value = useMemo(
    () => ({
      orders,
      loading,
      placeOrder,
      getOrder,
      getOrderStatus,
      hasPurchased,
      trackById,
      refresh,
      // admin surface
      allOrders,
      updateStatus,
      updateTracking,
    }),
    [
      orders,
      loading,
      placeOrder,
      getOrder,
      getOrderStatus,
      hasPurchased,
      trackById,
      refresh,
      allOrders,
      updateStatus,
      updateTracking,
    ]
  );

  return (
    <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrders must be used within an OrdersProvider");
  return ctx;
}
