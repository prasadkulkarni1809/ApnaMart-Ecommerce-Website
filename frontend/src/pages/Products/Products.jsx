import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useSearchParams } from "react-router-dom";
import ProductCard from "../../components/Products/ProductCard";

function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sort, setSort] = useState("");
  const [categories, setCategories] = useState([]);
  const [searchParams] = useSearchParams();
  const searchTerm = (searchParams.get("search") || "").trim();
  const categoryId = (searchParams.get("category") || "").trim();
  const selectedCategory = categories.find((category) => category._id === categoryId);

  useEffect(() => {
    axios.get("http://localhost:3000/api/categories")
      .then((response) => setCategories(response.data.categories || []))
      .catch((categoryError) => console.error("CATEGORY FETCH ERROR:", categoryError));
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await axios.get(
          "http://localhost:3000/api/products",
          {
            params: {
              sort: sort,
              search: searchTerm || undefined,
              category: categoryId || undefined,
            },
          }
        );

        console.log("API RESPONSE:", response.data);

        setProducts(response.data.products);
      } catch (error) {
        console.error("PRODUCT FETCH ERROR:", error);

        setError("Failed to load products.");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [sort, searchTerm, categoryId]);

  const categoryNavigation = (
    <nav aria-label="Shop by category" className="mb-8 overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <div className="flex min-w-max items-stretch gap-1 p-2">
        <CategoryLink label="For You" icon="✨" active={!categoryId} to="/products" />
        {categories.map((category) => (
          <CategoryLink
            key={category._id}
            label={category.name}
            icon={getCategoryIcon(category.name)}
            active={category._id === categoryId}
            to={`/products?category=${category._id}`}
          />
        ))}
      </div>
    </nav>
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10">
        {categoryNavigation}
        <h1 className="text-3xl font-bold mb-8">{searchTerm ? `Searching for “${searchTerm}”` : "Products"}</h1>

        <p className="text-gray-500">
          Loading products...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10">
        {categoryNavigation}
        <h1 className="text-3xl font-bold mb-8">{searchTerm ? `Search results for “${searchTerm}”` : "Products"}</h1>

        <p className="text-red-500">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 sm:py-10">
      {categoryNavigation}
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">{searchTerm ? "Search results" : selectedCategory ? selectedCategory.name : "For You"}</h1>
          {searchTerm && <p className="mt-1 text-sm text-gray-500">Showing results for “{searchTerm}”</p>}
          {!searchTerm && !categoryId && <p className="mt-1 text-sm text-gray-500">Browse products from every category.</p>}
        </div>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
        >
          <option value="">Popular</option>
          <option value="price_low">
            Price: Low to High
          </option>
          <option value="price_high">
            Price: High to Low
          </option>
        </select>
      </div>

      {products.length ? (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
          <ProductCard
            key={product._id}
            product={product}
          />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-6 py-12 text-center">
          <h2 className="text-lg font-semibold text-gray-800">No products found</h2>
          <p className="mt-2 text-sm text-gray-500">Try another product name or search term.</p>
        </div>
      )}
    </div>
  );
}

function CategoryLink({ label, icon, active, to }) {
  return (
    <Link to={to} aria-current={active ? "page" : undefined} className={`flex min-w-[88px] flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 text-center text-xs font-medium transition sm:min-w-[104px] sm:text-sm ${active ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"}`}>
      <span className="text-xl sm:text-2xl" aria-hidden="true">{icon}</span>
      <span className="max-w-28 truncate">{label}</span>
    </Link>
  );
}

function getCategoryIcon(name = "") {
  const category = name.toLowerCase();
  if (category.includes("fashion")) return "🛍️";
  if (category.includes("electronic")) return "💻";
  if (category.includes("home")) return "🏠";
  if (category.includes("beauty")) return "✨";
  if (category.includes("sport")) return "⚽";
  if (category.includes("book")) return "📚";
  if (category.includes("toy")) return "🧸";
  if (category.includes("grocery")) return "🛒";
  if (category.includes("auto")) return "🚗";
  return "🏷️";
}

export default Products;
