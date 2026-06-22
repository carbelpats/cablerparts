/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        surfaceElevated: "rgb(var(--surface-elevated) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        textPrimary: "rgb(var(--text-primary) / <alpha-value>)",
        textSecondary: "rgb(var(--text-secondary) / <alpha-value>)",
        textMuted: "rgb(var(--text-muted) / <alpha-value>)",
        primary: "rgb(var(--primary) / <alpha-value>)",
        primaryHover: "rgb(var(--primary-hover) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        accentHover: "rgb(var(--accent-hover) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
        warning: "rgb(var(--warning) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
        ring: "rgb(var(--ring) / <alpha-value>)",
      },
      fontWeight: {
        500: "500",
        600: "600",
        700: "700",
        800: "800",
      },
      fontFamily: {
        display: [
          "Saira",
          "ui-sans-serif",
          "system-ui",
          "Segoe UI",
          "Arial",
          "sans-serif",
        ],
        sans: [
          "IBM Plex Sans",
          "IBM Plex Sans Arabic",
          "ui-sans-serif",
          "system-ui",
          "Segoe UI",
          "Tahoma",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        glow: "0 0 0 1px rgb(var(--primary) / 0.30), 0 0 24px -4px rgb(var(--primary) / 0.55)",
        "glow-accent":
          "0 0 0 1px rgb(var(--accent) / 0.30), 0 0 24px -4px rgb(var(--accent) / 0.55)",
        elevated:
          "0 1px 0 0 rgb(255 255 255 / 0.03) inset, 0 8px 24px -8px rgb(0 0 0 / 0.55)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "glow-pulse": {
          "0%, 100%": {
            boxShadow: "0 0 0 0 rgb(var(--primary) / 0.0)",
            opacity: "1",
          },
          "50%": {
            boxShadow: "0 0 22px -2px rgb(var(--primary) / 0.55)",
            opacity: "0.92",
          },
        },
        "count-up": {
          "0%": { transform: "translateY(0.5em)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        ripple: {
          "0%": { transform: "scale(0.6)", opacity: "0.6" },
          "100%": { transform: "scale(2.4)", opacity: "0" },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "fade-up": {
          "0%": { transform: "translateY(12px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "progress-fill": {
          "0%": { width: "0%" },
          "100%": { width: "var(--progress, 100%)" },
        },
        "garage-open": {
          "0%": { transform: "scale(0.96) translateY(8px)", opacity: "0" },
          "60%": { transform: "scale(1.01) translateY(0)", opacity: "1" },
          "100%": { transform: "scale(1) translateY(0)", opacity: "1" },
        },
        "confetti-pop": {
          "0%": { transform: "scale(0) rotate(0deg)", opacity: "0" },
          "40%": { transform: "scale(1.15) rotate(8deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(0deg)", opacity: "1" },
        },
      },
      animation: {
        shimmer: "shimmer 2.2s linear infinite",
        float: "float 5s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2.4s ease-in-out infinite",
        "count-up": "count-up 0.42s cubic-bezier(0.22,1,0.36,1) both",
        marquee: "marquee 26s linear infinite",
        ripple: "ripple 0.6s ease-out forwards",
        "slide-in-right":
          "slide-in-right 0.28s cubic-bezier(0.22,1,0.36,1) both",
        "fade-up": "fade-up 0.4s cubic-bezier(0.22,1,0.36,1) both",
        "progress-fill": "progress-fill 0.6s cubic-bezier(0.4,0,0.2,1) both",
        "garage-open": "garage-open 0.42s cubic-bezier(0.22,1,0.36,1) both",
        "confetti-pop": "confetti-pop 0.35s cubic-bezier(0.22,1,0.36,1) both",
      },
    },
  },
  plugins: [],
};
