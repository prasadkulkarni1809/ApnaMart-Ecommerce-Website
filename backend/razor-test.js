require("dotenv").config();
const Razorpay = require("razorpay");

console.log("🔑 KEY_ID:", process.env.RAZORPAY_KEY_ID);
console.log("🔑 KEY_SECRET:", process.env.RAZORPAY_KEY_SECRET);
console.log("📏 KEY_ID LENGTH:", process.env.RAZORPAY_KEY_ID?.length);
console.log("📏 KEY_SECRET LENGTH:", process.env.RAZORPAY_KEY_SECRET?.length);

const rzp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID.trim(),
  key_secret: process.env.RAZORPAY_KEY_SECRET.trim(),
});

(async () => {
  try {
    const order = await rzp.orders.create({
      amount: 50000, // ₹500
      currency: "INR",
    });
    console.log("✅ ORDER CREATED SUCCESSFULLY");
    console.log(order);
  } catch (err) {
    console.error("❌ RAZORPAY ERROR");
    console.error(err);
  }
})();
