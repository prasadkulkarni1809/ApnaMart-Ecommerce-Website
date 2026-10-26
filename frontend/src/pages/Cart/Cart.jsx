import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useCart } from "../../context/CartContext";

function Cart() {
  const { refreshCartCount } = useCart();
  const [cartItems, setCartItems] = useState([]);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");

  const fetchCart = useCallback(async () => {
    try {
      setError("");

      const response = await axios.get(
        "http://localhost:3000/api/cart",
        {
          withCredentials: true,
        }
      );

      setCartItems(response.data.cartItems);
      setTotals(response.data.totals);
      await refreshCartCount();

    } catch (error) {
      console.error("CART FETCH ERROR:", error);

      setError("Failed to load cart.");
    }
  }, [refreshCartCount]);

  useEffect(() => {
    const loadCart = async () => {
      setLoading(true);
      await fetchCart();
      setLoading(false);
    };

    void loadCart();
  }, [fetchCart]);

  const updateQuantity = async (productId, action) => {
    try {
      setActionLoading(productId);

      await axios.post(
        `http://localhost:3000/api/cart/${action}/${productId}`,
        {},
        {
          withCredentials: true,
        }
      );

      await fetchCart();

    } catch (error) {
      console.error("CART UPDATE ERROR:", error);

      alert(
        error.response?.data?.message ||
          "Failed to update cart"
      );

    } finally {
      setActionLoading("");
    }
  };

  const removeItem = async (productId) => {
    try {
      setActionLoading(productId);

      await axios.delete(
        `http://localhost:3000/api/cart/remove/${productId}`,
        {
          withCredentials: true,
        }
      );

      await fetchCart();

    } catch (error) {
      console.error("REMOVE CART ERROR:", error);

      alert(
        error.response?.data?.message ||
          "Failed to remove product"
      );

    } finally {
      setActionLoading("");
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold">
          Your Cart
        </h1>

        <p className="mt-4 text-gray-500">
          Loading cart...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold">
          Your Cart
        </h1>

        <p className="mt-4 text-red-500">
          {error}
        </p>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center">

        <div className="text-6xl mb-5">
          🛒
        </div>

        <h1 className="text-3xl font-bold text-gray-900">
          Your Cart is Empty
        </h1>

        <p className="text-gray-500 mt-3">
          Looks like you haven't added anything yet.
        </p>

      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">

      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Your Cart
        </h1>

        <p className="text-gray-500 mt-1">
          {cartItems.length}{" "}
          {cartItems.length === 1 ? "item" : "items"} in your cart
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* CART ITEMS */}
        <div className="lg:col-span-2 space-y-4">

          {cartItems.map((item) => (

            <div
              key={item._id}
              className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition"
            >

              <div className="flex gap-5">

                {/* IMAGE */}
                <div className="w-32 h-32 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">

                  {item.images?.[0] ? (
                    <img
                      src={item.images[0]}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No Image
                    </div>
                  )}

                </div>

                {/* PRODUCT INFO */}
                <div className="flex-1 min-w-0">

                  <div className="flex justify-between gap-4">

                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {item.name}
                      </h2>

                      <p className="text-xl font-bold mt-2">
                        ₹ {item.price}
                      </p>

                      {item.discount > 0 && (
                        <span className="inline-block mt-2 px-2.5 py-1 rounded-md bg-green-100 text-green-700 text-xs font-semibold dark:bg-green-950 dark:text-green-300">
                          {item.discount}% OFF
                        </span>
                      )}
                    </div>

                    {/* REMOVE */}
                    <button
                      onClick={() => removeItem(item._id)}
                      disabled={actionLoading === item._id}
                      className="text-gray-400 hover:text-red-500 transition text-sm font-medium"
                    >
                      🗑 Remove
                    </button>

                  </div>

                  {/* QUANTITY */}
                  <div className="mt-5 flex items-center gap-3">

                    <span className="text-sm text-gray-500">
                      Quantity
                    </span>

                    <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">

                      <button
                        onClick={() =>
                          updateQuantity(item._id, "decrease")
                        }
                        disabled={actionLoading === item._id}
                        className="w-9 h-9 flex items-center justify-center text-lg font-semibold hover:bg-gray-100 transition disabled:opacity-50"
                      >
                        −
                      </button>

                      <span className="w-10 h-9 flex items-center justify-center border-x border-gray-300 text-sm font-semibold">
                        {actionLoading === item._id
                          ? "..."
                          : item.quantity}
                      </span>

                      <button
                        onClick={() =>
                          updateQuantity(item._id, "increase")
                        }
                        disabled={actionLoading === item._id}
                        className="w-9 h-9 flex items-center justify-center text-lg font-semibold hover:bg-gray-100 transition disabled:opacity-50"
                      >
                        +
                      </button>

                    </div>

                  </div>

                </div>

              </div>

            </div>

          ))}

        </div>

        {/* PRICE SUMMARY */}
        {totals && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 h-fit lg:sticky lg:top-6">

            <h2 className="text-xl font-bold mb-6">
              Price Details
            </h2>

            <div className="space-y-4 text-sm">

              <div className="flex justify-between">
                <span className="text-gray-600">
                  MRP
                </span>

                <span className="font-medium">
                  ₹ {totals.mrp}
                </span>
              </div>

              <div className="flex justify-between text-green-600 dark:text-green-400">
                <span>
                  Discount
                </span>

                <span>
                  - ₹ {totals.discount}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">
                  Platform Fee
                </span>

                <span>
                  ₹ {totals.platformFee}
                </span>
              </div>

              <div className="border-t pt-4 flex justify-between items-center">

                <span className="text-lg font-bold">
                  Total
                </span>

                <span className="text-xl font-bold">
                  ₹ {totals.final}
                </span>

              </div>

            </div>

            <Link
              to="/checkout"
              className="block w-full mt-6 text-center bg-slate-900 text-white py-3.5 rounded-xl font-semibold hover:bg-slate-800 transition"
            >
              Proceed to Checkout
            </Link>

          </div>
        )}

      </div>

    </div>
  );
}

export default Cart;
