import { Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

const START_PAGES = [
  ["dashboard", "view", "/dashboard"],
  ["invoices", "add", "/invoices/new"],
  ["invoices", "view", "/invoices"],
  ["orders", "view", "/orders"],
  ["customers", "view", "/customers"],
  ["products", "view", "/products"],
  ["expenses", "view", "/expenses"],
  ["reports", "view", "/reports"],
];

/** Sends each user to the first page their role can open. */
export default function HomeRedirect() {
  const { can } = useAuth();
  const start = START_PAGES.find(([m, a]) => can(m, a));
  return <Navigate to={start ? start[2] : "/settings"} replace />;
}
