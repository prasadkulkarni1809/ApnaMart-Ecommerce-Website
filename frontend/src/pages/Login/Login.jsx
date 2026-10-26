import { useState } from "react";
import axios from "axios";
import API_BASE_URL from "../../config/api";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshAuth } = useAuth();
  const { refreshCartCount } = useCart();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/users/login`,
        { email: email.trim(), password },
        { withCredentials: true, headers: { "X-Client": "react" } }
      );

      if (!response.data?.success) {
        setError(response.data?.message || "Unable to login. Please try again.");
        return;
      }

      const authenticatedUser = await refreshAuth();
      await refreshCartCount();
      const returnPath = location.state?.from;
      const roleHome = authenticatedUser?.role === "admin" ? "/admin" : authenticatedUser?.role === "seller" ? "/seller" : returnPath || "/products";
      navigate(roleHome, { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center bg-gray-50 px-5 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg sm:p-10">
        <h1 className="text-center text-3xl font-bold text-gray-900">Welcome back</h1>
        <p className="mt-2 text-center text-gray-500">Sign in to continue shopping.</p>

        {error && (
          <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <div>
            <label htmlFor="login-email" className="mb-2 block text-sm font-medium text-gray-700">Email</label>
            <input id="login-email" type="email" autoComplete="email" value={email}
              onChange={(event) => setEmail(event.target.value)} required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10" />
          </div>
          <div>
            <label htmlFor="login-password" className="mb-2 block text-sm font-medium text-gray-700">Password</label>
            <input id="login-password" type="password" autoComplete="current-password" value={password}
              onChange={(event) => setPassword(event.target.value)} required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full rounded-xl bg-gray-950 py-3 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-wait disabled:opacity-60">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          New here? <Link to="/register" className="font-semibold text-gray-900 underline">Create an account</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
