import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import Toast from "../../components/common/Toast";

function ProductDetails() {
  const { id } = useParams();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentImage, setCurrentImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const { refreshCartCount } = useCart();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [addingToCart, setAddingToCart] = useState(false);
  const [toast, setToast] = useState(null);

  const handleAddToCart = async () => {
    if (authLoading) return;
    if (!user) {
      navigate("/login", { state: { from: `${location.pathname}${location.search}` } });
      return;
    }
    try {
      setAddingToCart(true);
      const response = await axios.post(
        "http://localhost:3000/api/cart/add",
        {
          productId: product._id,
          quantity,
        },
        {
          withCredentials: true,
        }
      );

      console.log("ADD TO CART:", response.data);
      await refreshCartCount();
      setToast({
        type: "success",
        message: `${product.name} has been added to your cart.`,
      });
    } catch (addError) {
      console.error("ADD TO CART ERROR:", addError);
      setToast({
        type: "error",
        message:
          addError.response?.data?.message ||
          "Failed to add product to cart",
      });
    } finally {
      setAddingToCart(false);
    }
  };

  const handleWishlist = async () => {
    try {
      setWishlistLoading(true);

      const response = await axios.post(
        "http://localhost:3000/api/wishlist/toggle",
        {
          productId: product._id,
        },
        {
          withCredentials: true,
        }
      );

      console.log("WISHLIST:", response.data);
      setWishlisted(response.data.wishlisted);
      setToast({
        type: "success",
        title: "Wishlist updated",
        message: response.data.message,
      });
    } catch (wishlistError) {
      console.error("WISHLIST ERROR:", wishlistError);
      setToast({
        type: "error",
        message:
          wishlistError.response?.data?.message ||
          "Failed to update wishlist",
      });
    } finally {
      setWishlistLoading(false);
    }
  };

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setToast(null);
    }, 3000);

    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await axios.get(
          `http://localhost:3000/api/products/${id}`
        );

        console.log("PRODUCT DETAILS:", response.data);

        setProduct(response.data.product);

      } catch (error) {
        console.error("PRODUCT DETAILS ERROR:", error);

        setError(
          error.response?.data?.message ||
          "Failed to load product."
        );

      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  useEffect(() => {
    if (!product?._id) return;

    const checkWishlist = async () => {
      try {
        const response = await axios.get(
          `http://localhost:3000/api/wishlist/status/${product._id}`,
          {
            withCredentials: true,
          }
        );

        setWishlisted(response.data.wishlisted);
      } catch (wishlistError) {
        console.error("WISHLIST STATUS ERROR:", wishlistError);
      }
    };

    checkWishlist();
  }, [product]);

  // =========================
  // AUTO IMAGE SLIDER
  // =========================
  useEffect(() => {
    if (!product?.images || product.images.length <= 1) {
      return;
    }

    const interval = setInterval(() => {
      setCurrentImage((prev) =>
        prev === product.images.length - 1
          ? 0
          : prev + 1
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [product]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-16">
        <p className="text-gray-500">
          Loading product...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-16">
        <p className="text-red-500">
          {error}
        </p>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">

      <p className="text-sm text-gray-500 mb-8">
        Products / {product.category?.name}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

        {/* =========================
            PRODUCT IMAGE GALLERY
        ========================= */}
        <div className="flex gap-4">
          {/* THUMBNAILS */}
          <div className="flex flex-col gap-3">
            {product.images?.map((image, index) => (
              <button
                key={index}
                onClick={() => setCurrentImage(index)}
                className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all duration-300 ${
                  currentImage === index
                    ? "border-slate-900 scale-105"
                    : "border-gray-200 hover:border-gray-400"
                }`}
              >
                <img
                  src={image}
                  alt={`${product.name} ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>

          {/* MAIN IMAGE */}
          <div className="relative flex-1">
            <div className="relative h-[460px] bg-gray-100 rounded-3xl overflow-hidden">
              {product.images?.length > 0 ? (
                <img
                  key={currentImage}
                  src={product.images[currentImage]}
                  alt={product.name}
                  className="w-full h-full object-contain transition-opacity duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No Image
                </div>
              )}

              {/* PREVIOUS BUTTON */}
              {product.images?.length > 1 && (
                <button
                  onClick={() =>
                    setCurrentImage((prev) =>
                      prev === 0
                        ? product.images.length - 1
                        : prev - 1
                    )
                  }
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 backdrop-blur shadow-lg flex items-center justify-center text-xl hover:bg-white hover:scale-110 transition"
                  aria-label="Previous image"
                >
                  ←
                </button>
              )}

              {/* NEXT BUTTON */}
              {product.images?.length > 1 && (
                <button
                  onClick={() =>
                    setCurrentImage((prev) =>
                      prev === product.images.length - 1
                        ? 0
                        : prev + 1
                    )
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 backdrop-blur shadow-lg flex items-center justify-center text-xl hover:bg-white hover:scale-110 transition"
                  aria-label="Next image"
                >
                  →
                </button>
              )}

              {/* IMAGE COUNTER */}
              {product.images?.length > 1 && (
                <div className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full bg-black/70 text-white text-xs font-medium backdrop-blur">
                  {currentImage + 1} / {product.images.length}
                </div>
              )}
            </div>

            {/* SLIDER DOTS */}
            {product.images?.length > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                {product.images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImage(index)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      currentImage === index
                        ? "w-7 bg-slate-900"
                        : "w-2 bg-gray-300"
                    }`}
                    aria-label={`Show image ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* PRODUCT INFORMATION */}
        <div className="flex flex-col justify-center">

          <p className="text-sm uppercase tracking-widest text-gray-500">
            {product.category?.name}
          </p>

          <h1 className="text-4xl font-bold mt-3 text-gray-900">
            {product.name}
          </h1>

          <div className="flex items-center gap-3 mt-5">

            <span className="text-3xl font-bold">
              ₹ {product.price}
            </span>

            {product.discount > 0 && (
              <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-semibold">
                {product.discount}% OFF
              </span>
            )}

          </div>

          {/* =========================
              STOCK STATUS
          ========================= */}
          <div className="mt-7">
            {product.stock > 0 ? (
              <div className="rounded-2xl border border-green-200 bg-green-50/70 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500"></span>
                    </span>
                    <span className="font-semibold text-green-800">In Stock</span>
                  </div>
                  <span className="text-sm font-medium text-green-700">
                    {product.stock} available
                  </span>
                </div>

                {product.stock <= 10 && (
                  <p className="mt-3 text-sm font-medium text-orange-600">
                    🔥 Only {product.stock} left — order soon
                  </p>
                )}

                <div className="mt-4">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-green-200">
                    <div
                      className="h-full rounded-full bg-green-500 transition-all duration-500"
                      style={{
                        width: `${Math.min((product.stock / 20) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-green-700">
                    Limited availability
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full bg-red-500"></span>
                  <span className="font-semibold text-red-700">Out of Stock</span>
                </div>
                <p className="mt-2 text-sm text-red-600">
                  This product is currently unavailable.
                </p>
              </div>
            )}
          </div>

          {/* =========================
              QUANTITY SELECTOR
          ========================= */}
          {product.stock > 0 && (
            <div className="mt-7 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Quantity</p>
                <p className="text-xs text-gray-400 mt-1">
                  Maximum {product.stock} units
                </p>
              </div>

              <div className="flex items-center overflow-hidden rounded-xl border border-gray-300">
                <button
                  type="button"
                  onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                  disabled={quantity <= 1}
                  className="flex h-11 w-11 items-center justify-center text-xl hover:bg-gray-100 transition disabled:cursor-not-allowed disabled:opacity-30"
                >
                  −
                </button>
                <div className="flex h-11 w-14 items-center justify-center border-x border-gray-300 font-semibold">
                  {quantity}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setQuantity((prev) => Math.min(product.stock, prev + 1))
                  }
                  disabled={quantity >= product.stock}
                  className="flex h-11 w-11 items-center justify-center text-xl hover:bg-gray-100 transition disabled:cursor-not-allowed disabled:opacity-30"
                >
                  +
                </button>
              </div>
            </div>
          )}

          <div className="mt-8 h-px bg-gray-200" />

          <p className="text-gray-500 mt-6">
            Premium product designed for everyday use.
            Explore the details and add it to your cart.
          </p>

          {/* ACTIONS */}

          <div className="mt-8 flex gap-4">

            <button
              onClick={handleAddToCart}
              disabled={product.stock <= 0 || addingToCart || authLoading}
              className={`flex-1 rounded-xl py-4 font-semibold transition ${
                product.stock > 0
                  ? "bg-slate-900 text-white hover:bg-slate-800"
                  : "cursor-not-allowed bg-gray-200 text-gray-400"
              }`}
            >
              {product.stock <= 0
                ? "Out of Stock"
                : addingToCart
                  ? "Adding..."
                  : "🛒 Add to Cart"}
            </button>

            <button
              onClick={handleWishlist}
              disabled={wishlistLoading}
              aria-label={
                wishlisted
                  ? "Remove from wishlist"
                  : "Add to wishlist"
              }
              className={`group flex h-14 w-14 items-center justify-center rounded-xl border transition-all duration-300 ${
                wishlisted
                  ? "border-red-200 bg-red-50"
                  : "border-gray-300 bg-white hover:bg-gray-50"
              }`}
            >
              <span
                className={`text-2xl transition-all duration-300 ${
                  wishlisted
                    ? "scale-110 text-red-500"
                    : "text-gray-700 group-hover:scale-110"
                }`}
              >
                {wishlisted ? "♥" : "♡"}
              </span>
            </button>

          </div>

          <button
            className="mt-4 w-full border border-slate-900 text-slate-900 py-4 rounded-xl font-semibold hover:bg-slate-900 hover:text-white transition"
          >
            ⚡ Buy Now
          </button>

        </div>

      </div>

      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

    </div>
  );
}

export default ProductDetails;
