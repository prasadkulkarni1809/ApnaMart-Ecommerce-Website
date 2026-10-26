import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import API_BASE_URL from "../../../config/api";
import { Link } from "react-router-dom";

const ORDERS_API = `${API_BASE_URL}/api/admin/orders`;

function AdminExchangeRequests() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [notice, setNotice] = useState("");
  const [activeView, setActiveView] = useState("pending");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.get(ORDERS_API, { withCredentials: true });
      if (!data.success || !Array.isArray(data.orders)) {
        throw new Error(data.message || "Unable to load exchange requests.");
      }
      setOrders(data.orders.filter((order) => order.exchangeStatus && order.exchangeStatus !== "NONE"));
    } catch (requestError) {
      const status = requestError.response?.status;
      if (status === 401 || status === 403) {
        setError("Your admin session has expired or no longer has access. Please sign in again.");
      } else {
        setError(requestError.response?.data?.message || requestError.message || "Unable to load exchange requests. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadOrders);
  }, [loadOrders]);

  const decideExchange = async (order, decision) => {
    const verb = decision === "APPROVED" ? "approve" : "reject";
    if (!window.confirm(`Are you sure you want to ${verb} the exchange request for order #${String(order._id).slice(-8).toUpperCase()}?`)) return;

    setUpdatingOrderId(order._id);
    setNotice("");
    setError("");
    try {
      const { data } = await axios.put(
        `${ORDERS_API}/${order._id}/exchange`,
        { decision },
        { withCredentials: true }
      );
      if (!data.success) throw new Error(data.message || `Unable to ${verb} this request.`);
      setOrders((current) => current.map((item) => item._id === order._id
        ? { ...item, exchangeStatus: data.order?.exchangeStatus || decision }
        : item));
      setNotice(`Exchange request for order #${String(order._id).slice(-8).toUpperCase()} ${decision.toLowerCase()} successfully.`);
    } catch (requestError) {
      const status = requestError.response?.status;
      if (status === 401 || status === 403) {
        setError("Your admin session has expired or no longer has access. Please sign in again.");
      } else {
        setError(requestError.response?.data?.message || requestError.message || `Unable to ${verb} this exchange request. Please try again.`);
      }
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const formatDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const pendingOrders = orders.filter((order) => order.exchangeStatus === "REQUESTED");
  const historyOrders = orders.filter((order) => order.exchangeStatus !== "REQUESTED");
  const visibleOrders = activeView === "pending" ? pendingOrders : historyOrders;

  return (
    <div className="min-h-screen bg-slate-950 p-5 text-white sm:p-6 md:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-blue-400">ADMINISTRATION</p>
            <h1 className="mt-2 text-3xl font-bold">Exchange Requests</h1>
            <p className="mt-2 text-slate-400">Review and respond to customer exchange requests.</p>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-4">
            <p className="text-sm text-slate-400">Pending requests</p>
            <p className="mt-1 text-2xl font-bold">{pendingOrders.length}</p>
          </div>
        </div>

        {notice && <div role="status" className="mb-4 rounded-xl border border-green-800 bg-green-950/40 p-4 text-green-300">{notice}</div>}
        {error && <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-800 bg-red-950/40 p-4 text-red-300"><span>{error}</span><button type="button" onClick={() => void loadOrders()} className="rounded-lg border border-red-700 px-3 py-2 font-semibold hover:bg-red-900/40">Try again</button></div>}

        <div className="mb-5 flex gap-2 border-b border-slate-800" role="tablist" aria-label="Exchange requests">
          {[{ id: "pending", label: `Pending (${pendingOrders.length})` }, { id: "history", label: `History (${historyOrders.length})` }].map((tab) => (
            <button key={tab.id} type="button" role="tab" aria-selected={activeView === tab.id} onClick={() => setActiveView(tab.id)} className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${activeView === tab.id ? "border-blue-500 text-blue-300" : "border-transparent text-slate-400 hover:text-white"}`}>{tab.label}</button>
          ))}
        </div>

        {loading ? (
          <div role="status" className="rounded-2xl border border-slate-800 bg-slate-900/50 p-10 text-center text-slate-300">Loading exchange requests…</div>
        ) : error ? null : visibleOrders.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-10 text-center text-slate-400">{activeView === "pending" ? "There are no pending exchange requests." : "No processed exchange requests yet."}</div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {visibleOrders.map((order) => {
              const isUpdating = updatingOrderId === order._id;
              return (
                <article key={order._id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Order ID</p>
                      <p className="mt-1 break-all font-semibold">#{order._id}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${order.exchangeStatus === "REQUESTED" ? "bg-amber-500/10 text-amber-300" : order.exchangeStatus === "APPROVED" ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-700 text-slate-300"}`}>{order.exchangeStatus}</span>
                  </div>

                  <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Customer</dt><dd className="mt-1">{order.user?.fullname || order.user?.name || "Customer"}</dd><dd className="mt-1 break-all text-sm text-slate-400">{order.user?.email || "Email unavailable"}</dd></div>
                    <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Order date</dt><dd className="mt-1">{formatDate(order.createdAt)}</dd></div>
                  </dl>

                  <div className="mt-5">
                    <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500">Products</h2>
                    <ul className="mt-2 space-y-2">
                      {(order.items || []).map((item, index) => <li key={item._id || index} className="flex justify-between gap-3 rounded-lg bg-slate-800/60 px-3 py-2 text-sm"><span>{item.product?.name || item.name || "Product unavailable"}</span><span className="shrink-0 text-slate-400">Qty: {item.quantity ?? 0}</span></li>)}
                      {!order.items?.length && <li className="text-sm text-slate-400">No product details available.</li>}
                    </ul>
                  </div>

                  <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Exchange reason</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{order.exchangeReason || "No reason provided."}</p>
                  </div>

                  {order.exchangeStatus === "REQUESTED" && <div className="mt-5 flex flex-wrap gap-3">
                    <button type="button" onClick={() => void decideExchange(order, "APPROVED")} disabled={Boolean(updatingOrderId)} className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50">{isUpdating ? "Processing…" : "Approve"}</button>
                    <button type="button" onClick={() => void decideExchange(order, "REJECTED")} disabled={Boolean(updatingOrderId)} className="rounded-lg border border-red-700 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-950/60 disabled:cursor-not-allowed disabled:opacity-50">Reject</button>
                  </div>}
                </article>
              );
            })}
          </div>
        )}
        <div className="mt-6"><Link to="/admin/orders" className="text-sm font-medium text-blue-300 hover:text-blue-200">← Back to orders</Link></div>
      </div>
    </div>
  );
}

export default AdminExchangeRequests;
