import { useEffect, useState } from "react";
import axios from "axios";
import API_BASE_URL from "../config/api";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API = `${API_BASE_URL}/api/seller`;
const sections = [
  { to: "/seller", label: "Dashboard", end: true },
  { to: "/seller/products", label: "My Products" },
  { to: "/seller/inventory", label: "Inventory" },
  { to: "/seller/orders", label: "My Orders" },
  { to: "/seller/ready-to-dispatch", label: "Ready to Dispatch" },
  { to: "/seller/exchanges", label: "Exchange Requests" },
];

function SellerDashboard({ section = "dashboard" }) {
  const [data, setData] = useState({ products: [], orders: [], requests: [], dispatch: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [updatingOrder, setUpdatingOrder] = useState("");
  const [shippingDetails, setShippingDetails] = useState({});
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    const endpoints = section === "dashboard"
      ? ["products", "orders", "exchange-requests", "ready-to-dispatch"]
      : [section === "exchanges" ? "exchange-requests" : section === "inventory" ? "products" : section === "dispatch" ? "ready-to-dispatch" : section];
    Promise.all(endpoints.map((endpoint) => axios.get(`${API}/${endpoint}`, { withCredentials: true })))
      .then((responses) => {
        if (!active) return;
        setData((current) => {
          const next = { ...current };
          responses.forEach((response, index) => {
            const endpoint = endpoints[index];
            if (endpoint === "products") next.products = response.data.products || [];
            else if (endpoint === "orders") next.orders = response.data.orders || [];
            else if (endpoint === "exchange-requests") next.requests = response.data.requests || [];
            else if (endpoint === "ready-to-dispatch") next.dispatch = response.data.orders || [];
          });
          return next;
        });
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || "Unable to load seller dashboard.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [section]);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };
  const title = { dashboard: "Seller Dashboard", products: "My Products", inventory: "Inventory", orders: "My Orders", dispatch: "Ready to Dispatch Queue", exchanges: "Exchange Requests" }[section];
  const fmtDate = (value) => value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const fmtDateTime = (value) => value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";

  const handleFulfillmentUpdate = async (order, status) => {
    const confirmText = status === "READY_TO_DISPATCH"
      ? "Confirm the parcel is packed securely and the shipping label is attached?"
      : status === "SHIPPED"
        ? "Confirm the parcel has been physically handed to the courier?"
        : `Move your items to ${status.replaceAll("_", " ")}?`;
    if (!window.confirm(confirmText)) return;
    setUpdatingOrder(order._id);
    setActionError("");
    try {
      const details = shippingDetails[order._id] || {};
      const { data: response } = await axios.put(`${API}/orders/${order._id}/fulfillment`, {
        status,
        ...(status === "READY_TO_DISPATCH" ? {
          securePackingConfirmed: true,
          shippingLabelAttached: true,
          courierPartner: details.courierPartner || "",
          trackingNumber: details.trackingNumber || "",
        } : {}),
        ...(status === "SHIPPED" ? { courierHandoverConfirmed: true, courierPartner: details.courierPartner ?? order.sellerFulfillment?.courierPartner, trackingNumber: details.trackingNumber ?? order.sellerFulfillment?.trackingNumber } : {}),
      }, { withCredentials: true });
      const updatedOrder = response.order;
      setData((current) => ({
        ...current,
        orders: current.orders.map((item) => item._id === order._id ? updatedOrder : item),
        dispatch: status === "READY_TO_DISPATCH"
          ? [...current.dispatch.filter((item) => item._id !== order._id), updatedOrder]
          : status === "SHIPPED" ? current.dispatch.filter((item) => item._id !== order._id) : current.dispatch,
      }));
    } catch (requestError) {
      setActionError(requestError.response?.data?.message || "Could not update fulfillment. Refresh and try again.");
    } finally {
      setUpdatingOrder("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white lg:flex">
      <aside className="border-b border-slate-800 bg-slate-900 p-5 lg:min-h-screen lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-r">
        <Link to="/seller" className="px-3 py-2 text-xl font-bold">ApnaMart <span className="text-emerald-400">Seller</span></Link>
        <div className="mb-6 mt-5 border-b border-slate-800 px-3 pb-5"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Signed in as seller</p><p className="mt-2 truncate font-medium">{user?.fullname || "Seller"}</p></div>
        <nav aria-label="Seller navigation" className="grid grid-cols-2 gap-2 lg:grid-cols-1">
          {sections.map((item) => <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `rounded-xl px-4 py-3 text-sm font-medium transition ${isActive ? "bg-emerald-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}>{item.label}</NavLink>)}
          <button type="button" onClick={handleLogout} className="rounded-xl px-4 py-3 text-left text-sm font-medium text-red-300 hover:bg-red-500/10">Logout</button>
        </nav>
      </aside>

      <main className="min-w-0 flex-1 p-5 sm:p-6 md:p-10">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-400">Seller workspace</p>
          <h1 className="mt-2 text-3xl font-bold">{title}</h1>
          <p className="mt-2 text-slate-400">Manage your products and review orders containing your items.</p>
          {error && <p role="alert" className="mt-6 rounded-xl border border-red-900 bg-red-950/50 p-4 text-red-300">{error}</p>}
          {actionError && <p role="alert" className="mt-6 rounded-xl border border-red-900 bg-red-950/50 p-4 text-red-300">{actionError}</p>}
          {loading ? <div role="status" className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-8 text-slate-300">Loading seller data…</div> : !error && (
            <>
              {section === "dashboard" && <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{[{ label: "My Products", count: data.products.length, to: "/seller/products" }, { label: "Inventory", count: data.products.length, to: "/seller/inventory" }, { label: "My Orders", count: data.orders.length, to: "/seller/orders" }, { label: "Ready to Dispatch", count: data.dispatch.length, to: "/seller/ready-to-dispatch" }, { label: "Exchange Requests", count: data.requests.length, to: "/seller/exchanges" }].map((card) => <Link key={card.label} to={card.to} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-emerald-600"><p className="text-sm text-slate-400">{card.label}</p><p className="mt-3 text-3xl font-bold">{card.count}</p><p className="mt-4 text-sm font-medium text-emerald-300">Open section →</p></Link>)}</div>}

              {(section === "products" || section === "inventory") && <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">{section === "inventory" ? "Stock levels" : "Your catalog"}</h2><p className="mt-1 text-sm text-slate-400">Products and inventory shown here belong to your seller account.</p></div>{section === "products" && <Link to="/seller/products/create" className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold hover:bg-emerald-500">Add product</Link>}</div>{data.products.length ? <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="text-slate-400"><tr><th className="py-3">Product</th><th>Category</th><th>Price</th><th>Inventory</th></tr></thead><tbody className="divide-y divide-slate-800">{data.products.map((product) => <tr key={product._id}><td className="py-4"><div className="flex items-center gap-3"><img src={product.images?.[0] || ""} alt="" className="h-12 w-12 rounded-lg bg-slate-800 object-cover"/><span>{product.name}</span></div></td><td className="text-slate-300">{product.category?.name || "—"}</td><td>₹{Number(product.price || 0).toLocaleString("en-IN")}</td><td className={product.stock > 0 ? "text-emerald-300" : "text-red-300"}>{product.stock ?? 0}</td></tr>)}</tbody></table></div> : <p className="py-8 text-center text-slate-400">You have not added products yet.</p>}</section>}

              {section === "orders" && <div className="mt-8 grid gap-4 lg:grid-cols-2">{data.orders.length ? data.orders.map((order) => { const fulfillment = order.sellerFulfillment || { status: order.status }; const nextStatus = { PLACED: "ACCEPTED", ACCEPTED: "PACKED", PACKED: "READY_TO_DISPATCH", READY_TO_DISPATCH: "SHIPPED" }[fulfillment.status]; const buttonLabel = { ACCEPTED: "Accept order", PACKED: "Mark Packed", READY_TO_DISPATCH: "Ready to Dispatch", SHIPPED: "Mark Shipped" }[nextStatus]; return <article key={order._id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex justify-between gap-3"><div><p className="text-xs uppercase tracking-wide text-slate-500">Order</p><h2 className="mt-1 font-semibold">#{String(order._id).slice(-8).toUpperCase()}</h2></div><span className="h-fit rounded-full bg-blue-500/10 px-3 py-1 text-xs text-blue-300">{fulfillment.status.replaceAll("_", " ")}</span></div><p className="mt-3 text-sm text-slate-400">{order.user?.fullname || "Customer"} · {fmtDate(order.createdAt)}</p><ul className="mt-4 space-y-2">{order.items.map((item) => <li key={item._id} className="flex justify-between gap-3 rounded-lg bg-slate-800/60 px-3 py-2 text-sm"><span>{item.product?.name || item.name}</span><span className="shrink-0 text-slate-400">Qty {item.quantity}</span></li>)}</ul><p className="mt-4 text-sm text-slate-300">Seller items total: ₹{Number(order.amount || 0).toLocaleString("en-IN")}</p><p className="mt-2 text-sm text-slate-400">Ship to: {order.address}, {order.city} {order.pincode} · {order.phone}</p>{(fulfillment.status === "PACKED" || fulfillment.status === "READY_TO_DISPATCH") && <div className="mt-4 grid gap-2 sm:grid-cols-2"><input aria-label="Courier partner" placeholder="Courier partner (optional)" value={shippingDetails[order._id]?.courierPartner ?? fulfillment.courierPartner ?? ""} onChange={(event) => setShippingDetails((current) => ({ ...current, [order._id]: { ...current[order._id], courierPartner: event.target.value } }))} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"/><input aria-label="Tracking number" placeholder="Tracking number (optional)" value={shippingDetails[order._id]?.trackingNumber ?? fulfillment.trackingNumber ?? ""} onChange={(event) => setShippingDetails((current) => ({ ...current, [order._id]: { ...current[order._id], trackingNumber: event.target.value } }))} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"/><p className="text-xs text-slate-500 sm:col-span-2">Saved for customer tracking when the parcel becomes ready. No courier is notified by this dashboard.</p></div>}{nextStatus && <button type="button" disabled={updatingOrder === order._id || (nextStatus === "ACCEPTED" && order.paymentMethod === "ONLINE" && order.paymentStatus !== "PAID")} onClick={() => handleFulfillmentUpdate(order, nextStatus)} className="mt-4 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50">{updatingOrder === order._id ? "Updating…" : buttonLabel}</button>}{order.paymentMethod === "ONLINE" && order.paymentStatus !== "PAID" && <p className="mt-2 text-xs text-amber-300">Online payment must be completed before accepting.</p>}</article>; }) : <p className="rounded-2xl border border-slate-800 p-8 text-slate-400">No orders include your products yet.</p>}</div>}

              {section === "dispatch" && <div className="mt-8 grid gap-4 lg:grid-cols-2">{data.dispatch.length ? data.dispatch.map((order) => { const fulfillment = order.sellerFulfillment; return <article key={order._id} className="rounded-2xl border border-emerald-900/70 bg-slate-900 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-wide text-slate-500">Order reference</p><h2 className="mt-1 font-semibold">#{String(order._id).slice(-8).toUpperCase()}</h2></div><span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">READY TO DISPATCH</span></div><ul className="mt-4 space-y-2">{order.items.map((item) => <li key={item._id} className="flex justify-between gap-3 rounded-lg bg-slate-800/60 px-3 py-2 text-sm"><span>{item.product?.name || item.name}</span><span className="text-slate-400">Qty {item.quantity}</span></li>)}</ul><p className="mt-4 text-sm text-slate-300">Packed securely · Shipping label attached</p><p className="mt-2 text-sm text-slate-400">Courier: {fulfillment.courierPartner || "Not specified"} · Tracking: {fulfillment.trackingNumber || "Not provided"}</p><p className="mt-2 text-sm text-slate-400">Ready for pickup since {fmtDateTime(fulfillment.readyAt)}</p><p className="mt-3 text-xs text-slate-500">This status records readiness; it does not request or confirm a courier pickup.</p></article>; }) : <p className="rounded-2xl border border-slate-800 p-8 text-slate-400">No orders are ready to dispatch.</p>}</div>}

              {section === "exchanges" && <div className="mt-8 grid gap-4 lg:grid-cols-2">{data.requests.length ? data.requests.map((order) => <article key={order._id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex justify-between gap-3"><div><p className="text-xs uppercase tracking-wide text-slate-500">Order</p><h2 className="mt-1 font-semibold">#{String(order._id).slice(-8).toUpperCase()}</h2></div><span className="h-fit rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-300">{order.exchangeStatus}</span></div><p className="mt-3 text-sm text-slate-400">{order.user?.fullname || "Customer"} · {fmtDate(order.createdAt)}</p><ul className="mt-4 space-y-2">{order.items.map((item) => <li key={item._id} className="rounded-lg bg-slate-800/60 px-3 py-2 text-sm">{item.product?.name || item.name} · Qty {item.quantity}</li>)}</ul><div className="mt-4 rounded-xl border border-slate-800 p-4"><p className="text-xs uppercase tracking-wide text-slate-500">Customer reason</p><p className="mt-2 text-sm">{order.exchangeReason || "No reason provided."}</p></div><p className="mt-3 text-xs text-slate-500">Exchange decisions are handled by the platform admin.</p></article>) : <p className="rounded-2xl border border-slate-800 p-8 text-slate-400">No exchange requests include your products.</p>}</div>}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default SellerDashboard;
