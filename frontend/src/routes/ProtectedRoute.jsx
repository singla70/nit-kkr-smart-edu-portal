import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Guards a route by role. Redirects to /login if not authenticated,
 * or to the user's own dashboard if they're logged in as a different role.
 * Carries a message + the page they were headed to, so Login can show
 * "login required" instead of silently bouncing the person.
 */
export default function ProtectedRoute({ role, children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname, message: "Please log in to access this feature." }}
      />
    );
  }
  if (role && user.role !== role) return <Navigate to={`/${user.role}`} replace />;

  return children;
}
