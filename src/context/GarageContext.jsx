import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

const STORAGE_KEY = "almeyar-garage";
const GarageContext = createContext(null);

function readStored() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (v && typeof v === "object" && v.make && v.model && v.year) {
      return { make: v.make, model: v.model, year: v.year };
    }
  } catch {
    /* ignore corrupt storage */
  }
  return null;
}

export function GarageProvider({ children }) {
  const [vehicle, setVehicleState] = useState(readStored);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (vehicle) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(vehicle));
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* ignore */
    }
  }, [vehicle]);

  const setVehicle = useCallback((v) => {
    if (v && v.make && v.model && v.year) {
      setVehicleState({ make: v.make, model: v.model, year: v.year });
    } else {
      setVehicleState(null);
    }
  }, []);

  const clearGarage = useCallback(() => setVehicleState(null), []);

  return (
    <GarageContext.Provider
      value={{ vehicle, setVehicle, clearGarage, hasVehicle: !!vehicle }}
    >
      {children}
    </GarageContext.Provider>
  );
}

export function useGarage() {
  const ctx = useContext(GarageContext);
  if (!ctx) throw new Error("useGarage must be used within a GarageProvider");
  return ctx;
}
