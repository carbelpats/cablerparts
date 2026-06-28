import { Component } from "react";

// -----------------------------------------------------------------------------
// ErrorBoundary — top-level crash guard.
//
// Without this, a single uncaught render error (e.g. malformed CMS data, a failed
// lazy-chunk import) unmounts the whole React tree and leaves a blank white page.
// The fallback is intentionally dependency-free (no app context / i18n / Tailwind
// — any of which could be what failed) with inline styles + reload/home actions.
// -----------------------------------------------------------------------------
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("Storefront crash caught by ErrorBoundary:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div
        dir="rtl"
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "2rem",
          background: "#0B0E11",
          color: "#E7ECF2",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>
          صار خطأ غير متوقّع
        </h1>
        <p style={{ color: "#9AA7B4", margin: 0, maxWidth: "28rem" }}>
          حدّث الصفحة للمتابعة. لو تكرّر، جرّب بعد قليل.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              cursor: "pointer",
              borderRadius: "0.75rem",
              border: "none",
              background: "#FF7A1A",
              color: "#fff",
              padding: "0.6rem 1.2rem",
              fontWeight: 700,
            }}
          >
            تحديث الصفحة
          </button>
          <a
            href="/"
            style={{
              borderRadius: "0.75rem",
              border: "1px solid #2A323C",
              color: "#E7ECF2",
              padding: "0.6rem 1.2rem",
              textDecoration: "none",
            }}
          >
            الصفحة الرئيسية
          </a>
        </div>
      </div>
    );
  }
}
