import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../../config/api";

const API_BASE = API_BASE_URL;

const initialForm = {
  phone: "",
  storeName: "",
  storeDescription: "",
  businessAddress: "",
  city: "",
  state: "",
  pincode: "",
};

export default function SellerProfile() {
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [seller, setSeller] = useState({ fullname: "", email: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch(`${API_BASE}/owners/profile`, {
          credentials: "include",
          headers: { "X-Client": "react" },
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Unable to load profile.");
        }

        const profile = data.profile;

        setSeller({
          fullname: profile.fullname || "",
          email: profile.email || "",
        });

        setForm({
          phone: profile.phone || "",
          storeName: profile.storeName || "",
          storeDescription: profile.storeDescription || "",
          businessAddress: profile.businessAddress || "",
          city: profile.city || "",
          state: profile.state || "",
          pincode: profile.pincode || "",
        });
      } catch (err) {
        setError(err.message || "Unable to load profile.");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!/^\d{10}$/.test(form.phone.trim())) {
      setError("Enter a valid 10-digit phone number.");
      return;
    }

    if (!/^\d{6}$/.test(form.pincode.trim())) {
      setError("Enter a valid 6-digit pincode.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API_BASE}/owners/profile`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Client": "react",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to save profile.");
      }

      setSuccess("Your seller profile has been saved successfully.");
      setSeller({
        fullname: data.profile.fullname || seller.fullname,
        email: data.profile.email || seller.email,
      });
    } catch (err) {
      setError(err.message || "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 text-white">
        Loading your seller profile...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={() => navigate("/seller")}
          className="mb-6 text-sm text-blue-400 hover:text-blue-300"
        >
          ← Back to Seller Dashboard
        </button>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl sm:p-9">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-400">
            Seller Account
          </p>

          <h1 className="mt-2 text-3xl font-bold">Complete Your Profile</h1>

          <p className="mt-2 text-slate-400">
            Add your store details so customers can learn about your business.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Full name
              </label>
              <input
                value={seller.fullname}
                readOnly
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-slate-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">Email</label>
              <input
                value={seller.email}
                readOnly
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-slate-400"
              />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label htmlFor="phone" className="mb-2 block text-sm font-medium">
                Phone number *
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={10}
                required
                value={form.phone}
                onChange={handleChange}
                placeholder="10-digit phone number"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="storeName" className="mb-2 block text-sm font-medium">
                Store name *
              </label>
              <input
                id="storeName"
                name="storeName"
                required
                maxLength={100}
                value={form.storeName}
                onChange={handleChange}
                placeholder="e.g. Pranit Store"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="storeDescription" className="mb-2 block text-sm font-medium">
                Store description
              </label>
              <textarea
                id="storeDescription"
                name="storeDescription"
                rows={4}
                maxLength={1000}
                value={form.storeDescription}
                onChange={handleChange}
                placeholder="Tell customers about your store"
                className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="businessAddress" className="mb-2 block text-sm font-medium">
                Business address *
              </label>
              <input
                id="businessAddress"
                name="businessAddress"
                required
                maxLength={250}
                value={form.businessAddress}
                onChange={handleChange}
                placeholder="Street, building, area"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="city" className="mb-2 block text-sm font-medium">
                  City *
                </label>
                <input
                  id="city"
                  name="city"
                  required
                  value={form.city}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="state" className="mb-2 block text-sm font-medium">
                  State *
                </label>
                <input
                  id="state"
                  name="state"
                  required
                  value={form.state}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="pincode" className="mb-2 block text-sm font-medium">
                Pincode *
              </label>
              <input
                id="pincode"
                name="pincode"
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={6}
                required
                value={form.pincode}
                onChange={handleChange}
                placeholder="6-digit pincode"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            {error && (
              <p role="alert" className="rounded-lg bg-red-950 p-3 text-sm text-red-300">
                {error}
              </p>
            )}

            {success && (
              <p role="status" className="rounded-lg bg-emerald-950 p-3 text-sm text-emerald-300">
                {success}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving profile..." : "Save Profile"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
