import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";

function Register() {
  const [form, setForm] = useState({ fullname: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();
  const { refreshCartCount } = useCart();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await axios.post(
        "http://localhost:3000/users/register",
        form,
        { withCredentials: true, headers: { "X-Client": "react" } }
      );
      if (!response.data?.success) {
        setError(response.data?.message || "Unable to create your account.");
        return;
      }
      await refreshAuth();
      await refreshCartCount();
      navigate("/products", { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center bg-gray-50 px-5 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg sm:p-10">
        <h1 className="text-center text-3xl font-bold text-gray-900">Create your account</h1>
        <p className="mt-2 text-center text-gray-500">Join us and start shopping.</p>
        {error && <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <div>
            <label htmlFor="register-name" className="mb-2 block text-sm font-medium text-gray-700">Full name</label>
            <input id="register-name" autoComplete="name" value={form.fullname} required
              onChange={(event) => setForm({ ...form, fullname: event.target.value })}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10" />
          </div>
          <div>
            <label htmlFor="register-email" className="mb-2 block text-sm font-medium text-gray-700">Email</label>
            <input id="register-email" type="email" autoComplete="email" value={form.email} required
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10" />
          </div>
          <div>
            <label htmlFor="register-password" className="mb-2 block text-sm font-medium text-gray-700">Password</label>
            <input id="register-password" type="password" autoComplete="new-password" minLength={8} value={form.password} required
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10" />
            <p className="mt-1 text-xs text-gray-500">Use at least 8 characters.</p>
          </div>
          <button type="submit" disabled={loading}
            className="w-full rounded-xl bg-gray-950 py-3 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-wait disabled:opacity-60">
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account? <Link to="/login" className="font-semibold text-gray-900 underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
