import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";

const PrivateRoute = ({ children, admin = false }) => {
  const { auth, isAdmin } = useAuth();
  const location = useLocation();
  if (!auth.token) return <Navigate to="/login" state={{ from: location }} replace />;
  if (admin && auth.user && !isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
};

export default PrivateRoute;
