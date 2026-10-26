import { useEffect, useState } from "react";
import axios from "axios";

function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    axios.get("http://localhost:3000/api/admin/categories", { withCredentials: true })
      .then(({ data }) => setCategories(data.categories || []))
      .catch(() => setError("Unable to load categories."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-7xl p-6 md:p-10">
      <p className="text-sm font-semibold uppercase tracking-wider text-blue-400">Catalog</p>
      <h1 className="mt-2 text-3xl font-bold">Manage Categories</h1>
      <p className="mt-2 text-slate-400">Review categories currently available in the store.</p>
      <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        {loading ? <p className="text-slate-400">Loading categories…</p> : null}
        {error ? <p role="alert" className="text-red-300">{error}</p> : null}
        {!loading && !error && categories.length === 0 ? <p className="text-slate-400">No categories found.</p> : null}
        {!loading && !error && categories.length > 0 && <ul className="divide-y divide-slate-800">{categories.map((category) => <li key={category._id} className="flex items-center justify-between gap-3 py-4"><span className="font-medium">{category.name}</span><span className="text-xs text-slate-500">{category.active ? "Active" : "Inactive"}</span></li>)}</ul>}
      </div>
    </div>
  );
}

export default AdminCategories;
