import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import NoAccess from "../pages/NoAccess";

/** perm = "module" or "module.action" the page needs. */
const PrivateRoute = ({ children, admin = false, perm }) => {
  const { auth, isAdmin, can } = useAuth();
  const location = useLocation();
  if (!auth.token) return <Navigate to="/login" state={{ from: location }} replace />;
  if (admin && auth.user && !isAdmin) return <Navigate to="/dashboard" replace />;
  if (perm && auth.user) {
    const [module, action = "view"] = perm.split(".");
    if (!can(module, action)) return <NoAccess />;
  }
  return children;
};

export default PrivateRoute;
