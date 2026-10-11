import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import { CssBaseline, ThemeProvider } from "@mui/material";
import theme from "./theme";
import { AuthProvider } from "./context/AuthProvider";
import { NotifyProvider } from "./context/NotifyProvider";
import PrivateRoute from "./routes/PrivateRoute";
import HomeRedirect from "./routes/HomeRedirect";
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
const InvoiceDesigner = lazy(() => import("./pages/settings/InvoiceDesigner"));
const Backup = lazy(() => import("./pages/backup/Backup"));
const Offers = lazy(() => import("./pages/marketing/Offers"));

const admin = (el) => <PrivateRoute admin>{el}</PrivateRoute>;
const guard = (perm, el) => <PrivateRoute perm={perm}>{el}</PrivateRoute>;

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
                  <Route index element={<HomeRedirect />} />
                  <Route path="dashboard" element={guard("dashboard", <DashboardPage />)} />

                  <Route path="orders" element={guard("orders", <Orders />)} />
                  <Route path="orders/:id" element={guard("orders", <OrderDetails />)} />
                  <Route path="order" element={guard("orders.add", <OrderForm />)} />
                  <Route path="order-details" element={guard("orders", <OrderDetails />)} />

                  <Route path="invoices" element={guard("invoices", <Invoices />)} />
                  <Route path="invoices/new" element={guard("invoices.add", <InvoiceForm />)} />
                  <Route path="invoices/:id" element={guard("invoices", <InvoiceView />)} />
                  <Route path="payments" element={guard("payments", <Payments />)} />

                  <Route path="customers" element={guard("customers", <Customers />)} />
                  <Route path="customer" element={guard("customers", <CustomerForm />)} />
                  <Route path="products" element={guard("products", <Products />)} />
                  <Route path="product" element={guard("products", <ProductForm />)} />
                  <Route path="product-details" element={guard("products", <ProductDetails />)} />
                  <Route path="inventory" element={guard("inventory", <Inventory />)} />
                  <Route path="expenses" element={guard("expenses", <Expenses />)} />
                  <Route path="reports" element={guard("reports", <Reports />)} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="settings/invoice-design" element={guard("settings", <InvoiceDesigner />)} />
                  <Route path="backup" element={guard("backup", <Backup />)} />
                  <Route path="offers" element={guard("marketing", <Offers />)} />

                  <Route path="users" element={guard("users", <Users />)} />
                  <Route path="user" element={guard("users", <UserForm />)} />
                  <Route path="roles" element={guard("users", <Roles />)} />
                  <Route path="role" element={guard("users", <RoleForm />)} />
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
