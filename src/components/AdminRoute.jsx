// -----------------------------------------------------------------------------
// AL-MEYAR — AdminRoute
// Role-protected gate for the /admin dashboard. Same loading guard as
// ProtectedRoute (render a spinner while the session restores, never redirect
// prematurely), then:
//   - not signed in  -> /login (with state.from so AuthPage can bounce back)
//   - signed in but not admin -> "/" (storefront home)
//   - admin -> render children
// -----------------------------------------------------------------------------

import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

// calm, on-brand spinner while the session resolves
function AuthGuardSpinner() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <Loader2
        className="h-6 w-6 animate-spin text-primary motion-reduce:animate-none"
        aria-label="Loading"
        role="status"
      />
    </div>
  );
}

export default function AdminRoute({ children }) {
  const { isAuthed, isAdmin, status } = useAuth();
  const location = useLocation();

  // do NOT redirect until the initial session restore has resolved
  if (status === "loading") {
    return <AuthGuardSpinner />;
  }

  if (!isAuthed) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}
