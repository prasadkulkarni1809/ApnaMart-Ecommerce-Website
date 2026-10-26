import { Link } from "react-router-dom";

function Navbar() {
  const cartCount = 0;
  const showLogout = false;

  return (
    <nav className="bg-white dark:bg-gray-900 border-b dark:border-gray-700 px-8 py-4 flex justify-between items-center">

      {/* LEFT : LOGO */}
      <Link
        to="/"
        className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white"
      >
        ApnaMart<span className="text-gray-400">.</span>
      </Link>

      {/* RIGHT : NAV LINKS */}
      <div className="flex items-center gap-6 text-sm font-medium text-gray-600 dark:text-gray-300">

        {/* SHOP */}
        <Link
          to="/products"
          className="flex items-center gap-2 hover:text-black dark:hover:text-white transition"
        >
          🛍️ Shop
        </Link>

        {/* MY ACCOUNT */}
        <Link
          to="/account"
          className="flex items-center gap-2 hover:text-black dark:hover:text-white transition"
        >
          👤 My Account
        </Link>

        {/* CART */}
        <Link
          to="/cart"
          className="relative flex items-center gap-2 hover:text-black dark:hover:text-white transition"
        >
          🛒 Cart

          {cartCount > 0 && (
            <span className="absolute -top-2 -right-3 bg-black dark:bg-white text-white dark:text-black text-[10px] w-5 h-5 flex items-center justify-center rounded-full">
              {cartCount}
            </span>
          )}
        </Link>

        {/* DARK MODE TOGGLE */}
        <button
          className="ml-2 w-9 h-9 flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          aria-label="Toggle Dark Mode"
        >
          <span>🌙</span>
        </button>

        {/* DIVIDER */}
        <span className="h-4 w-px bg-gray-300 dark:bg-gray-600"></span>

        {/* LOGOUT */}
        {showLogout && (
          <>
            <span className="h-4 w-px bg-gray-300"></span>

            <button
              className="flex items-center gap-2 text-red-500 hover:text-red-600 transition"
            >
              🚪 Logout
            </button>
          </>
        )}

      </div>
    </nav>
  );
}

export default Navbar;
