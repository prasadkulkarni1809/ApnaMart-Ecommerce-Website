import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import Products from "../pages/Products/Products";
import ProductDetails from "../pages/Products/ProductDetails";
import Cart from "../pages/Cart/Cart";
import Checkout from "../pages/Checkout/Checkout";
import Account from "../pages/Account/Account";
import Wishlist from "../pages/Wishlist/Wishlist";
import Login from "../pages/Login/Login";
import Register from "../pages/Register/Register";
import CreateProduct from "../admin/pages/CreateProduct/CreateProduct";
import AdminOrders from "../admin/pages/Orders/AdminOrders";
import Home from "../pages/Home/Home";
import SellerRegister from "../pages/SellerRegister/SellerRegister";
import AdminDashboard from "../admin/pages/Dashboard/AdminDashboard";
import AdminCategories from "../admin/pages/Categories/AdminCategories";
import AdminProducts from "../admin/pages/Products/AdminProducts";
import AdminExchangeRequests from "../admin/pages/Exchanges/AdminExchangeRequests";
import SellerDashboard from "../seller/SellerDashboard";
import SellerProfile from "../pages/SellerProfile/SellerProfile";

function RequireAdmin({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-slate-950 p-8 text-white">Checking access...</div>;
  if (user?.role !== "admin") return <Navigate to={user?.role === "seller" ? "/seller" : user ? "/products" : "/login"} replace />;
  return children;
}

function RequireSeller({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-slate-950 p-8 text-white">Checking access...</div>;
  if (user?.role !== "seller") return <Navigate to={user?.role === "admin" ? "/admin" : user ? "/products" : "/login"} replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>

      <Route path="/" element={<Home />} />

      <Route path="/products" element={<Products />} />

      <Route
        path="/products/whislist"
        element={<Navigate to="/wishlist" replace />}
      />

      <Route
        path="/products/:id"
        element={<ProductDetails />}
      />

      <Route path="/cart" element={<Cart />} />

      <Route path="/checkout" element={<Checkout />} />

      <Route path="/account" element={<Account />} />

      <Route
        path="/order-success"
        element={
          <div className="min-h-[70vh] flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-5">✓</div>
              <h1 className="text-3xl font-semibold">
                Order Placed Successfully
              </h1>
              <p className="text-gray-500 mt-3">
                Your order has been placed successfully.
              </p>
              <a
                href="/products"
                className="inline-block mt-6 px-6 py-3 bg-black text-white rounded-xl"
              >
                Continue Shopping
              </a>
            </div>
          </div>
        }
      />

      <Route path="/wishlist" element={<Wishlist />} />

      <Route path="/login" element={<Login />} />

      <Route path="/register" element={<Register />} />

      <Route path="/owners/register" element={<SellerRegister />} />

      <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
      <Route path="/admin/orders" element={<RequireAdmin><AdminOrders /></RequireAdmin>} />
      <Route path="/admin/exchanges" element={<RequireAdmin><AdminExchangeRequests /></RequireAdmin>} />
      <Route path="/admin/products" element={<RequireAdmin><AdminProducts /></RequireAdmin>} />
      <Route path="/admin/products/create" element={<RequireAdmin><CreateProduct /></RequireAdmin>} />
      <Route path="/admin/categories" element={<RequireAdmin><AdminCategories /></RequireAdmin>} />

      <Route path="/seller" element={<RequireSeller><SellerDashboard /></RequireSeller>} />
      <Route path="/seller/profile." element={<Navigate to="/seller/profile" replace />} />
      <Route path="/seller/profile" element={<RequireSeller><SellerProfile /></RequireSeller>} />
      <Route path="/seller/products" element={<RequireSeller><SellerDashboard section="products" /></RequireSeller>} />
      <Route path="/seller/inventory" element={<RequireSeller><SellerDashboard section="inventory" /></RequireSeller>} />
      <Route path="/seller/products/create" element={<RequireSeller><CreateProduct /></RequireSeller>} />
      <Route path="/seller/orders" element={<RequireSeller><SellerDashboard section="orders" /></RequireSeller>} />
      <Route path="/seller/ready-to-dispatch" element={<RequireSeller><SellerDashboard section="dispatch" /></RequireSeller>} />
      <Route path="/seller/exchanges" element={<RequireSeller><SellerDashboard section="exchanges" /></RequireSeller>} />

    </Routes>
  );
}

export default AppRoutes;
