import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");

  useEffect(() => {
    let active = true;
    const loadProducts = async () => {
      try {
        const { data } = await axios.get("http://localhost:3000/api/admin/products", { withCredentials: true });
        if (active) setProducts(data.products || []);
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || "Unable to load products.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadProducts();
    return () => { active = false; };
  }, []);

  const deleteProduct = async (productId) => {
    if (!window.confirm("Delete this product?")) return;
    setDeletingId(productId);
    setError("");
    try {
      await axios.delete(`http://localhost:3000/api/admin/products/${productId}`, { withCredentials: true });
      setProducts((current) => current.filter((product) => product._id !== productId));
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to delete product.");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-6 md:p-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-400">Catalog</p>
          <h1 className="mt-2 text-3xl font-bold">Manage Products</h1>
          <p className="mt-2 text-slate-400">Review marketplace products across all sellers.</p>
        </div>
        <Link to="/admin/products/create" className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">Add product</Link>
      </div>
      {error && <p role="alert" className="mt-6 rounded-xl border border-red-900 bg-red-950/50 p-4 text-red-300">{error}</p>}
      <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-800">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="bg-slate-900 text-slate-300"><tr><th className="px-5 py-4">Product</th><th className="px-5 py-4">Category</th><th className="px-5 py-4">Price</th><th className="px-5 py-4">Stock</th><th className="px-5 py-4">Actions</th></tr></thead>
          <tbody className="divide-y divide-slate-800 bg-slate-950">
            {loading && <tr><td colSpan="5" className="px-5 py-8 text-center text-slate-400">Loading products…</td></tr>}
            {!loading && products.length === 0 && <tr><td colSpan="5" className="px-5 py-8 text-center text-slate-400">No products found.</td></tr>}
            {!loading && products.map((product) => (
              <tr key={product._id}>
                <td className="px-5 py-4"><div className="flex items-center gap-3"><img src={product.images?.[0] || ""} alt="" className="h-12 w-12 rounded-lg bg-slate-800 object-cover" /><span className="font-medium">{product.name}</span></div></td>
                <td className="px-5 py-4 text-slate-300">{product.category?.name || "—"}</td>
                <td className="px-5 py-4">₹{Number(product.price || 0).toLocaleString("en-IN")}</td>
                <td className="px-5 py-4 text-slate-300">{product.stock ?? 0}</td>
                <td className="px-5 py-4"><button type="button" disabled={deletingId === product._id} onClick={() => deleteProduct(product._id)} className="font-medium text-red-300 hover:text-red-200 disabled:opacity-50">{deletingId === product._id ? "Deleting…" : "Delete"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminProducts;
