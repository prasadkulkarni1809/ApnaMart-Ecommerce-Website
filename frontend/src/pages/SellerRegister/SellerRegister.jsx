import { useState } from "react";
import axios from "axios";
import API_BASE_URL from "../../config/api";
import { Link } from "react-router-dom";

function SellerRegister() {
  const [form, setForm] = useState({ fullname: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (form.fullname.trim().length < 3) return setError("Enter your full name (at least 3 characters).");
    if (form.password.length < 8) return setError("Password must be at least 8 characters.");
    if (form.password !== form.confirmPassword) return setError("Passwords do not match.");

    setLoading(true);
    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/owners/create`,
        { fullname: form.fullname.trim(), email: form.email.trim(), password: form.password },
        { withCredentials: true, headers: { "X-Client": "react" } }
      );
      if (!data.success) {
        setError(data.message || "Unable to create your seller account.");
        return;
      }
      setSuccess(data.message || "Seller account created. You can now log in.");
      setForm({ fullname: "", email: "", password: "", confirmPassword: "" });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[75vh] items-center justify-center bg-slate-50 px-5 py-12 dark:bg-gray-950">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-lg dark:bg-gray-900 sm:p-10">
        <p className="text-center text-sm font-semibold uppercase tracking-wider text-blue-600">Seller registration</p>
        <h1 className="mt-2 text-center text-3xl font-bold text-slate-900 dark:text-white">Start selling with us</h1>
        <p className="mt-2 text-center text-slate-500 dark:text-slate-400">Create your seller account to bring your products to our customers.</p>
        {error && <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {success && <div role="status" className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{success} <Link to="/login" className="ml-1 font-semibold underline">Log in</Link></div>}
        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <div>
            <label htmlFor="seller-name" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Full name</label>
            <input id="seller-name" name="fullname" autoComplete="name" minLength={3} value={form.fullname} onChange={update} required className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-blue-600 dark:border-gray-700 dark:bg-gray-950 dark:text-white" />
          </div>
          <div>
            <label htmlFor="seller-email" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Email</label>
            <input id="seller-email" name="email" type="email" autoComplete="email" value={form.email} onChange={update} required className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-blue-600 dark:border-gray-700 dark:bg-gray-950 dark:text-white" />
          </div>
          <div>
            <label htmlFor="seller-password" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Password</label>
            <input id="seller-password" name="password" type="password" autoComplete="new-password" minLength={8} value={form.password} onChange={update} required className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-blue-600 dark:border-gray-700 dark:bg-gray-950 dark:text-white" />
          </div>
          <div>
            <label htmlFor="seller-confirm-password" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Confirm password</label>
            <input id="seller-confirm-password" name="confirmPassword" type="password" autoComplete="new-password" value={form.confirmPassword} onChange={update} required className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-blue-600 dark:border-gray-700 dark:bg-gray-950 dark:text-white" />
          </div>
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">{loading ? "Creating seller account…" : "Create seller account"}</button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">Already registered? <Link to="/login" className="font-semibold text-blue-700 underline dark:text-blue-300">Log in</Link></p>
      </div>
    </div>
  );
}

export default SellerRegister;
