const SELLER_STAGE_ORDER = [
  "PLACED",
  "ACCEPTED",
  "PACKED",
  "READY_TO_DISPATCH",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

const DELIVERY_UPDATES = {
  PLACED: "Order Placed",
  ACCEPTED: "Order Accepted",
  PACKED: "Order Packed",
  READY_TO_DISPATCH: "Ready for Dispatch",
  SHIPPED: "Order Shipped",
  OUT_FOR_DELIVERY: "Order Out for Delivery",
  DELIVERED: "Order Delivered",
};

function legacyStatus(status) {
  if (SELLER_STAGE_ORDER.includes(status)) return status;
  if (["CANCELLED", "REJECTED"].includes(status)) return status;
  return "PLACED";
}

function ensureSellerFulfillments(order) {
  if (!Array.isArray(order.sellerFulfillments)) order.sellerFulfillments = [];
  const existingSellers = new Set(order.sellerFulfillments.map((record) => String(record.seller)));
  const initialStatus = legacyStatus(order.status);

  for (const item of order.items || []) {
    const sellerId = item.seller?._id || item.seller;
    if (!sellerId || existingSellers.has(String(sellerId))) continue;
    order.sellerFulfillments.push({ seller: sellerId, status: initialStatus });
    existingSellers.add(String(sellerId));
  }

  return order.sellerFulfillments;
}

function getSellerFulfillment(order, sellerId) {
  const sellerKey = String(sellerId);
  const record = (order.sellerFulfillments || []).find((entry) => String(entry.seller?._id || entry.seller) === sellerKey);
  if (record) return record;
  return { seller: sellerId, status: legacyStatus(order.status) };
}

function syncAggregateOrderStatus(order) {
  const records = ensureSellerFulfillments(order);
  if (["CANCELLED", "REJECTED"].includes(order.status)) return order.status;
  if (!records.length) return order.status;

  const ranks = records
    .map((record) => SELLER_STAGE_ORDER.indexOf(record.status))
    .filter((rank) => rank >= 0);
  if (!ranks.length) return order.status;

  const nextStatus = SELLER_STAGE_ORDER[Math.min(...ranks)];
  order.status = nextStatus;
  order.deliveryUpdate = DELIVERY_UPDATES[nextStatus] || order.deliveryUpdate;
  return nextStatus;
}

module.exports = {
  SELLER_STAGE_ORDER,
  DELIVERY_UPDATES,
  ensureSellerFulfillments,
  getSellerFulfillment,
  syncAggregateOrderStatus,
};
