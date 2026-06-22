import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";

/* ----------------------------------------------------------------------------
   ToastContext — a lightweight, dependency-free toast queue.

   useToast() exposes showToast(message, opts?) which pushes a pill onto a
   queue; each toast auto-dismisses after ~3s. Timers are tracked per-id and
   cleaned up on unmount (and on manual dismiss) so nothing leaks. No Date.now
   or Math.random at module top — ids come from a monotonic ref counter created
   at runtime, keeping module evaluation side-effect-free.

   The visual stack lives in <Toaster/> (rendered once at the app root); this
   file only owns state + the public API.
---------------------------------------------------------------------------- */

const ToastContext = createContext(null);

const DEFAULT_DURATION = 3000;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  // Monotonic id source + live timer registry (id -> timeout handle).
  const idRef = useRef(0);
  const timersRef = useRef(new Map());

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timers = timersRef.current;
    const handle = timers.get(id);
    if (handle) {
      clearTimeout(handle);
      timers.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (message, opts = {}) => {
      if (!message) return undefined;
      const id = ++idRef.current;
      const duration =
        typeof opts.duration === "number" ? opts.duration : DEFAULT_DURATION;
      const tone = opts.tone === "success" ? "success" : "default";

      setToasts((prev) => [...prev, { id, message, tone }]);

      if (duration > 0) {
        const handle = setTimeout(() => {
          dismissToast(id);
        }, duration);
        timersRef.current.set(id, handle);
      }

      return id;
    },
    [dismissToast]
  );

  // Clean up every outstanding timer when the provider unmounts.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((handle) => clearTimeout(handle));
      timers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
