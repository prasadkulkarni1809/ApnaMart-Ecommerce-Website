import { useEffect, useState } from "react";
import axios from "axios";
import API_BASE_URL from "../../../config/api";
import { Link } from "react-router-dom";

function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/admin/orders`, { withCredentials: true })
      .then(({ data }) => setOrders(data.orders || []))
      .catch((requestError) => setError(requestError.response?.data?.message || "Unable to load dashboard summary."));
  }, []);

  const exchanges = orders.filter((order) => order.exchangeStatus === "REQUESTED");
  const cards = [
    { label: "Total Orders", value: orders.length, to: "/admin/orders" },
    { label: "Exchange Requests", value: exchanges.length, to: "/admin/exchanges" },
    { label: "Manage Products", value: "Open", to: "/admin/products" },
    { label: "Categories", value: "Open", to: "/admin/categories" },
  ];

  return (
    <div className="mx-auto max-w-7xl p-6 md:p-10">
      <p className="text-sm font-semibold uppercase tracking-wider text-blue-400">Administration</p>
      <h1 className="mt-2 text-3xl font-bold">Admin Dashboard</h1>
      <p className="mt-2 text-slate-400">Manage your store operations from one place.</p>
      {error && <p role="alert" className="mt-6 rounded-xl border border-red-900 bg-red-950/50 p-4 text-red-300">{error}</p>}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.label} to={card.to} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-blue-500">
            <p className="text-sm text-slate-400">{card.label}</p>
            <p className="mt-3 text-3xl font-bold">{card.value}</p>
            <p className="mt-4 text-sm font-medium text-blue-300">Open section →</p>
          </Link>
        ))}
      </div>
      <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold">Recent orders</h2>
        {orders.slice(0, 5).length ? (
          <div className="mt-4 divide-y divide-slate-800">
            {orders.slice(0, 5).map((order) => <Link key={order._id} to="/admin/orders" className="flex flex-wrap justify-between gap-2 py-3 text-sm hover:text-blue-300"><span>#{order._id.slice(-8).toUpperCase()} · {order.user?.fullname || "Customer"}</span><span className="text-slate-400">{order.status} · ₹{Number(order.amount || 0).toLocaleString("en-IN")}</span></Link>)}
          </div>
        ) : <p className="mt-3 text-sm text-slate-400">Order summaries will appear here.</p>}
      </section>
    </div>
  );
}

export default AdminDashboard;
