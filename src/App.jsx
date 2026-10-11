import './App.css'
import { AuthProvider } from './context/AuthProvider'
import Login from './pages/login/Login'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'; 
import PrivateRoute from './routes/PrivateRoute'
import Home from './pages/home/Home';

import DashboardPage from './pages/dashboard/DashboardPage';
import Customers from './pages/customer/Customers';
import Products from './pages/product/Products';
import ProductForm from './pages/product/ProductForm';
import ProductDetails from './pages/product/ProductDetails';
import Orders from './pages/order/Orders';
import OrderForm from './pages/order/OrderForm';
import OrderDetails from './pages/order/OrderDetails';
import Invoices from './pages/invoice/Invoices';
import Payments from './pages/payment/Payments';
import Users from './pages/user/Users';
import UserForm from './pages/user/UserForm';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import CustomerForm from './pages/customer/CustomerForm';
import Roles from './pages/role/Roles';
import RoleForm from './pages/role/RoleForm';
import Stores from './pages/store/Stores';
import StoreForm from './pages/store/StoreForm';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />
          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Home />
              </PrivateRoute>
            }
          >
            {/* Redirect / to /dashboard */}
            <Route index element={<Navigate to="/dashboard" replace />} />

            {/* Nested Routes */}
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="customers" element={<Customers />} />
            <Route path="products" element={<Products />} />
            <Route path="product" element={<ProductForm />} />
            <Route path="product-details" element={<ProductDetails />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="orders" element={<Orders />} />
            <Route path="order" element={<OrderForm />} />
            <Route path="order-details" element={<OrderDetails />} />
            <Route path="payments" element={<Payments />} />
            <Route path="users" element={<Users />} />
            <Route path="user" element={<UserForm />} />
            <Route path="slidebar" element={<Sidebar />} />
            <Route path="header" element={<Header />} />
            <Route path="customer" element={<CustomerForm />}></Route>
            <Route path="role" element={<RoleForm />}></Route>
            <Route path="roles" element={<Roles />}></Route>
            <Route path="stores" element={<Stores />}></Route>
            <Route path="store" element={<StoreForm />}></Route>
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
