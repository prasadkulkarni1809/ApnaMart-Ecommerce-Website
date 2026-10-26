const mongoose = require("mongoose");

const sellerFulfillmentSchema = new mongoose.Schema({
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "owner",
        required: true,
    },
    status: {
        type: String,
        enum: ["PLACED", "ACCEPTED", "PACKED", "READY_TO_DISPATCH", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "REJECTED", "CANCELLED"],
        default: "PLACED",
    },
    acceptedAt: Date,
    packedAt: Date,
    readyAt: Date,
    shippedAt: Date,
    expectedDeliveryDate: Date,
    courierHandoverAt: Date,
    outForDeliveryAt: Date,
    deliveredAt: Date,
    securePackingConfirmed: { type: Boolean, default: false },
    shippingLabelAttached: { type: Boolean, default: false },
    courierPartner: { type: String, default: "", trim: true, maxlength: 100 },
    trackingNumber: { type: String, default: "", trim: true, maxlength: 100 },
}, { _id: false });

const orderSchema = new mongoose.Schema(
{
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },

    items: [
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "product",
                required: true
            },

            seller: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "owner",
                required: true
            },

            name: {
                type: String,
                default: ""
            },

            image: {
                type: String,
                default: ""
            },

            quantity: {
                type: Number,
                required: true
            },

            price: {
                type: Number,
                required: true
            }
        }
    ],

    address: {
        type: String,
        required: true
    },

    city: {
        type: String,
        required: true
    },

    pincode: {
        type: String,
        required: true
    },

    phone: {
        type: String,
        required: true
    },

    paymentMethod: {
        type: String,
        enum: ["COD", "ONLINE"],
        required: true
    },

    paymentStatus: {
        type: String,
        enum: ["PENDING", "CREATED", "PAID", "FAILED", "REFUNDED"],
        default: "PENDING"
    },

    amount: {
        type: Number,
        required: true
    },

    inventoryReserved: {
        type: Boolean,
        default: false
    },

    razorpay: {
        orderId: String,
        paymentId: String,
        signature: String
    },

    status: {
        type: String,
        enum: [
            "PLACED",
            "ACCEPTED",
            "REJECTED",
            "PACKED",
            "READY_TO_DISPATCH",
            "SHIPPED",
            "OUT_FOR_DELIVERY",
            "DELIVERED",
            "CANCELLED"
        ],
        default: "PLACED"
    },

    deliveryUpdate: {
        type: String,
        default: "Order Placed"
    },

    trackingNumber: {
        type: String,
        default: ""
    },

    courierPartner: {
        type: String,
        default: ""
    },

    expectedDeliveryDate: {
        type: Date
    },

    exchangeRequested: {
        type: Boolean,
        default: false
    },

    exchangeReason: {
        type: String,
        default: ""
    },

    exchangeStatus: {
        type: String,
        enum: [
            "NONE",
            "REQUESTED",
            "APPROVED",
            "REJECTED",
            "COMPLETED"
        ],
        default: "NONE"
    },

    cancellationReason: {
        type: String,
        default: ""
    },

    sellerNote: {
        type: String,
        default: ""
    },

    sellerFulfillments: {
        type: [sellerFulfillmentSchema],
        default: [],
    }
},
{
    timestamps: true,
    optimisticConcurrency: true,
}
);

module.exports = mongoose.model("order", orderSchema);
