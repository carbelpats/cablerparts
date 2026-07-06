import { Check } from "lucide-react";

// -----------------------------------------------------------------------------
// Cabler Parts — CheckoutProgress. A performance-tachometer-inspired progress
// header that replaces the old semicircle needle gauge:
//   • a large digital readout (active step name + STEP x/N + live %),
//   • three "station" nodes (one per step) linked by a fill that advances,
//   • a slim redline meter bar with fine ticks and a glowing leading edge.
// Pure presentation; driven by `step` (0-based), `total`, localized `steps`
// labels + `icons`. reduced-motion safe (transitions collapse, glow stays).
// -----------------------------------------------------------------------------

export default function CheckoutProgress({
  step,
  total,
  steps,
  icons,
  labels,
  reduceMotion,
  complete,
}) {
  const pct = complete ? 100 : Math.round(((step + 1) / total) * 100);
  const dur = reduceMotion ? "0ms" : "600ms";
  // Leading-edge position on the rail: center of the active node.
  const railPct = complete ? 100 : (step / (total - 1)) * 100;

  // 24 redline ticks; the ones under the filled portion light up.
  const ticks = Array.from({ length: 24 }, (_, i) => i / 23);

  return (
    <div className="w-full">
      {/* Digital readout */}
      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase leading-none tracking-[0.22em] text-primary">
            <span
              className={
                "inline-block h-1.5 w-1.5 rounded-full bg-primary " +
                (reduceMotion ? "" : "motion-safe:animate-glow-pulse")
              }
            />
            {complete ? labels.ready : labels.boost}
            <span className="text-textMuted">
              · {labels.stepOf(Math.min(step + 1, total), total)}
            </span>
          </p>
          <h3 className="mt-1.5 truncate font-display text-2xl font-extrabold leading-none text-textPrimary">
            {complete ? labels.ready : steps[step]}
          </h3>
        </div>
        <div
          className="shrink-0 font-display text-3xl font-extrabold leading-none tabular-nums text-primary"
          style={{ textShadow: "0 0 18px rgb(var(--primary) / 0.45)" }}
        >
          {pct}
          <span className="font-mono text-lg text-textMuted">%</span>
        </div>
      </div>

      {/* Station nodes + connectors */}
      <ol className="flex items-center">
        {steps.map((label, i) => {
          const Icon = icons[i];
          const done = complete || i < step;
          const active = !complete && i === step;
          return (
            <li
              key={label}
              className={
                "flex items-center " + (i < steps.length - 1 ? "flex-1" : "")
              }
            >
              <span className="relative flex flex-col items-center">
                <span
                  className={
                    "grid h-11 w-11 place-items-center rounded-full border-2 transition-all ease-out " +
                    (done
                      ? "border-primary bg-primary text-white shadow-glow"
                      : active
                      ? "border-primary bg-primary/10 text-primary shadow-glow " +
                        (reduceMotion ? "" : "scale-110")
                      : "border-border bg-surface text-textMuted")
                  }
                  style={{ transitionDuration: dur }}
                >
                  {done ? (
                    <Check className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
                  ) : (
                    <Icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                  )}
                  {active && !reduceMotion && (
                    <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-primary/40 motion-safe:animate-ping" />
                  )}
                </span>
                <span
                  className={
                    "absolute top-12 whitespace-nowrap font-mono text-[10px] font-semibold uppercase tracking-wide transition-colors " +
                    (active
                      ? "text-primary"
                      : done
                      ? "text-textSecondary"
                      : "text-textMuted")
                  }
                >
                  {label}
                </span>
              </span>
              {i < steps.length - 1 && (
                <span className="mx-1.5 h-1 flex-1 overflow-hidden rounded-full bg-border">
                  <span
                    className="block h-full rounded-full bg-gradient-to-r from-primary to-primaryHover transition-all ease-out"
                    style={{
                      width: done ? "100%" : "0%",
                      transitionDuration: dur,
                    }}
                  />
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {/* Redline meter bar */}
      <div className="mt-10">
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-surfaceElevated ring-1 ring-inset ring-border">
          {/* fill */}
          <div
            className="absolute inset-y-0 start-0 rounded-full bg-gradient-to-r from-primary via-primary to-primaryHover transition-all ease-out"
            style={{
              width: `${pct}%`,
              transitionDuration: dur,
              boxShadow: "0 0 12px rgb(var(--primary) / 0.55)",
            }}
          />
          {/* ticks */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-1">
            {ticks.map((t, i) => (
              <span
                key={i}
                className="h-1.5 w-px transition-colors"
                style={{
                  transitionDuration: dur,
                  backgroundColor:
                    t <= railPct / 100
                      ? "rgb(var(--bg) / 0.55)"
                      : "rgb(var(--text-muted) / 0.35)",
                }}
              />
            ))}
          </div>
          {/* glowing leading edge */}
          {!complete && (
            <span
              className="absolute top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white transition-all ease-out rtl:translate-x-1/2"
              style={{
                insetInlineStart: `${pct}%`,
                transitionDuration: dur,
                boxShadow: "0 0 10px 2px rgb(var(--primary))",
              }}
              aria-hidden="true"
            />
          )}
        </div>
      </div>
    </div>
  );
}
