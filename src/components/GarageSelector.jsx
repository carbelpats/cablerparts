import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import {
  Car,
  ChevronRight,
  CheckCircle2,
  Wrench,
  Sparkles,
  RotateCcw,
  ArrowRight,
  KeyRound,
  SlidersHorizontal,
  ScanLine,
} from "lucide-react";
import { getMakes, getModels, getYears } from "../lib/data.js";
import { useGarage } from "../context/GarageContext.jsx";
import { useLang } from "../context/LanguageContext.jsx";
import { useCatalog } from "../context/CatalogContext.jsx";
import { useProducts } from "../context/ProductsContext.jsx";
import VinDecoder from "./VinDecoder.jsx";

/* -------------------------------------------------------------------------- */
/* Localized copy (component-local STRINGS per convention)                      */
/* -------------------------------------------------------------------------- */

const STRINGS = {
  en: {
    // owned state
    verifiedKicker: "Your Garage — verified",
    yourVehicle: (y, mk, md) => `Your ${y} ${mk} ${md}`,
    compatibleFound: (n) => [`${n}`, "compatible parts found for your build"],
    shopCompatible: "Shop compatible parts",
    changeVehicle: "Change vehicle",
    // selector state
    buildKicker: "Build your garage",
    findTitlePre: "Find parts that fit",
    findTitleEmphasis: "your",
    findTitlePost: "vehicle",
    findSub:
      "Set your Make, Model and Year once. Every part page is then verified against your ride — guaranteed-fit, no guesswork.",
    make: "Make",
    model: "Model",
    year: "Year",
    chooseBrand: "Choose your brand",
    locked: "Locked",
    nModels: (n) => `${n} models`,
    nYears: (n) => `${n} years`,
    selectMakeFirst: "Select a make first",
    selectModelFirst: "Select a model first",
    step1: "Step 1 of 3",
    step2: "Step 2 of 3 — pick a model",
    step3: "1 step from guaranteed-fit pricing",
    // input-method toggle
    methodManual: "Manual",
    methodVin: "VIN / Smart Search",
    methodLabel: "How would you like to set your vehicle?",
  },
  ar: {
    // owned state
    verifiedKicker: "مرآبك — موثّق",
    yourVehicle: (y, mk, md) => `سيارتك ${mk} ${md} ${y}`,
    compatibleFound: (n) => [`${n}`, "قطعة متوافقة وُجدت لسيارتك"],
    shopCompatible: "تسوّق القطع المتوافقة",
    changeVehicle: "تغيير السيارة",
    // selector state
    buildKicker: "جهّز مرآبك",
    findTitlePre: "اعثر على القطع المناسبة",
    findTitleEmphasis: "لسيارتك",
    findTitlePost: "",
    findSub:
      "حدّد الماركة والطراز والسنة مرة واحدة. عندها يتم التحقق من كل صفحة قطعة مقابل سيارتك — توافق مضمون، بلا تخمين.",
    make: "الماركة",
    model: "الطراز",
    year: "السنة",
    chooseBrand: "اختر علامتك التجارية",
    locked: "مقفل",
    nModels: (n) => `${n} طرازات`,
    nYears: (n) => `${n} سنوات`,
    selectMakeFirst: "اختر الماركة أولاً",
    selectModelFirst: "اختر الطراز أولاً",
    step1: "الخطوة 1 من 3",
    step2: "الخطوة 2 من 3 — اختر طرازاً",
    step3: "خطوة واحدة من تسعير التوافق المضمون",
    // input-method toggle
    methodManual: "يدوي",
    methodVin: "رقم الهيكل / البحث الذكي",
    methodLabel: "كيف تريد تحديد سيارتك؟",
  },
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

const CONFETTI = [
  { x: -120, y: -40, c: "primary", d: 0 },
  { x: -70, y: -110, c: "accent", d: 40 },
  { x: -20, y: -60, c: "primary", d: 80 },
  { x: 30, y: -120, c: "accent", d: 30 },
  { x: 90, y: -50, c: "primary", d: 60 },
  { x: 130, y: -90, c: "accent", d: 100 },
  { x: -150, y: 30, c: "accent", d: 120 },
  { x: 150, y: 40, c: "primary", d: 70 },
];

function smoothScrollTo(id) {
  if (typeof document === "undefined") return;
  const el = document.getElementById(id);
  if (!el) return;
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({
    behavior: reduce ? "auto" : "smooth",
    block: "start",
  });
}

/* -------------------------------------------------------------------------- */
/* Step button — a segmented "ignition panel" pill list                        */
/* -------------------------------------------------------------------------- */

function StepColumn({
  index,
  label,
  hint,
  options,
  value,
  onSelect,
  disabled,
  lockedHint,
  mono = false,
}) {
  return (
    <div
      className={[
        "flex flex-col rounded-xl border bg-surface/60 p-3 transition-all duration-300",
        disabled
          ? "border-border/60 opacity-50"
          : "border-border animate-fade-up shadow-elevated",
      ].join(" ")}
      aria-disabled={disabled}
    >
      <div className="mb-3 flex items-center gap-2 px-1">
        <span
          className={[
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-[11px] font-bold tabular-nums transition-colors duration-300",
            value
              ? "bg-primary/15 text-primary ring-1 ring-primary/40"
              : disabled
                ? "bg-surfaceElevated text-textMuted"
                : "bg-surfaceElevated text-textSecondary ring-1 ring-border",
          ].join(" ")}
        >
          {index}
        </span>
        <div className="flex flex-col leading-tight">
          <span className="font-display text-xs font-700 uppercase tracking-wider text-textPrimary">
            {label}
          </span>
          <span className="text-[10px] text-textMuted">{hint}</span>
        </div>
        {value && (
          <CheckCircle2
            className="ms-auto h-4 w-4 text-accent"
            aria-hidden="true"
          />
        )}
      </div>

      <div
        role="listbox"
        aria-label={label}
        aria-disabled={disabled}
        className="flex max-h-56 flex-col gap-1 overflow-y-auto pe-1"
      >
        {disabled ? (
          <p className="px-2 py-6 text-center text-xs text-textMuted">
            {lockedHint}
          </p>
        ) : (
          options.map((opt, i) => {
            const active = value === opt;
            return (
              <button
                key={String(opt)}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => onSelect(opt)}
                style={{ animationDelay: `${Math.min(i, 8) * 32}ms` }}
                className={[
                  "group flex animate-fade-up items-center gap-2 rounded-lg px-3 py-2 text-start text-sm transition-all duration-200",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                  mono ? "font-mono tabular-nums" : "font-sans",
                  active
                    ? "bg-primary/15 font-600 text-primary shadow-glow ring-1 ring-primary/40"
                    : "text-textSecondary hover:-translate-y-px hover:bg-surfaceElevated hover:text-textPrimary",
                ].join(" ")}
              >
                <span className="truncate">{opt}</span>
                <ChevronRight
                  className={[
                    "ms-auto h-3.5 w-3.5 shrink-0 transition-all duration-200 rtl:-scale-x-100",
                    active
                      ? "translate-x-0 text-primary opacity-100"
                      : "-translate-x-1 text-textMuted opacity-0 group-hover:translate-x-0 group-hover:opacity-100 rtl:translate-x-1 rtl:group-hover:translate-x-0",
                  ].join(" ")}
                  aria-hidden="true"
                />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main component                                                              */
/* -------------------------------------------------------------------------- */

export default function GarageSelector() {
  const { vehicle, setVehicle, clearGarage, hasVehicle } = useGarage();
  const { lang } = useLang();
  const { setFitsOnly, focusCatalog } = useCatalog();
  const { products } = useProducts();
  const tx = STRINGS[lang] || STRINGS.en;

  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [celebrating, setCelebrating] = useState(false);
  const [inputMethod, setInputMethod] = useState("manual"); // "manual" | "vin"
  const timerRef = useRef(null);

  const makes = useMemo(() => getMakes(), []);
  const models = useMemo(() => getModels(make), [make]);
  const years = useMemo(() => getYears(make, model), [make, model]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const handleMake = useCallback((m) => {
    setMake(m);
    setModel("");
  }, []);

  const handleModel = useCallback((m) => {
    setModel(m);
  }, []);

  const handleYear = useCallback(
    (year) => {
      setVehicle({ make, model, year });
      setCelebrating(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCelebrating(false), 1400);
    },
    [make, model, setVehicle]
  );

  const handleReset = useCallback(() => {
    clearGarage();
    setMake("");
    setModel("");
    setCelebrating(false);
  }, [clearGarage]);

  /* OWNED state: drive the catalog (fits-only + focus) then smooth-scroll. */
  const handleShopCompatible = useCallback(() => {
    setFitsOnly(true);
    focusCatalog();
    smoothScrollTo("catalog");
  }, [setFitsOnly, focusCatalog]);

  /* compatible-parts count for the owned vehicle */
  const compatibleCount = useMemo(() => {
    if (!vehicle) return 0;
    return (products || []).filter((p) =>
      (p.fitment || []).includes(vehicle.make)
    ).length;
  }, [products, vehicle]);

  /* ----------------------------- OWNED STATE ----------------------------- */
  if (hasVehicle && vehicle) {
    const [countStr, countLabel] = tx.compatibleFound(compatibleCount);
    return (
      <section
        id="garage"
        aria-labelledby="garage-heading"
        className="mx-auto w-full max-w-5xl scroll-mt-24 px-4 py-12 sm:py-16"
      >
        <div className="relative animate-garage-open overflow-hidden rounded-2xl border border-primary/30 bg-surface p-6 shadow-glow sm:p-8">
          {/* backlit gauge glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -end-24 -top-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-28 -start-20 h-56 w-56 rounded-full bg-accent/10 blur-3xl"
          />

          {/* celebratory confetti burst */}
          {celebrating && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 z-10 motion-reduce:hidden"
            >
              {CONFETTI.map((p, i) => (
                <span
                  key={i}
                  className="absolute block h-2 w-2 animate-confetti-pop rounded-[2px]"
                  style={{
                    backgroundColor:
                      p.c === "primary"
                        ? "rgb(var(--primary))"
                        : "rgb(var(--accent))",
                    transform: `translate(${p.x}px, ${p.y}px)`,
                    animationDelay: `${p.d}ms`,
                  }}
                />
              ))}
            </div>
          )}

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            {/* Identity */}
            <div className="flex items-center gap-4">
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/40">
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-xl bg-primary/20 blur-md"
                />
                <Car
                  className="relative h-8 w-8 text-primary"
                  aria-hidden="true"
                />
              </div>
              <div>
                <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-accent">
                  <KeyRound className="h-3 w-3" aria-hidden="true" />
                  {tx.verifiedKicker}
                </p>
                <h2
                  id="garage-heading"
                  className="mt-1 font-display text-2xl font-800 leading-none text-textPrimary sm:text-3xl"
                >
                  {tx.yourVehicle(vehicle.year, vehicle.make, vehicle.model)}
                </h2>
                <p className="mt-1.5 font-mono text-xs tabular-nums text-textSecondary">
                  <span className="text-primary">{countStr}</span>{" "}
                  {countLabel}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2.5 sm:items-end">
              <button
                type="button"
                onClick={handleShopCompatible}
                className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary px-5 py-3 font-display text-sm font-700 uppercase tracking-wide text-bg shadow-glow transition-all duration-300 hover:-translate-y-px hover:bg-primaryHover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                <Wrench className="h-4 w-4" aria-hidden="true" />
                {tx.shopCompatible}
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
                  aria-hidden="true"
                />
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-500 text-textMuted transition-colors duration-200 hover:text-textPrimary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                <RotateCcw className="h-3.5 w-3.5 rtl:-scale-x-100" aria-hidden="true" />
                {tx.changeVehicle}
              </button>
            </div>
          </div>

          {/* fitment-confirm ripple ring */}
          {celebrating && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute start-8 top-1/2 z-0 h-16 w-16 -translate-y-1/2 animate-ripple rounded-full ring-2 ring-accent/60 motion-reduce:hidden"
            />
          )}
        </div>
      </section>
    );
  }

  /* ---------------------------- SELECTOR STATE --------------------------- */
  return (
    <section
      id="garage"
      aria-labelledby="garage-heading"
      className="mx-auto w-full max-w-5xl scroll-mt-24 px-4 py-12 sm:py-16"
    >
      <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-elevated sm:p-8">
        {/* faint speed-hatch / gauge glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -end-20 -top-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl"
        />

        {/* Header */}
        <div className="relative mb-6 flex flex-col gap-1 sm:mb-8">
          <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-primary">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            {tx.buildKicker}
          </p>
          <h2
            id="garage-heading"
            className="font-display text-2xl font-800 leading-tight text-textPrimary sm:text-3xl"
          >
            {tx.findTitlePre}{" "}
            <span className="text-primary">{tx.findTitleEmphasis}</span>
            {tx.findTitlePost ? <> {tx.findTitlePost}</> : null}
          </h2>
          <p className="max-w-xl text-sm text-textSecondary">{tx.findSub}</p>
        </div>

        {/* Input-method segmented toggle: Manual cascade vs VIN / Plate decode */}
        <div
          role="tablist"
          aria-label={tx.methodLabel}
          className="relative mb-5 grid max-w-xs grid-cols-2 gap-1 rounded-xl border border-border bg-surface/60 p-1"
        >
          {[
            { key: "manual", label: tx.methodManual, Icon: SlidersHorizontal },
            { key: "vin", label: tx.methodVin, Icon: ScanLine },
          ].map(({ key, label, Icon }) => {
            const active = inputMethod === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setInputMethod(key)}
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

        {/* VIN / Plate decoder */}
        {inputMethod === "vin" && (
          <div className="relative">
            <VinDecoder />
          </div>
        )}

        {/* Cascading stepper (manual) */}
        {inputMethod === "manual" && (
        <>
        <div className="relative grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StepColumn
            index={1}
            label={tx.make}
            hint={tx.chooseBrand}
            options={makes}
            value={make}
            onSelect={handleMake}
            disabled={false}
          />
          <StepColumn
            index={2}
            label={tx.model}
            hint={make ? tx.nModels(models.length) : tx.locked}
            options={models}
            value={model}
            onSelect={handleModel}
            disabled={!make}
            lockedHint={tx.selectMakeFirst}
          />
          <StepColumn
            index={3}
            label={tx.year}
            hint={model ? tx.nYears(years.length) : tx.locked}
            options={years}
            value=""
            onSelect={handleYear}
            disabled={!model}
            lockedHint={tx.selectModelFirst}
            mono
          />
        </div>

        {/* progress hint */}
        <div className="relative mt-6 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surfaceElevated ring-1 ring-border">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{
                width: `${((make ? 1 : 0) + (model ? 1 : 0)) * 50}%`,
              }}
            />
          </div>
          <span className="font-mono text-[11px] tabular-nums text-textMuted">
            {!make ? tx.step1 : !model ? tx.step2 : tx.step3}
          </span>
        </div>
        </>
        )}
      </div>
    </section>
  );
}
