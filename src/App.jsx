import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import { PreferencesProvider } from "./context/PreferencesProvider";
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
const DataArchive = lazy(() => import("./pages/archive/DataArchive"));
const Offers = lazy(() => import("./pages/marketing/Offers"));
const Categories = lazy(() => import("./pages/category/Categories"));
const DayClose = lazy(() => import("./pages/cash/DayClose"));
const CouponsLoyalty = lazy(() => import("./pages/loyalty/CouponsLoyalty"));
const Credit = lazy(() => import("./pages/credit/Credit"));
const ActivityLog = lazy(() => import("./pages/activity/ActivityLog"));
const Automation = lazy(() => import("./pages/automation/Automation"));
const CounterSettings = lazy(() => import("./pages/counter/CounterSettings"));
// V4
const Suppliers = lazy(() => import("./pages/supplier/Suppliers"));
const Purchases = lazy(() => import("./pages/purchase/Purchases"));
const PurchaseForm = lazy(() => import("./pages/purchase/PurchaseForm"));
const Recipes = lazy(() => import("./pages/recipe/Recipes"));
const ExpiryWastage = lazy(() => import("./pages/expiry/ExpiryWastage"));
const ComboOffers = lazy(() => import("./pages/combo/ComboOffers"));
const OnlineOrders = lazy(() => import("./pages/online/OnlineOrders"));
const OwnerDashboard = lazy(() => import("./pages/owner/OwnerDashboard"));
const StaffReport = lazy(() => import("./pages/staff/StaffReport"));
const Gstr1 = lazy(() => import("./pages/gstr1/Gstr1"));

const admin = (el) => <PrivateRoute admin>{el}</PrivateRoute>;
const guard = (perm, el) => <PrivateRoute perm={perm}>{el}</PrivateRoute>;

function App() {
  return (
    <PreferencesProvider>
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
                  <Route path="categories" element={guard("products", <Categories />)} />
                  <Route path="product-details" element={guard("products", <ProductDetails />)} />
                  <Route path="inventory" element={guard("inventory", <Inventory />)} />
                  <Route path="expenses" element={guard("expenses", <Expenses />)} />
                  <Route path="reports" element={guard("reports", <Reports />)} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="settings/invoice-design" element={guard("settings", <InvoiceDesigner />)} />
                  <Route path="backup" element={guard("backup", <Backup />)} />
                  <Route path="data-archive" element={guard("backup", <DataArchive />)} />
                  <Route path="offers" element={guard("marketing", <Offers />)} />
                  <Route path="day-close" element={guard("cash", <DayClose />)} />
                  <Route path="coupons" element={guard("loyalty", <CouponsLoyalty />)} />
                  <Route path="credit" element={guard("payments", <Credit />)} />
                  <Route path="activity" element={guard("activity", <ActivityLog />)} />
                  <Route path="automation" element={guard("settings", <Automation />)} />
                  <Route path="counter" element={<CounterSettings />} />
                  <Route path="owner" element={guard("dashboard", <OwnerDashboard />)} />
                  <Route path="suppliers" element={guard("purchases", <Suppliers />)} />
                  <Route path="purchases" element={guard("purchases", <Purchases />)} />
                  <Route path="purchases/new" element={guard("purchases.add", <PurchaseForm />)} />
                  <Route path="recipes" element={guard("products", <Recipes />)} />
                  <Route path="expiry" element={guard("inventory", <ExpiryWastage />)} />
                  <Route path="combo-offers" element={guard("loyalty", <ComboOffers />)} />
                  <Route path="online-orders" element={guard("invoices", <OnlineOrders />)} />
                  <Route path="staff-report" element={guard("reports", <StaffReport />)} />
                  <Route path="gstr1" element={guard("reports", <Gstr1 />)} />

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
    </PreferencesProvider>
  );
}

export default App;
