import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

function Checkout() {
  const [cart, setCart] = useState([]);
  const [totals, setTotals] = useState(null);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    address: "",
    city: "",
    pincode: "",
    phone: "",
    paymentMethod: "COD",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCart = async () => {
      try {
        const [cartResponse, accountResponse] = await Promise.all([
          axios.get("http://localhost:3000/api/cart", {
            withCredentials: true,
          }),
          axios.get("http://localhost:3000/api/account", {
            withCredentials: true,
            headers: { "X-Client": "react" },
          }),
        ]);

        setCart(cartResponse.data.cartItems || []);
        setTotals(cartResponse.data.totals || null);

        const addresses = accountResponse.data.addresses || [];
        setSavedAddresses(addresses);
        const initialAddress = addresses.find((address) => address.isDefault) || addresses[0];
        if (initialAddress) {
          setSelectedAddressId(initialAddress._id);
          setForm((current) => ({
            ...current,
            address: initialAddress.address || "",
            city: initialAddress.city || "",
            pincode: initialAddress.pincode || "",
            phone: initialAddress.phone || "",
          }));
        }
      } catch (err) {
        console.error("CHECKOUT CART ERROR:", err);
        setError("Unable to load your cart.");
      } finally {
        setLoading(false);
      }
    };

    fetchCart();
  }, []);

  const handleChange = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
    if (["address", "city", "pincode", "phone"].includes(event.target.name)) {
      setSelectedAddressId("");
    }
  };

  const handleSavedAddressChange = (event) => {
    const addressId = event.target.value;
    setSelectedAddressId(addressId);
    const address = savedAddresses.find((item) => item._id === addressId);
    if (!address) {
      setForm((current) => ({
        ...current,
        address: "",
        city: "",
        pincode: "",
        phone: "",
      }));
      return;
    }

    setForm((current) => ({
      ...current,
      address: address.address || "",
      city: address.city || "",
      pincode: address.pincode || "",
      phone: address.phone || "",
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (
      !form.address.trim() ||
      !form.city.trim() ||
      !form.pincode.trim() ||
      !form.phone.trim()
    ) {
      setError("Please fill in all delivery details.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      console.info("CHECKOUT SUBMIT:", {
        paymentMethod: form.paymentMethod,
      });
      const response = await axios.post(
        "http://localhost:3000/checkout",
        form,
        {
          withCredentials: true,
          headers: { "X-Client": "react" },
        }
      );

      const data = response.data;
      console.info("CHECKOUT RESPONSE:", {
        status: response.status,
        success: data.success,
        orderId: data.orderId,
        paymentRequired: data.paymentRequired,
        paymentUrl: data.paymentUrl,
      });

      if (!data.success) {
        setError(data.message || "Checkout failed.");
        return;
      }

      if (data.paymentRequired) {
        window.location.href = `http://localhost:3000${data.paymentUrl}`;
        return;
      }

      window.location.href = "/order-success";
    } catch (err) {
      console.error("CHECKOUT ERROR:", {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
      });
      setError(
        err.response?.data?.message || "Unable to place your order."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  if (!cart.length) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-6xl mb-5">🛒</div>
          <h1 className="text-3xl font-semibold">Your cart is empty</h1>
          <p className="text-gray-500 mt-2">
            Add something to your cart before checking out.
          </p>
          <Link
            to="/products"
            className="inline-block mt-6 px-6 py-3 bg-black text-white rounded-xl"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <section className="min-h-screen bg-gray-50 px-5 md:px-10 lg:px-16 py-10">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <p className="text-sm uppercase tracking-wider text-gray-500">
            Secure checkout
          </p>
          <h1 className="text-4xl font-semibold mt-2">Checkout</h1>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid lg:grid-cols-[1fr_400px] gap-8">
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-xl font-semibold">Delivery Details</h2>
              <div className="mt-6 space-y-4">
                {savedAddresses.length > 0 ? (
                  <div>
                    <label className="mb-2 block text-sm font-medium">Use a saved address</label>
                    <select
                      value={selectedAddressId}
                      onChange={handleSavedAddressChange}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-black"
                    >
                      <option value="">Enter a different address</option>
                      {savedAddresses.map((address) => (
                        <option key={address._id} value={address._id}>
                          {address.label || "Address"}{address.isDefault ? " (Default)" : ""} — {address.address}, {address.city}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
                    Have a saved address? <Link to="/account" className="font-medium underline">Add one in My Account</Link> for faster checkout.
                  </p>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2">Address</label>
                  <textarea
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    rows="3"
                    placeholder="House no., street, area"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black resize-none"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">City</label>
                    <input
                      name="city"
                      value={form.city}
                      onChange={handleChange}
                      placeholder="City"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Pincode</label>
                    <input
                      name="pincode"
                      value={form.pincode}
                      onChange={handleChange}
                      placeholder="Pincode"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Phone</label>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="10-digit mobile number"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-xl font-semibold">Payment Method</h2>
              <div className="mt-5 space-y-3">
                <label className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 cursor-pointer hover:border-black transition">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="COD"
                    checked={form.paymentMethod === "COD"}
                    onChange={handleChange}
                  />
                  <div>
                    <p className="font-medium">Cash on Delivery</p>
                    <p className="text-sm text-gray-500">Pay when your order arrives</p>
                  </div>
                </label>
                <label className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 cursor-pointer hover:border-black transition">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="ONLINE"
                    checked={form.paymentMethod === "ONLINE"}
                    onChange={handleChange}
                  />
                  <div>
                    <p className="font-medium">Online Payment</p>
                    <p className="text-sm text-gray-500">Pay securely using Razorpay</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="lg:sticky lg:top-6 h-fit">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="text-xl font-semibold">Order Summary</h2>
              <div className="mt-5 space-y-4">
                {cart.map((item) => (
                  <div key={item._id} className="flex gap-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                      {item.images?.[0] && (
                        <img
                          src={item.images[0]}
                          alt={item.name}
                          className="w-full h-full object-contain"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.name}</p>
                      <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-medium">
                      ₹{Math.round(
                        (item.price - (item.price * item.discount) / 100) * item.quantity
                      )}
                    </p>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 my-6" />
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">MRP</span>
                  <span>₹{totals?.mrp || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Discount</span>
                  <span className="text-green-600 dark:text-green-400">-₹{Math.round(totals?.discount || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Platform Fee</span>
                  <span>₹{totals?.platformFee || 20}</span>
                </div>
                <div className="border-t border-gray-100 pt-4 flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>₹{totals?.final || 0}</span>
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-6 py-3.5 rounded-xl bg-black text-white font-medium hover:bg-gray-800 transition disabled:bg-gray-300"
              >
                {submitting
                  ? "Processing..."
                  : form.paymentMethod === "ONLINE"
                  ? "Continue to Payment"
                  : "Place Order"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}

export default Checkout;
