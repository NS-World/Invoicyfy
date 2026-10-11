import { Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

const PrivateRoute = ({ children }) => {
  const { auth } = useAuth();
  return auth.token ? children : <Navigate to="/login" />;
};

export default PrivateRoute;
