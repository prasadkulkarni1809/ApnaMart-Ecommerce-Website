import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";

function ProductCard({ product }) {
  const mainImage = product.images?.[0];
  const { addToCart } = useCart();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [adding, setAdding] = useState(false);

  const handleAddToCart = async () => {
    if (authLoading) return;
    if (!user) {
      navigate("/login", { state: { from: `${location.pathname}${location.search}` } });
      return;
    }
    try {
      setAdding(true);
      await addToCart(product._id);
    } catch (error) {
      console.error("ADD TO CART ERROR:", error);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">

      <Link to={`/products/${product._id}`} className="block">
        <div className="h-56 w-full bg-stone-100">
          {mainImage ? (
            <img
              src={mainImage}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No Image
            </div>
          )}
        </div>

        <div className="px-4 py-4 bg-slate-950 text-white">
          <h2 className="text-sm font-semibold uppercase">
            {product.name}
          </h2>

          <p className="text-sm mt-1">
            ₹ {product.price}
          </p>
        </div>

        <div className={`flex min-h-[52px] items-center justify-center gap-2 border-y px-4 py-3 text-center text-sm ${product.discount > 0
          ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
          : "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        }`}>
          {product.discount > 0 ? (
            <>
              <span aria-hidden="true">🎉</span>
              <span><strong className="font-bold">{product.discount}% OFF</strong> <span className="font-medium">available</span></span>
            </>
          ) : (
            <>
              <span aria-hidden="true">🏷️</span>
              <span className="font-medium">Regular price</span>
            </>
          )}
        </div>
      </Link>

      <div className="p-4">
        <button
          onClick={handleAddToCart}
          disabled={adding || authLoading}
          className="w-full bg-slate-900 text-white py-3 rounded-lg font-semibold hover:bg-slate-800 transition disabled:opacity-60"
        >
          {adding ? "Adding..." : "🛒 Add to Cart"}
        </button>
      </div>

    </div>
  );
}

export default ProductCard;
