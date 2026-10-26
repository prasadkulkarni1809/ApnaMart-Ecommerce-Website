import { useEffect, useState } from "react";
import axios from "axios";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const links = [
  { to: "/admin", label: "Admin Dashboard", end: true },
  { to: "/admin/orders", label: "Manage Orders" },
  { to: "/admin/products", label: "Manage Products" },
  { to: "/admin/categories", label: "Manage Categories" },
  { to: "/admin/exchanges", label: "Exchange Requests" },
];

function AdminLayout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [newOrderCount, setNewOrderCount] = useState(0);
  const [knownOrderIds, setKnownOrderIds] = useState([]);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const seenOrdersKey = user?.id ? `apnamart-seen-orders:${user.id}` : "";

  useEffect(() => {
    if (!seenOrdersKey || user?.role !== "admin") return undefined;

    let active = true;
    const refreshOrderNotifications = async () => {
      try {
        const { data } = await axios.get("http://localhost:3000/api/admin/orders", {
          withCredentials: true,
        });
        if (!active || !data.success) return;

        const orderIds = (data.orders || []).map((order) => String(order._id));
        setKnownOrderIds(orderIds);

        let savedSeenIds = window.localStorage.getItem(seenOrdersKey);
        if (savedSeenIds === null) {
          // Treat orders already in the store as existing when this badge is first enabled.
          window.localStorage.setItem(seenOrdersKey, JSON.stringify(orderIds));
          setNewOrderCount(0);
          return;
        }

        let seenIds;
        try {
          seenIds = new Set(JSON.parse(savedSeenIds));
        } catch {
          seenIds = new Set();
        }
        setNewOrderCount(orderIds.filter((id) => !seenIds.has(id)).length);
      } catch {
        // Keep the admin navigation usable if notifications cannot be refreshed.
      }
    };

    void refreshOrderNotifications();
    const intervalId = window.setInterval(refreshOrderNotifications, 30000);
    window.addEventListener("focus", refreshOrderNotifications);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshOrderNotifications);
    };
  }, [seenOrdersKey, user?.role]);

  useEffect(() => {
    if (location.pathname !== "/admin/orders" || !seenOrdersKey || knownOrderIds.length === 0) return;
    window.localStorage.setItem(seenOrdersKey, JSON.stringify(knownOrderIds));
  }, [knownOrderIds, location.pathname, seenOrdersKey]);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const markOrdersSeen = () => {
    if (!seenOrdersKey) return;
    window.localStorage.setItem(seenOrdersKey, JSON.stringify(knownOrderIds));
    setNewOrderCount(0);
  };

  const linkClass = ({ isActive }) =>
    `block rounded-xl px-4 py-3 text-sm font-medium transition ${isActive ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`;

  return (
    <div className="min-h-screen bg-slate-950 text-white lg:flex">
      <header className="flex items-center justify-between border-b border-slate-800 px-5 py-4 lg:hidden">
        <NavLink to="/admin" className="font-bold">ApnaMart <span className="text-blue-400">Admin</span></NavLink>
        <button type="button" aria-expanded={menuOpen} aria-label="Toggle admin navigation" onClick={() => setMenuOpen((open) => !open)} className="rounded-lg border border-slate-700 px-3 py-2 text-sm">{menuOpen ? "Close" : "Menu"}</button>
      </header>

      <aside className={`${menuOpen ? "block" : "hidden"} border-b border-slate-800 bg-slate-900 p-5 lg:block lg:min-h-screen lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-r`}>
        <NavLink to="/admin" className="hidden px-3 py-2 text-xl font-bold lg:block">ApnaMart <span className="text-blue-400">Admin</span></NavLink>
        <div className="mb-6 mt-5 border-b border-slate-800 px-3 pb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Signed in as</p>
          <p className="mt-2 truncate font-medium">{user?.fullname || "Store owner"}</p>
        </div>
        <nav aria-label="Admin navigation" className="space-y-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={linkClass}
              onClick={() => {
                setMenuOpen(false);
                if (link.to === "/admin/orders") markOrdersSeen();
              }}
            >
              <span className="flex items-center justify-between gap-3">
                <span>{link.label}</span>
                {link.to === "/admin/orders" && location.pathname !== "/admin/orders" && newOrderCount > 0 && (
                  <span aria-label={`${newOrderCount} new orders`} className="inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-2 text-xs font-bold text-white">
                    {newOrderCount > 99 ? "99+" : newOrderCount}
                  </span>
                )}
              </span>
            </NavLink>
          ))}
          <button type="button" onClick={handleLogout} className="mt-3 block w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-red-300 transition hover:bg-red-500/10">Logout</button>
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <main className="min-h-[calc(100vh-65px)]">{children}</main>
      </div>
    </div>
  );
}

export default AdminLayout;
