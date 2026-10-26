import { useEffect, useState } from "react";
import axios from "axios";
import API_BASE_URL from "../../config/api";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Toast from "../../components/common/Toast";
import { useAuth } from "../../context/AuthContext";

function Wishlist() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState(null);
  const [addingId, setAddingId] = useState(null);
  const [toast, setToast] = useState(null);

  const handleAddToCart = async (product) => {
    if (authLoading) return;
    if (!user) {
      navigate("/login", { state: { from: `${location.pathname}${location.search}` } });
      return;
    }
    try {
      setAddingId(product._id);

      const response = await axios.post(
        `${API_BASE_URL}/api/cart/add`,
        {
          productId: product._id,
          quantity: 1,
        },
        {
          withCredentials: true,
        }
      );

      setToast({
        type: "success",
        message: response.data.message || "Added to cart",
      });

      setTimeout(() => {
        setToast(null);
      }, 3000);
    } catch (error) {
      console.error("WISHLIST ADD TO CART ERROR:", error);

      setToast({
        type: "error",
        message:
          error.response?.data?.message ||
          "Failed to add product to cart",
      });

      setTimeout(() => {
        setToast(null);
      }, 3000);
    } finally {
      setAddingId(null);
    }
  };

  const handleRemove = async (productId) => {
    try {
      setRemovingId(productId);

      const response = await axios.post(
        `${API_BASE_URL}/api/wishlist/toggle`,
        { productId },
        { withCredentials: true }
      );

      if (response.data.success && !response.data.wishlisted) {
        setWishlistItems((prev) =>
          prev.filter((item) => item._id !== productId)
        );

        setToast({
          type: "success",
          message: "Removed from your wishlist",
        });

        setTimeout(() => {
          setToast(null);
        }, 3000);
      }
    } catch (error) {
      console.error("REMOVE WISHLIST ERROR:", error);

      setToast({
        type: "error",
        message:
          error.response?.data?.message ||
          "Failed to remove item",
      });

      setTimeout(() => {
        setToast(null);
      }, 3000);
    } finally {
      setRemovingId(null);
    }
  };

  useEffect(() => {
    const fetchWishlist = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await axios.get(
          `${API_BASE_URL}/api/wishlist`,
          {
            withCredentials: true,
          }
        );

        setWishlistItems(response.data.wishlistItems || []);
      } catch (error) {
        console.error("WISHLIST FETCH ERROR:", error);

        setError(
          error.response?.data?.message ||
            "Unable to load your wishlist."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchWishlist();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto mb-4"></div>

          <p className="text-gray-500">
            Loading your wishlist...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-5xl mb-4">⚠️</div>

          <h2 className="text-xl font-semibold text-gray-900">
            Something went wrong
          </h2>

          <p className="text-gray-500 mt-2">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (wishlistItems.length === 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto rounded-full bg-gray-100 flex items-center justify-center text-4xl mb-6">
            ♡
          </div>

          <h1 className="text-3xl font-semibold text-gray-900">
            Your wishlist is empty
          </h1>

          <p className="text-gray-500 mt-3">
            Save products you love and come back to them anytime.
          </p>

          <Link
            to="/products"
            className="inline-flex mt-7 px-6 py-3 rounded-xl bg-black text-white font-medium hover:bg-gray-800 transition"
          >
            Explore Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <section className="min-h-screen bg-gray-50 px-5 md:px-10 lg:px-16 py-10">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">
              Saved for later
            </p>

            <h1 className="text-4xl md:text-5xl font-semibold text-gray-900 mt-2">
              My Wishlist
            </h1>

            <p className="text-gray-500 mt-3">
              {wishlistItems.length}{" "}
              {wishlistItems.length === 1
                ? "item"
                : "items"}{" "}
              saved
            </p>
          </div>

          <div className="hidden sm:flex items-center justify-center w-12 h-12 rounded-full bg-white border border-gray-200 text-2xl">
            ♡
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {wishlistItems.map((product) => {
          const discountedPrice =
            product.price -
            (product.price * product.discount) / 100;

          return (
            <div
              key={product._id}
              className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              {/* Image */}
              <Link to={`/products/${product._id}`}>
                <div className="relative aspect-square bg-gray-100 overflow-hidden">
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-contain p-6 group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No Image
                    </div>
                  )}

                  {/* Wishlist badge */}
                  <div className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center text-red-500 shadow-sm">
                    ♥
                  </div>

                  {/* Discount */}
                  {product.discount > 0 && (
                    <span className="absolute left-4 top-4 px-2.5 py-1 rounded-full bg-black text-white text-xs font-medium">
                      {product.discount}% OFF
                    </span>
                  )}

                  {/* Out of stock */}
                  {product.stock <= 0 && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                      <span className="px-4 py-2 bg-red-500 text-white rounded-full text-sm font-medium">
                        Out of Stock
                      </span>
                    </div>
                  )}
                </div>
              </Link>

              {/* Details */}
              <div className="p-5">
                <Link to={`/products/${product._id}`}>
                  <h2 className="font-semibold text-gray-900 truncate hover:text-gray-600 transition">
                    {product.name}
                  </h2>
                </Link>

                <div className="flex items-center gap-2 mt-3">
                  <span className="text-lg font-bold text-gray-900">
                    ₹{Math.round(discountedPrice)}
                  </span>

                  {product.discount > 0 && (
                    <span className="text-sm text-gray-400 line-through">
                      ₹{product.price}
                    </span>
                  )}
                </div>

                {/* Actions — we'll wire these next */}
                <div className="flex gap-2 mt-5">
                  <button
                    onClick={() => handleAddToCart(product)}
                    disabled={
                      product.stock <= 0 || addingId === product._id || authLoading
                    }
                    className="flex-1 py-2.5 rounded-xl bg-black text-white text-sm font-medium hover:bg-gray-800 transition disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    {addingId === product._id
                      ? "Adding..."
                      : product.stock <= 0
                      ? "Out of Stock"
                      : "Add to Cart"}
                  </button>

                  <button
                    onClick={() => handleRemove(product._id)}
                    disabled={removingId === product._id}
                    className="w-11 rounded-xl border border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-500 transition disabled:opacity-50"
                    title="Remove from wishlist"
                  >
                    {removingId === product._id ? "..." : "×"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </section>
  );
}

export default Wishlist;
