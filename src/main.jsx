import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { markBootStart } from "./lib/bootHealth.js";
import "./index.css";

// Boot-health watchdog: after 2 consecutive boots that never became ready
// (the stale-auth-token freeze), drop the poisoned Supabase auth keys so the
// app self-heals instead of requiring a manual "clear site data".
markBootStart();

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
