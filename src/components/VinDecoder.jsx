import { useCallback, useId, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ScanLine,
  Search,
  CheckCircle2,
  AlertCircle,
  Car,
  Sparkles,
  ArrowRight,
  SlidersHorizontal,
  Globe,
  CalendarDays,
} from "lucide-react";
import { isValidVin, decodeVin } from "../lib/vinDecode.js";
import { getMakes, getModels, getYears } from "../lib/data.js";
import { useGarage } from "../context/GarageContext.jsx";
import { useLang } from "../context/LanguageContext.jsx";
import { useCatalog } from "../context/CatalogContext.jsx";

/* -------------------------------------------------------------------------- */
/* Localized copy (component-local STRINGS per convention)                      */
/* -------------------------------------------------------------------------- */

const STRINGS = {
  en: {
    vinMode: "VIN",
    smartMode: "Smart Search",
    vinLabel: "Vehicle Identification Number",
    vinPlaceholder: "17-character VIN",
    decode: "Decode",
    resultKicker: "VIN decoded",
    region: "Region",
    modelYear: "Model year",
    detectedMake: "Detected make",
    unknownMake: "Not detected",
    prefillNote: "We pre-filled what we could — confirm below.",
    // smart search
    make: "Make",
    model: "Model",
    year: "Year",
    chooseMake: "Select make",
    chooseModel: "Select model",
    chooseYear: "Select year",
    selectMakeFirst: "Select a make first",
    selectModelFirst: "Select a model first",
    confirm: "Add to Garage",
    confirmed: "Added — opening your parts…",
    errLength: "A VIN must be exactly 17 characters.",
    errChar: "A VIN can't contain the letters I, O or Q.",
    errCheck: "That VIN failed its check-digit test — please re-check it.",
    hint: "Enter your 17-character VIN, or switch to Smart Search.",
    smartHint: "Pick your Make, Model and Year to fill your garage.",
  },
  ar: {
    vinMode: "رقم الهيكل",
    smartMode: "البحث الذكي",
    vinLabel: "رقم تعريف المركبة (VIN)",
    vinPlaceholder: "رقم هيكل من 17 خانة",
    decode: "فك الترميز",
    resultKicker: "تم فك ترميز رقم الهيكل",
    region: "المنطقة",
    modelYear: "سنة الموديل",
    detectedMake: "الماركة المكتشفة",
    unknownMake: "لم تُكتشف",
    prefillNote: "عبّأنا ما أمكن — أكّد التفاصيل أدناه.",
    // smart search
    make: "الماركة",
    model: "الطراز",
    year: "السنة",
    chooseMake: "اختر الماركة",
    chooseModel: "اختر الطراز",
    chooseYear: "اختر السنة",
    selectMakeFirst: "اختر الماركة أولاً",
    selectModelFirst: "اختر الطراز أولاً",
    confirm: "أضف إلى المرآب",
    confirmed: "تمت الإضافة — جارٍ فتح القطع…",
    errLength: "يجب أن يتكوّن رقم الهيكل من 17 خانة بالضبط.",
    errChar: "لا يمكن أن يحتوي رقم الهيكل على الأحرف I أو O أو Q.",
    errCheck: "فشل اختبار خانة التحقق لرقم الهيكل — يُرجى التحقق منه.",
    hint: "أدخل رقم الهيكل المكوّن من 17 خانة، أو انتقل إلى البحث الذكي.",
    smartHint: "اختر الماركة والطراز والسنة لتعبئة مرآبك.",
  },
};

/* Region label localization (decodeVin returns canonical English regions). */
const REGION_AR = {
  "North America": "أمريكا الشمالية",
  Oceania: "أوقيانوسيا",
  "South America": "أمريكا الجنوبية",
  Africa: "أفريقيا",
  Asia: "آسيا",
  Europe: "أوروبا",
  Unknown: "غير معروفة",
};

/* Precise localized error from a structurally-rejected VIN. */
function vinErrorKey(raw) {
  const clean = String(raw || "").trim().toUpperCase();
  if (clean.length !== 17) return "errLength";
  if (/[IOQ]/.test(clean)) return "errChar";
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(clean)) return "errChar";
  return "errCheck"; // right length + charset, so it's the check digit
}

/* -------------------------------------------------------------------------- */
/* Component                                                                    */
/* -------------------------------------------------------------------------- */

export default function VinDecoder() {
  const { setVehicle } = useGarage();
  const { lang } = useLang();
  const { setFitsOnly, focusCatalog } = useCatalog();
  const navigate = useNavigate();
  const location = useLocation();
  const tx = STRINGS[lang] || STRINGS.en;

  const inputId = useId();
  const errorId = useId();
  const makeSelId = useId();
  const modelSelId = useId();
  const yearSelId = useId();

  const [mode, setMode] = useState("vin"); // "vin" | "smart"
  const [vin, setVin] = useState("");
  const [decoded, setDecoded] = useState(null); // {valid,year,region,wmi,makeGuess}|null
  const [error, setError] = useState(null); // string|null
  const [confirmed, setConfirmed] = useState(false);

  // Smart-search cascading selects.
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");

  const makes = useMemo(() => getMakes(), []);
  const models = useMemo(() => getModels(make), [make]);
  const years = useMemo(() => getYears(make, model), [make, model]);

  const resetFeedback = useCallback(() => {
    setError(null);
    setConfirmed(false);
  }, []);

  const switchMode = useCallback(
    (next) => {
      if (next === mode) return;
      setMode(next);
      resetFeedback();
    },
    [mode, resetFeedback]
  );

  /* Drive the catalog into fits-only + focus, then route there. Works whether
     we're already on the landing ("/") or on another route. */
  const routeToCatalog = useCallback(() => {
    setFitsOnly(true);
    focusCatalog();
    if (location.pathname === "/") {
      // Already on landing — focusCatalog's nonce scrolls; nudge the hash too.
      if (location.hash !== "#catalog") navigate("/#catalog");
    } else {
      navigate("/#catalog");
    }
  }, [setFitsOnly, focusCatalog, navigate, location.pathname, location.hash]);

  const commitVehicle = useCallback(
    (mk, md, yr) => {
      setVehicle({ make: mk, model: md, year: yr });
      setConfirmed(true);
      routeToCatalog();
    },
    [setVehicle, routeToCatalog]
  );

  /* ----------------------------- VIN handlers ---------------------------- */

  const handleVinChange = useCallback(
    (e) => {
      const next = e.target.value.toUpperCase().replace(/\s+/g, "");
      setVin(next);
      if (decoded || error || confirmed) {
        setDecoded(null);
        resetFeedback();
      }
    },
    [decoded, error, confirmed, resetFeedback]
  );

  const handleDecode = useCallback(
    (e) => {
      if (e) e.preventDefault();
      const clean = vin.trim().toUpperCase();
      setDecoded(null);
      resetFeedback();
      if (!clean) return;

      if (!isValidVin(clean)) {
        setError(tx[vinErrorKey(clean)]);
        return;
      }
      const result = decodeVin(clean);
      setDecoded(result);

      // Prefill Smart Search: make if guessed, model reset, year if decoded.
      if (result.makeGuess) {
        setMake(result.makeGuess);
        setModel("");
      }
      if (result.year) setYear(String(result.year));
    },
    [vin, tx, resetFeedback]
  );

  /* When the VIN decodes a make, jump the user into Smart Search prefilled. */
  const handleContinueFromVin = useCallback(() => {
    if (!decoded || !decoded.valid) return;
    setMode("smart");
    resetFeedback();
  }, [decoded, resetFeedback]);

  /* ----------------------- Smart-search handlers ------------------------ */

  const handleMakeChange = useCallback((e) => {
    setMake(e.target.value);
    setModel("");
    setYear("");
  }, []);

  const handleModelChange = useCallback((e) => {
    setModel(e.target.value);
    setYear("");
  }, []);

  const handleYearChange = useCallback((e) => {
    setYear(e.target.value);
  }, []);

  const smartReady = Boolean(make && model && year);

  const handleSmartConfirm = useCallback(() => {
    if (!smartReady) return;
    commitVehicle(make, model, Number(year));
  }, [smartReady, commitVehicle, make, model, year]);

  /* Selecting all three in the VIN-prefilled flow: reconcile year against the
     chosen make/model's available years (decoded year may not exist for it). */
  const effectiveYear = useMemo(() => {
    if (!year) return "";
    return years.includes(Number(year)) ? year : "";
  }, [year, years]);

  /* -------------------------------- UI ---------------------------------- */

  const selectClass = [
    "w-full appearance-none rounded-lg border bg-bg px-3 py-2.5 text-base md:text-sm text-textPrimary",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary/50",
    "border-border disabled:cursor-not-allowed disabled:opacity-50",
  ].join(" ");

  return (
    <div className="flex flex-col gap-4">
      {/* Mode segmented control */}
      <div
        role="tablist"
        aria-label={tx.vinLabel}
        className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-surface/60 p-1"
      >
        {[
          { key: "vin", label: tx.vinMode, Icon: ScanLine },
          { key: "smart", label: tx.smartMode, Icon: SlidersHorizontal },
        ].map(({ key, label, Icon }) => {
          const active = mode === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => switchMode(key)}
              className={[
                "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-600 transition-all duration-200",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                active
                  ? "bg-primary/15 text-primary shadow-glow ring-1 ring-primary/40"
                  : "text-textSecondary hover:bg-surfaceElevated hover:text-textPrimary",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>

      {/* ============================ VIN MODE ============================ */}
      {mode === "vin" && (
        <>
          <form onSubmit={handleDecode} className="flex flex-col gap-2">
            <label
              htmlFor={inputId}
              className="font-display text-xs font-700 uppercase tracking-wider text-textPrimary"
            >
              {tx.vinLabel}
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id={inputId}
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                dir="ltr"
                value={vin}
                onChange={handleVinChange}
                placeholder={tx.vinPlaceholder}
                maxLength={17}
                aria-invalid={!!error}
                aria-describedby={error ? errorId : undefined}
                className={[
                  "min-w-0 flex-1 rounded-lg border bg-bg px-3 py-2.5 font-mono text-base md:text-sm uppercase tracking-wide text-textPrimary placeholder:text-textMuted placeholder:normal-case",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring text-start",
                  error
                    ? "border-danger/60 ring-1 ring-danger/40"
                    : "border-border focus-visible:border-primary/50",
                ].join(" ")}
              />
              <button
                type="submit"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-display text-sm font-700 uppercase tracking-wide text-bg shadow-glow transition-all duration-200 hover:-translate-y-px hover:bg-primaryHover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
                {tx.decode}
              </button>
            </div>

            {!decoded && !error && (
              <p className="text-xs text-textMuted">{tx.hint}</p>
            )}
          </form>

          {/* Error state */}
          {error && (
            <div
              id={errorId}
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {/* Decoded VIN result */}
          {decoded && decoded.valid && (
            <div className="animate-fade-up rounded-xl border border-primary/30 bg-surface p-4 shadow-elevated">
              <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-accent">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                {tx.resultKicker}
              </p>

              <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <div className="min-w-0">
                    <dt className="text-[10px] uppercase tracking-wider text-textMuted">
                      {tx.modelYear}
                    </dt>
                    <dd
                      className="font-mono text-sm font-700 tabular-nums text-textPrimary"
                      dir="ltr"
                    >
                      {decoded.year ?? "—"}
                    </dd>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <div className="min-w-0">
                    <dt className="text-[10px] uppercase tracking-wider text-textMuted">
                      {tx.region}
                    </dt>
                    <dd className="text-sm font-600 text-textPrimary">
                      {lang === "ar"
                        ? REGION_AR[decoded.region] || decoded.region
                        : decoded.region}
                    </dd>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <div className="min-w-0">
                    <dt className="text-[10px] uppercase tracking-wider text-textMuted">
                      {tx.detectedMake}
                    </dt>
                    <dd className="truncate text-sm font-600 text-textPrimary">
                      {decoded.makeGuess || tx.unknownMake}
                    </dd>
                  </div>
                </div>
              </dl>

              <p className="mt-3 text-xs text-textMuted">{tx.prefillNote}</p>

              <button
                type="button"
                onClick={handleContinueFromVin}
                className="group mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-display text-sm font-700 uppercase tracking-wide text-bg shadow-glow transition-all duration-300 hover:-translate-y-px hover:bg-primaryHover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                {tx.smartMode}
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
                  aria-hidden="true"
                />
              </button>
            </div>
          )}
        </>
      )}

      {/* ========================= SMART SEARCH MODE ===================== */}
      {mode === "smart" && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Make */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={makeSelId}
                className="font-display text-[11px] font-700 uppercase tracking-wider text-textPrimary"
              >
                {tx.make}
              </label>
              <select
                id={makeSelId}
                value={make}
                onChange={handleMakeChange}
                className={selectClass}
              >
                <option value="">{tx.chooseMake}</option>
                {makes.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Model */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={modelSelId}
                className="font-display text-[11px] font-700 uppercase tracking-wider text-textPrimary"
              >
                {tx.model}
              </label>
              <select
                id={modelSelId}
                value={model}
                onChange={handleModelChange}
                disabled={!make}
                aria-describedby={!make ? `${modelSelId}-hint` : undefined}
                className={selectClass}
              >
                <option value="">
                  {make ? tx.chooseModel : tx.selectMakeFirst}
                </option>
                {models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Year */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={yearSelId}
                className="font-display text-[11px] font-700 uppercase tracking-wider text-textPrimary"
              >
                {tx.year}
              </label>
              <select
                id={yearSelId}
                value={effectiveYear}
                onChange={handleYearChange}
                disabled={!model}
                className={`${selectClass} font-mono tabular-nums`}
                dir="ltr"
              >
                <option value="">
                  {model ? tx.chooseYear : tx.selectModelFirst}
                </option>
                {years.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!smartReady && (
            <p className="text-xs text-textMuted">{tx.smartHint}</p>
          )}

          <button
            type="button"
            onClick={handleSmartConfirm}
            disabled={!smartReady || confirmed}
            className={[
              "group inline-flex items-center justify-center gap-2 self-start rounded-xl px-5 py-2.5 font-display text-sm font-700 uppercase tracking-wide transition-all duration-300",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
              confirmed
                ? "cursor-default bg-success/15 text-success ring-1 ring-success/40"
                : smartReady
                  ? "bg-primary text-bg shadow-glow hover:-translate-y-px hover:bg-primaryHover"
                  : "cursor-not-allowed bg-surfaceElevated text-textMuted",
            ].join(" ")}
          >
            {confirmed ? (
              <>
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                {tx.confirmed}
              </>
            ) : (
              <>
                {tx.confirm}
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
                  aria-hidden="true"
                />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
