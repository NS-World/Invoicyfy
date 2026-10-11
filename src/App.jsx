import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import { CssBaseline, ThemeProvider } from "@mui/material";
import theme from "./theme";
import { AuthProvider } from "./context/AuthProvider";
import { NotifyProvider } from "./context/NotifyProvider";
import PrivateRoute from "./routes/PrivateRoute";
import Loader from "./components/common/Loader";
import Login from "./pages/login/Login";
import Home from "./pages/home/Home";

// Pages are code-split so the first load stays small on mobile networks.
const DashboardPage = lazy(() => import("./pages/dashboard/DashboardPage"));
const Customers = lazy(() => import("./pages/customer/Customers"));
const CustomerForm = lazy(() => import("./pages/customer/CustomerForm"));
const Products = lazy(() => import("./pages/product/Products"));
const ProductForm = lazy(() => import("./pages/product/ProductForm"));
const ProductDetails = lazy(() => import("./pages/product/ProductDetails"));
const Orders = lazy(() => import("./pages/order/Orders"));
const OrderForm = lazy(() => import("./pages/order/OrderForm"));
const OrderDetails = lazy(() => import("./pages/order/OrderDetails"));
const Invoices = lazy(() => import("./pages/invoice/Invoices"));
const InvoiceForm = lazy(() => import("./pages/invoice/InvoiceForm"));
const InvoiceView = lazy(() => import("./pages/invoice/InvoiceView"));
const Payments = lazy(() => import("./pages/payment/Payments"));
const Expenses = lazy(() => import("./pages/expense/Expenses"));
const Inventory = lazy(() => import("./pages/inventory/Inventory"));
const Reports = lazy(() => import("./pages/report/Reports"));
const Settings = lazy(() => import("./pages/settings/Settings"));
const Users = lazy(() => import("./pages/user/Users"));
const UserForm = lazy(() => import("./pages/user/UserForm"));
const Roles = lazy(() => import("./pages/role/Roles"));
const RoleForm = lazy(() => import("./pages/role/RoleForm"));
const Stores = lazy(() => import("./pages/store/Stores"));
const StoreForm = lazy(() => import("./pages/store/StoreForm"));
const NotFound = lazy(() => import("./pages/NotFound"));

const admin = (el) => <PrivateRoute admin>{el}</PrivateRoute>;

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <NotifyProvider>
        <AuthProvider>
          <Router>
            <Suspense fallback={<Loader minHeight="60vh" />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                  path="/"
                  element={
                    <PrivateRoute>
                      <Home />
                    </PrivateRoute>
                  }
                >
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<DashboardPage />} />

                  <Route path="orders" element={<Orders />} />
                  <Route path="orders/:id" element={<OrderDetails />} />
                  <Route path="order" element={<OrderForm />} />
                  <Route path="order-details" element={<OrderDetails />} />

                  <Route path="invoices" element={<Invoices />} />
                  <Route path="invoices/new" element={<InvoiceForm />} />
                  <Route path="invoices/:id" element={<InvoiceView />} />
                  <Route path="payments" element={<Payments />} />

                  <Route path="customers" element={<Customers />} />
                  <Route path="customer" element={<CustomerForm />} />
                  <Route path="products" element={<Products />} />
                  <Route path="product" element={<ProductForm />} />
                  <Route path="product-details" element={<ProductDetails />} />
                  <Route path="inventory" element={<Inventory />} />
                  <Route path="expenses" element={<Expenses />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="settings" element={<Settings />} />

                  <Route path="users" element={admin(<Users />)} />
                  <Route path="user" element={admin(<UserForm />)} />
                  <Route path="roles" element={admin(<Roles />)} />
                  <Route path="role" element={admin(<RoleForm />)} />
                  <Route path="stores" element={admin(<Stores />)} />
                  <Route path="store" element={admin(<StoreForm />)} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </Suspense>
          </Router>
        </AuthProvider>
      </NotifyProvider>
    </ThemeProvider>
  );
}

export default App;
