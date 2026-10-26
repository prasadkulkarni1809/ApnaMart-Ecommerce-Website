import { useEffect, useRef, useState } from "react";
import axios from "axios";
import API_BASE_URL from "../../config/api";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";

function Navbar() {
  const { cartCount } = useCart();
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchInput = useRef(null);
  const routeSearch = new URLSearchParams(location.search).get("search") || "";
  const [categories, setCategories] = useState([]);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/categories`)
      .then((response) => setCategories(response.data.categories || []))
      .catch((error) => console.error("NAV CATEGORY FETCH ERROR:", error));
  }, []);

  const handleSearch = (event) => {
    event.preventDefault();
    const query = searchInput.current?.value.trim() || "";
    navigate(query ? `/products?search=${encodeURIComponent(query)}` : "/products");
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/products", { replace: true });
    } catch (error) {
      console.error("LOGOUT ERROR:", error);
    }
  };

  return (
    <nav className="border-b bg-white shadow-md dark:border-gray-700 dark:bg-gray-900">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3 sm:px-6 md:flex-nowrap md:gap-x-7">

        {/* Logo */}
        <Link
          to="/products"
          className="shrink-0 text-xl font-bold text-gray-800 sm:text-2xl"
        >
          ApnaMart
        </Link>

        <form onSubmit={handleSearch} role="search" className="order-3 flex w-full md:order-none md:mx-2 md:w-auto md:flex-1 md:justify-center">
          <div className="flex w-full max-w-2xl overflow-hidden rounded-md border border-transparent bg-[#f0f5ff] transition focus-within:border-blue-500 focus-within:bg-white focus-within:shadow-sm dark:bg-gray-800 dark:focus-within:bg-gray-900">
            <input
              key={location.key}
              ref={searchInput}
              type="search"
              defaultValue={routeSearch}
              placeholder="Search products by name or SKU"
              aria-label="Search products"
              className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-gray-800 outline-none placeholder:text-gray-500"
            />
            <button type="submit" aria-label="Search" className="flex w-12 shrink-0 items-center justify-center bg-blue-600 text-white transition hover:bg-blue-700">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="10.8" cy="10.8" r="6.8" /><path strokeLinecap="round" d="m16 16 5 5" /></svg>
            </button>
          </div>
        </form>

        {/* Navigation */}
        <div className="ml-auto flex shrink-0 items-center gap-3 text-sm sm:gap-5 md:ml-0 md:gap-6">

          <Link
            to="/products"
            className="text-gray-700 hover:text-blue-600 transition"
          >
            Products
          </Link>

          <div className="relative">
            <button type="button" aria-haspopup="menu" aria-expanded={categoriesOpen} onClick={() => setCategoriesOpen((open) => !open)} className="flex items-center gap-1 whitespace-nowrap text-gray-700 transition hover:text-blue-600 dark:text-gray-200">
              Categories <span aria-hidden="true">⌄</span>
            </button>
            {categoriesOpen && (
              <div role="menu" className="absolute right-0 top-full z-50 mt-3 w-64 overflow-hidden rounded-xl border border-gray-100 bg-white py-2 shadow-xl dark:border-gray-700 dark:bg-gray-900">
                <Link role="menuitem" to="/products" onClick={() => setCategoriesOpen(false)} className="block px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-gray-800">✨ For You <span className="ml-1 text-xs font-normal text-gray-500">All products</span></Link>
                {categories.length > 0 && <div className="mx-4 border-t border-gray-100 dark:border-gray-700" />}
                {categories.map((category) => (
                  <Link key={category._id} role="menuitem" to={`/products?category=${category._id}`} onClick={() => setCategoriesOpen(false)} className="block px-4 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50 hover:text-blue-700 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:text-blue-300">
                    {category.name}
                  </Link>
                ))}
                {!categories.length && <p className="px-4 py-3 text-sm text-gray-500">No categories available</p>}
              </div>
            )}
          </div>

          {user?.role === "customer" && (
            <Link to="/account" className="text-gray-700 hover:text-blue-600 transition">
              My Account
            </Link>
          )}

          {user?.role === "customer" && (
            <Link to="/owners/register" className="whitespace-nowrap text-blue-700 hover:text-blue-900 transition dark:text-blue-300">
              Become a Seller
            </Link>
          )}

          {user?.role === "customer" && (
            <Link
              to="/cart"
              className="relative text-gray-700 hover:text-blue-600 transition"
            >
              🛒 Cart
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-4 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-xs flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
          )}

          {user?.role === "seller" && <Link to="/seller" className="text-emerald-700 transition hover:text-emerald-600 dark:text-emerald-300">Seller Dashboard</Link>}
          {user?.role === "admin" && <Link to="/admin" className="text-blue-700 transition hover:text-blue-600 dark:text-blue-300">Platform Admin</Link>}

          {!loading && !user && (
            <Link to="/login" className="text-gray-700 hover:text-blue-600 transition">
              Login
            </Link>
          )}
          {user && (
            <button type="button" onClick={handleLogout} className="text-gray-700 hover:text-blue-600 transition">
              Logout
            </button>
          )}

        </div>

      </div>
    </nav>
  );
}

export default Navbar;
