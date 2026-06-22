import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { REGIONS, formatPrice, convert as convertUSD } from "../lib/geoPricing";

const STORAGE_KEY = "almeyar-region";
const GeoContext = createContext(null);

function readStored() {
  if (typeof window === "undefined") return REGIONS[0].code;
  try {
    const code = window.localStorage.getItem(STORAGE_KEY);
    if (code && REGIONS.some((r) => r.code === code)) return code;
  } catch {
    /* ignore */
  }
  return REGIONS[0].code;
}

export function GeoProvider({ children }) {
  const [code, setCode] = useState(readStored);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* ignore */
    }
  }, [code]);

  const region = REGIONS.find((r) => r.code === code) || REGIONS[0];

  const setRegion = useCallback((nextCode) => {
    if (REGIONS.some((r) => r.code === nextCode)) setCode(nextCode);
  }, []);

  const format = useCallback((baseUSD) => formatPrice(baseUSD, code), [code]);
  const convert = useCallback((baseUSD) => convertUSD(baseUSD, code), [code]);

  return (
    <GeoContext.Provider
      value={{ region, setRegion, regions: REGIONS, format, convert }}
    >
      {children}
    </GeoContext.Provider>
  );
}

export function useGeo() {
  const ctx = useContext(GeoContext);
  if (!ctx) throw new Error("useGeo must be used within a GeoProvider");
  return ctx;
}
