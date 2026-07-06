import { useEffect, useRef } from "react";

// -----------------------------------------------------------------------------
// Cabler Parts — Celebration. A dependency-free order-success moment: a canvas
// confetti burst + a synthesized "success" chime (Web Audio). Fires ONCE each
// time `active` transitions to true. Fully self-contained — no external assets
// or CDN, so it passes the strict CSP. Confetti is skipped under
// prefers-reduced-motion; the (short, soft) chime can be muted via `sound`.
// -----------------------------------------------------------------------------

const COLORS = ["#FF7A1A", "#FF8F3D", "#28E0C8", "#F2F5F8", "#FBBF24"];

// A gentle ascending major arpeggio (C5-E5-G5-C6) on a triangle wave with a
// soft swell — celebratory without being harsh. Silently no-ops if the browser
// blocks audio (e.g. no prior gesture after a redirect).
function playChime() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const resume = ctx.resume ? ctx.resume() : Promise.resolve();
    Promise.resolve(resume)
      .then(() => {
        const now = ctx.currentTime;
        const master = ctx.createGain();
        master.gain.value = 0.18;
        master.connect(ctx.destination);
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((f, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = "triangle";
          o.frequency.value = f;
          const t = now + i * 0.085;
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.6, t + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
          o.connect(g);
          g.connect(master);
          o.start(t);
          o.stop(t + 0.6);
        });
        setTimeout(() => ctx.close && ctx.close(), 1700);
      })
      .catch(() => {});
  } catch {
    /* audio unavailable — celebration is silent, no error surfaced */
  }
}

export default function Celebration({ active, sound = true }) {
  const canvasRef = useRef(null);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!active) {
      firedRef.current = false;
      return;
    }
    if (firedRef.current) return;
    firedRef.current = true;

    if (sound) playChime();

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    // Two angled fountains from the lower corners + a light rain from the top.
    const parts = [];
    const spawn = (n, ox, oy, spread, up) => {
      for (let i = 0; i < n; i++) {
        parts.push({
          x: ox,
          y: oy,
          vx: (Math.random() - 0.5) * spread,
          vy: up ? -(Math.random() * 9 + 8) : Math.random() * 2 + 1,
          size: Math.random() * 7 + 4,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.35,
          color: COLORS[(Math.random() * COLORS.length) | 0],
          shape: Math.random() < 0.5 ? "rect" : "circle",
        });
      }
    };
    spawn(55, 0, H, 9, true);
    spawn(55, W, H, 9, true);
    spawn(45, Math.random() * W, -10, 6, false);

    const G = 0.22;
    const DRAG = 0.99;
    let raf;
    let start;
    const DURATION = 2600;

    const frame = (ts) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      ctx.clearRect(0, 0, W, H);
      const fade = Math.max(0, 1 - Math.max(0, elapsed - 1400) / 1200);
      let alive = false;
      for (const p of parts) {
        p.vy += G;
        p.vx *= DRAG;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        if (p.y < H + 30) alive = true;
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      if (alive && elapsed < DURATION && fade > 0) {
        raf = requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, W, H);
      }
    };
    raf = requestAnimationFrame(frame);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [active, sound]);

  if (!active) return null;
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[120] h-full w-full"
    />
  );
}
