import { useEffect, useState } from "react";
import axios from "axios";

function AdminOrders({ exchangeOnly = false }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState({});

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data } = await axios.get(
          "http://localhost:3000/api/admin/orders",
          { withCredentials: true }
        );

        if (data.success) {
          setOrders(data.orders);
        } else {
          setError(data.message || "Failed to load orders");
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load orders");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const visibleOrders = exchangeOnly
    ? orders.filter((order) => order.exchangeRequested)
    : orders;

  const nextStatuses = {
    SHIPPED: ["OUT_FOR_DELIVERY"],
    OUT_FOR_DELIVERY: ["DELIVERED"],
  };

  const handleStatusUpdate = async (order) => {
    const newStatus = selectedStatuses[order._id];

    if (!newStatus) {
      setActionError("Please select a status first.");
      setActionMessage("");
      return;
    }

    try {
      setUpdatingOrderId(order._id);
      setActionError("");
      setActionMessage("");

      const { data } = await axios.put(
        `http://localhost:3000/api/admin/orders/${order._id}/status`,
        { status: newStatus },
        { withCredentials: true }
      );

      setOrders((currentOrders) =>
        currentOrders.map((item) =>
          item._id === order._id
            ? {
                ...item,
                status: data.order.status,
                deliveryUpdate: data.order.deliveryUpdate,
                sellerFulfillments: data.order.sellerFulfillments,
              }
            : item
        )
      );

      setSelectedStatuses((current) => ({
        ...current,
        [order._id]: "",
      }));

      setActionMessage(
        `Order #${order._id.slice(-8).toUpperCase()} updated to ${newStatus}.`
      );
    } catch (requestError) {
      setActionError(
        requestError.response?.data?.message || "Failed to update order status."
      );
    } finally {
      setUpdatingOrderId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 p-8 text-white">
        Loading orders...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 p-8 text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-blue-400">ADMINISTRATION</p>
            <h1 className="mt-2 text-3xl font-bold">{exchangeOnly ? "Exchange Requests" : "Order Management"}</h1>
            <p className="mt-2 text-slate-400">
              {exchangeOnly ? "Review customer exchange requests." : "Monitor customer orders and payment details."}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-4">
            <p className="text-sm text-slate-400">{exchangeOnly ? "Requests" : "Total Orders"}</p>
            <p className="mt-1 text-2xl font-bold">{visibleOrders.length}</p>
          </div>
        </div>

        {actionMessage && (
          <div className="mb-4 rounded-xl border border-green-800 bg-green-950/40 p-4 text-green-300">
            {actionMessage}
          </div>
        )}

        {actionError && (
          <div role="alert" className="mb-4 rounded-xl border border-red-800 bg-red-950/40 p-4 text-red-300">
            {actionError}
          </div>
        )}

        {visibleOrders.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 p-10 text-center text-slate-400">
            No orders found.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full min-w-[1450px] text-left text-sm">
              <thead className="bg-slate-900 text-slate-300">
                <tr>
                  <th className="px-5 py-4">Order</th>
                  <th className="px-5 py-4">Customer</th>
                  <th className="px-5 py-4">Items</th>
                  <th className="px-5 py-4">Amount</th>
                  <th className="px-5 py-4">Payment</th>
                  <th className="px-5 py-4">Order Status</th>
                  <th className="px-5 py-4">Seller Fulfillment</th>
                  <th className="px-5 py-4">Exchange</th>
                  <th className="px-5 py-4">Actions</th>
                  <th className="px-5 py-4">Date</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {visibleOrders.map((order) => (
                  <tr key={order._id} className="transition hover:bg-slate-900/70">
                    <td className="px-5 py-4 font-semibold">
                      #{order._id.slice(-8).toUpperCase()}
                    </td>

                    <td className="px-5 py-4">
                      <p>{order.user?.name || order.user?.fullname || "Customer"}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {order.user?.email || ""}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      {order.items?.map((item, index) => (
                        <div key={item._id || index} className="mb-2">
                          <p>{item.product?.name || "Product unavailable"}</p>
                          <p className="text-xs text-slate-400">
                            Qty: {item.quantity}
                          </p>
                        </div>
                      ))}
                    </td>

                    <td className="px-5 py-4 font-semibold">
                      ₹{Number(order.amount || 0).toLocaleString("en-IN")}
                    </td>

                    <td className="px-5 py-4">
                      <p>{order.paymentMethod}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {order.paymentStatus}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">
                        {order.status}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      {(order.sellerFulfillments || []).length ? order.sellerFulfillments.map((fulfillment, index) => (
                        <div key={String(fulfillment.seller?._id || fulfillment.seller || index)} className="mb-2 min-w-40">
                          <p>{fulfillment.seller?.fullname || "Seller"}</p>
                          <p className="text-xs text-emerald-300">{fulfillment.status?.replaceAll("_", " ")}</p>
                          {fulfillment.readyAt && <p className="mt-1 text-xs text-slate-500">Ready: {formatDate(fulfillment.readyAt)}</p>}
                          {(fulfillment.courierPartner || fulfillment.trackingNumber) && <p className="mt-1 text-xs text-slate-400">{fulfillment.courierPartner} {fulfillment.trackingNumber}</p>}
                        </div>
                      )) : <span className="text-slate-500">Legacy order</span>}
                    </td>

                    <td className="px-5 py-4">{order.exchangeStatus || "NONE"}</td>

                    <td className="px-5 py-4">
                      {nextStatuses[order.status]?.length ? (
                        <div className="flex min-w-52 flex-col gap-2">
                          <select
                            value={selectedStatuses[order._id] || ""}
                            onChange={(event) =>
                              setSelectedStatuses((current) => ({
                                ...current,
                                [order._id]: event.target.value,
                              }))
                            }
                            disabled={updatingOrderId === order._id}
                            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                          >
                            <option value="">Select next status</option>
                            {nextStatuses[order.status].map((status) => (
                              <option key={status} value={status}>
                                {status.replaceAll("_", " ")}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => handleStatusUpdate(order)}
                            disabled={
                              !selectedStatuses[order._id] ||
                              updatingOrderId === order._id
                            }
                            className="rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {updatingOrderId === order._id
                              ? "Updating..."
                              : "Update Status"}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-500">No actions available</span>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-slate-400">
                      {formatDate(order.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}

export default AdminOrders;
