import { Routes, Route, Outlet } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import RequireAuth from './auth/RequireAuth.jsx';
import RequireAdmin from './auth/RequireAdmin.jsx';
import Catalog from './pages/Catalog.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import SupplierPage from './pages/SupplierPage.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import Orders from './pages/Orders.jsx';
import OrderDetail from './pages/OrderDetail.jsx';
import NotFound from './pages/NotFound.jsx';
import AdminHome from './pages/admin/AdminHome.jsx';
import AdminProducts from './pages/admin/AdminProducts.jsx';
import AdminCategories from './pages/admin/AdminCategories.jsx';
import AdminSuppliers from './pages/admin/AdminSuppliers.jsx';
import AdminOrders from './pages/admin/AdminOrders.jsx';
import AdminUsers from './pages/admin/AdminUsers.jsx';

function Layout() {
  return (
    <>
      <Navbar />
      <main className="container">
        <Outlet />
      </main>
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* public */}
        <Route path="/" element={<Catalog />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/suppliers/:id" element={<SupplierPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* logged-in users */}
        <Route path="/cart" element={<RequireAuth><Cart /></RequireAuth>} />
        <Route path="/checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
        <Route path="/orders" element={<RequireAuth><Orders /></RequireAuth>} />
        <Route path="/orders/:id" element={<RequireAuth><OrderDetail /></RequireAuth>} />

        {/* admins */}
        <Route path="/admin" element={<RequireAdmin><AdminHome /></RequireAdmin>} />
        <Route path="/admin/products" element={<RequireAdmin><AdminProducts /></RequireAdmin>} />
        <Route path="/admin/categories" element={<RequireAdmin><AdminCategories /></RequireAdmin>} />
        <Route path="/admin/suppliers" element={<RequireAdmin><AdminSuppliers /></RequireAdmin>} />
        <Route path="/admin/orders" element={<RequireAdmin><AdminOrders /></RequireAdmin>} />
        <Route path="/admin/users" element={<RequireAdmin><AdminUsers /></RequireAdmin>} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
