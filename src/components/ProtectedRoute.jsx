// -----------------------------------------------------------------------------
// AL-MEYAR — ProtectedRoute
// Gates a subtree behind the auth session. While the session is still being
// restored (status === "loading") we render a centered spinner instead of
// redirecting, so a refresh on a protected page does not bounce the user to
// /login before getCurrentUser() has resolved. Once resolved, signed-out users
// are redirected to /login with the attempted location stashed in router
// state.from so AuthPage can bounce them back after a successful sign-in.
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

export default function ProtectedRoute({ children }) {
  const { isAuthed, status } = useAuth();
  const location = useLocation();

  // do NOT redirect until the initial session restore has resolved
  if (status === "loading") {
    return <AuthGuardSpinner />;
  }

  if (!isAuthed) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
