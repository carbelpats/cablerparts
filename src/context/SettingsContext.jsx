// -----------------------------------------------------------------------------
// AL-MEYAR — SettingsContext (service-backed site CMS)
//
// Backed by src/services/settingsService.js, which auto-selects a Supabase
// adapter when configured and otherwise a LOCAL localStorage adapter
// ("almeyar:settings"). This context owns NO persistence logic of its own — it
// loads settings on mount via getSettings() and exposes a stable hook surface.
//
// useSettings() -> {
//   settings,                         // always a complete Settings object
//   loading,                          // true during the initial load
//   reloading,                        // true while a save / reset is in flight
//   updateSettings(patch): Promise,   // deep-merges + persists + updates state
//   resetSettings(): Promise,         // persists DEFAULT_SETTINGS
// }
//
// SSR-safe: starts from DEFAULT_SETTINGS so consumers can render immediately,
// then hydrates from the service. No Date.now()/Math.random at module top.
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
import {
  getSettings as svcGetSettings,
  saveSettings as svcSaveSettings,
  DEFAULT_SETTINGS,
} from "../services/settingsService";

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  // Start from defaults so the storefront has complete data on first paint,
  // then hydrate from the service in an effect.
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);

  // Guard against state writes after unmount / stale async resolutions.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // -- initial load ----------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loaded = await svcGetSettings();
        if (!cancelled && mountedRef.current && loaded) setSettings(loaded);
      } catch {
        // keep DEFAULT_SETTINGS already in state
      } finally {
        if (!cancelled && mountedRef.current) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // -- deep-merge a patch, persist, then reflect locally ---------------------
  const updateSettings = useCallback(async (patch) => {
    setReloading(true);
    try {
      const saved = await svcSaveSettings(patch || {});
      if (mountedRef.current && saved) setSettings(saved);
      return saved;
    } finally {
      if (mountedRef.current) setReloading(false);
    }
  }, []);

  // -- restore the shipped defaults -----------------------------------------
  const resetSettings = useCallback(async () => {
    setReloading(true);
    try {
      const saved = await svcSaveSettings(DEFAULT_SETTINGS);
      if (mountedRef.current && saved) setSettings(saved);
      return saved;
    } finally {
      if (mountedRef.current) setReloading(false);
    }
  }, []);

  const value = useMemo(
    () => ({ settings, loading, reloading, updateSettings, resetSettings }),
    [settings, loading, reloading, updateSettings, resetSettings]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return ctx;
}
