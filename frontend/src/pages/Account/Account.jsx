import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useSearchParams } from "react-router-dom";
import Toast from "../../components/common/Toast";
import { useTheme } from "../../context/ThemeContext";

const API = "http://localhost:3000/api/account";
const requestConfig = {
  withCredentials: true,
  headers: { "X-Client": "react" },
};
const ORDER_STEPS = ["PLACED", "ACCEPTED", "PACKED", "READY_TO_DISPATCH", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"];
const CANCELLABLE_STATUSES = ["PLACED", "ACCEPTED", "PACKED"];
const CANCELLATION_REASONS = [
  "Changed my mind",
  "Ordered by mistake",
  "Found a better price",
  "Delivery is taking too long",
  "Other",
];

const emptyAddress = {
  label: "Home",
  name: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  isDefault: false,
};

function Account() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPage = searchParams.get("view");
  const activePage = ["orders", "profile", "addresses", "settings", "appearance", "password"].includes(requestedPage)
    ? requestedPage
    : "profile";
  const settingsExpanded = ["settings", "appearance", "password"].includes(activePage);
  const { darkMode, toggleDarkMode } = useTheme();
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({ fullname: "", contact: "" });
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [addressForm, setAddressForm] = useState(emptyAddress);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [toast, setToast] = useState(null);
  const [cancelDialogOrder, setCancelDialogOrder] = useState(null);
  const [cancellationReason, setCancellationReason] = useState(CANCELLATION_REASONS[0]);
  const [cancellationDetails, setCancellationDetails] = useState("");
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [exchangeDialogOrder, setExchangeDialogOrder] = useState(null);
  const [exchangeReason, setExchangeReason] = useState("");
  const [exchangeError, setExchangeError] = useState("");
  const [exchangeLoadingOrderId, setExchangeLoadingOrderId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const loadAccount = async () => {
      const response = await axios.get(API, {
        withCredentials: true,
        headers: { "X-Client": "react" },
      });
      const data = response.data;
      setProfile(data.profile);
      setProfileForm({
        fullname: data.profile.fullname || "",
        contact: data.profile.contact || "",
      });
      setSummary(data.summary);
      setOrders(data.orders || []);
      setAddresses(data.addresses || []);
    };

    loadAccount()
      .catch((loadError) => {
        console.error("ACCOUNT LOAD ERROR:", loadError);
        setError(
          loadError.response?.data?.message || "Unable to load your account."
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!exchangeDialogOrder) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !exchangeLoadingOrderId) {
        setExchangeDialogOrder(null);
        setExchangeError("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [exchangeDialogOrder, exchangeLoadingOrderId]);

  const saveProfile = async (event) => {
    event.preventDefault();
    try {
      setSavingProfile(true);
      setError("");
      const response = await axios.put(
        `${API}/profile`,
        profileForm,
        requestConfig
      );
      setProfile(response.data.profile);
      setProfileForm({
        fullname: response.data.profile.fullname || "",
        contact: response.data.profile.contact || "",
      });
      setNotice("Profile updated.");
    } catch (saveError) {
      console.error("PROFILE UPDATE ERROR:", saveError);
      setError(saveError.response?.data?.message || "Unable to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      setToast({ type: "error", title: "Password update failed", message: "Passwords do not match" });
      return;
    }

    try {
      setSavingPassword(true);
      const response = await axios.put(
        "http://localhost:3000/users/api/account/password",
        { currentPassword, newPassword },
        requestConfig
      );

      setToast({ type: "success", title: "Password updated", message: response.data.message || "Password changed successfully" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (passwordError) {
      setToast({
        type: "error",
        title: "Password update failed",
        message: passwordError.response?.data?.message || "Failed to change password",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleCancelOrder = async (event) => {
    event.preventDefault();
    if (!cancelDialogOrder) return;

    const reason = cancellationReason === "Other"
      ? cancellationDetails.trim()
      : cancellationReason;
    if (!reason) {
      setToast({ type: "error", title: "Cancellation failed", message: "Please enter a cancellation reason" });
      return;
    }

    try {
      setCancellingOrderId(cancelDialogOrder._id);
      const response = await axios.put(
        `http://localhost:3000/api/orders/${cancelDialogOrder._id}/cancel`,
        { reason },
        requestConfig
      );

      const updatedOrder = response.data.order;
      setOrders((previousOrders) => previousOrders.map((order) =>
        order._id === updatedOrder._id
          ? {
              ...order,
              status: updatedOrder.status,
              cancellationReason: updatedOrder.cancellationReason,
              deliveryUpdate: updatedOrder.deliveryUpdate,
            }
          : order
      ));
      setSummary((previousSummary) => {
        if (!previousSummary) return previousSummary;
        return {
          ...previousSummary,
          activeOrders: Math.max(0, previousSummary.activeOrders - 1),
          cancelledOrders: previousSummary.cancelledOrders + 1,
          totalSpent: Math.max(
            0,
            previousSummary.totalSpent - (updatedOrder.paymentStatus === "PAID" ? updatedOrder.amount : 0)
          ),
        };
      });
      setToast({ type: "success", title: "Order cancelled", message: response.data.message || "Order cancelled successfully" });
      setCancelDialogOrder(null);
      setCancellationDetails("");
    } catch (cancelError) {
      setToast({
        type: "error",
        title: "Cancellation failed",
        message: cancelError.response?.data?.message || "Failed to cancel order",
      });
    } finally {
      setCancellingOrderId(null);
    }
  };

  const handleExchangeOrder = async (event) => {
    event.preventDefault();
    if (!exchangeDialogOrder) return;

    const reason = exchangeReason.trim();
    if (!reason) {
      setExchangeError("Please provide a reason for your exchange request.");
      return;
    }
    if (reason.length > 500) {
      setExchangeError("Please keep the reason under 500 characters.");
      return;
    }

    try {
      setExchangeError("");
      setExchangeLoadingOrderId(exchangeDialogOrder._id);
      const response = await axios.put(
        `http://localhost:3000/api/orders/${exchangeDialogOrder._id}/exchange`,
        { reason },
        requestConfig
      );
      const updatedOrder = response.data?.order;
      if (!response.data?.success || !updatedOrder?._id) {
        throw new Error(response.data?.message || "The server could not confirm the exchange request.");
      }
      setOrders((previousOrders) => previousOrders.map((order) =>
        order._id === updatedOrder._id
          ? {
              ...order,
              exchangeRequested: updatedOrder.exchangeRequested,
              exchangeReason: updatedOrder.exchangeReason,
              exchangeStatus: updatedOrder.exchangeStatus,
            }
          : order
      ));
      setExchangeDialogOrder(null);
      setExchangeReason("");
      setToast({ type: "success", title: "Exchange requested", message: response.data.message || "Exchange request submitted successfully" });
    } catch (exchangeError) {
      const message = exchangeError.response?.data?.message ||
        (exchangeError.request
          ? "Could not reach the server. Check your connection and try again."
          : exchangeError.message || "Failed to submit exchange request");
      setExchangeError(message);
      setToast({
        type: "error",
        title: "Exchange request failed",
        message,
      });
    } finally {
      setExchangeLoadingOrderId(null);
    }
  };

  const saveAddress = async (event) => {
    event.preventDefault();
    try {
      setSavingAddress(true);
      setError("");
      const response = editingAddressId
        ? await axios.put(
            `${API}/addresses/${editingAddressId}`,
            addressForm,
            requestConfig
          )
        : await axios.post(`${API}/addresses`, addressForm, requestConfig);
      setAddresses(response.data.addresses || []);
      setAddressForm(emptyAddress);
      setEditingAddressId(null);
      setNotice(response.data.message || "Address saved.");
    } catch (saveError) {
      console.error("ADDRESS SAVE ERROR:", saveError);
      setError(saveError.response?.data?.message || "Unable to save address.");
    } finally {
      setSavingAddress(false);
    }
  };

  const editAddress = (address) => {
    setEditingAddressId(address._id);
    setAddressForm({
      label: address.label || "Home",
      name: address.name || "",
      phone: address.phone || "",
      address: address.address || "",
      city: address.city || "",
      state: address.state || "",
      pincode: address.pincode || "",
      isDefault: Boolean(address.isDefault),
    });
    setNotice("");
  };

  const setDefaultAddress = async (addressId) => {
    try {
      setError("");
      const response = await axios.put(
        `${API}/addresses/${addressId}/default`,
        {},
        requestConfig
      );
      setAddresses(response.data.addresses || []);
      setNotice("Default address updated.");
    } catch (saveError) {
      setError(saveError.response?.data?.message || "Unable to update address.");
    }
  };

  const deleteAddress = async (addressId) => {
    try {
      setError("");
      const response = await axios.delete(
        `${API}/addresses/${addressId}`,
        requestConfig
      );
      setAddresses(response.data.addresses || []);
      if (editingAddressId === addressId) {
        setAddressForm(emptyAddress);
        setEditingAddressId(null);
      }
      setNotice("Address removed.");
    } catch (deleteError) {
      setError(deleteError.response?.data?.message || "Unable to remove address.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[65vh] flex items-center justify-center text-gray-500">
        Loading your account...
      </div>
    );
  }

  if (error && !profile) {
    return (
      <section className="min-h-[65vh] flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Sign in to view your account</h1>
          <p className="mt-2 text-gray-500">{error}</p>
          <Link to="/login" className="inline-flex mt-6 rounded-xl bg-black px-5 py-3 text-white">
            Go to login
          </Link>
        </div>
      </section>
    );
  }

  const selectPage = (page) => setSearchParams({ view: page });

  return (
    <section className="min-h-screen bg-[#f1f3f6] px-4 py-8 dark:bg-gray-950 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
          <p className="text-sm font-medium uppercase tracking-wider text-gray-500">Your account</p>
          <h1 className="mt-2 text-3xl font-semibold text-gray-900 sm:text-4xl">My Account</h1>
        </header>

        <div className="grid items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="overflow-hidden rounded-sm bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-gray-100 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-2xl">👤</div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Hello,</p>
                <p className="truncate font-semibold text-gray-900">{profile?.fullname || "Customer"}</p>
              </div>
            </div>

            <button type="button" onClick={() => selectPage("orders")} className={sidebarLink(activePage === "orders")}>
              <span className="text-lg text-blue-600">▣</span> My Orders <span className="ml-auto">›</span>
            </button>
            <div className="border-t border-gray-100 px-5 pb-2 pt-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Account Settings</div>
            <button type="button" onClick={() => selectPage("profile")} className={sidebarLink(activePage === "profile")}>
              <span className="text-lg text-blue-600">♟</span> Profile Information
            </button>
            <button type="button" onClick={() => selectPage("addresses")} className={sidebarLink(activePage === "addresses")}>
              <span className="text-lg text-blue-600">⌖</span> Manage Addresses
              <span className="ml-auto text-xs text-gray-400">{addresses.length}</span>
            </button>
            <div className="border-t border-gray-100 px-5 pb-2 pt-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Settings</div>
            <button type="button" onClick={() => selectPage("settings")} className={sidebarLink(settingsExpanded)} aria-expanded={settingsExpanded}>
              <span className="text-lg text-blue-600">⚙</span> Settings <span className="ml-auto">{settingsExpanded ? "⌄" : "›"}</span>
            </button>
            {settingsExpanded && (
              <div className="pb-2">
                <button type="button" onClick={() => selectPage("appearance")} className={sidebarSubLink(activePage === "appearance")}>Appearance &amp; dark mode</button>
                <button type="button" onClick={() => selectPage("password")} className={sidebarSubLink(activePage === "password")}>Change Password</button>
              </div>
            )}
          </aside>

          <main className="min-h-[540px] rounded-sm bg-white p-5 shadow-sm sm:p-8">
            {(error || notice) && (
              <div role="status" className={`mb-6 rounded-md border p-3 text-sm ${error ? "border-red-100 bg-red-50 text-red-700" : "border-green-100 bg-green-50 text-green-700"}`}>
                {error || notice}
              </div>
            )}

            {activePage === "settings" && (
              <section>
                <PageHeading title="Settings" description="Manage your appearance and account security." />
                <div className="mt-6 grid max-w-3xl gap-4 md:grid-cols-2">
                  <button type="button" onClick={() => selectPage("appearance")} className="rounded-lg border border-gray-200 p-5 text-left transition hover:border-blue-300 hover:shadow-sm">
                    <span className="text-2xl">{darkMode ? "🌙" : "☀️"}</span>
                    <h3 className="mt-3 font-semibold text-gray-900">Appearance</h3>
                    <p className="mt-1 text-sm text-gray-500">Dark mode is {darkMode ? "on" : "off"}. Choose the theme that feels right.</p>
                    <span className="mt-4 inline-block text-sm font-semibold text-blue-600">Manage appearance →</span>
                  </button>
                  <button type="button" onClick={() => selectPage("password")} className="rounded-lg border border-gray-200 p-5 text-left transition hover:border-blue-300 hover:shadow-sm">
                    <span className="text-2xl">🔒</span>
                    <h3 className="mt-3 font-semibold text-gray-900">Change Password</h3>
                    <p className="mt-1 text-sm text-gray-500">Update your password to help keep your account secure.</p>
                    <span className="mt-4 inline-block text-sm font-semibold text-blue-600">Update password →</span>
                  </button>
                </div>
              </section>
            )}

            {activePage === "appearance" && (
              <section className="max-w-2xl">
                <PageHeading title="Appearance" description="Choose how ApnaMart looks on this device." />
                <div className="mt-6 flex flex-wrap items-center justify-between gap-5 rounded-lg border border-gray-200 p-5">
                  <div>
                    <h3 className="font-semibold text-gray-900">Dark mode</h3>
                    <p className="mt-1 text-sm text-gray-500">Apply a darker theme across the storefront. Your choice is saved on this device.</p>
                  </div>
                  <button type="button" role="switch" aria-checked={darkMode} onClick={toggleDarkMode} className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${darkMode ? "bg-blue-600" : "bg-gray-300"}`}>
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${darkMode ? "translate-x-6" : "translate-x-1"}`} />
                    <span className="sr-only">Turn dark mode {darkMode ? "off" : "on"}</span>
                  </button>
                </div>
                <p className="mt-4 text-sm text-gray-500">Dark mode is currently <span className="font-medium text-gray-800">{darkMode ? "on" : "off"}</span>.</p>
              </section>
            )}

            {activePage === "profile" && (
              <section className="max-w-2xl">
                <PageHeading title="Personal Information" description="View and update the details connected to your account." />
                <form onSubmit={saveProfile} className="mt-8 max-w-xl space-y-5">
                  <FormField label="Full name">
                    <input value={profileForm.fullname} onChange={(event) => setProfileForm({ ...profileForm, fullname: event.target.value })} required className={inputClass} />
                  </FormField>
                  <FormField label="Email address">
                    <input type="email" value={profile?.email || ""} readOnly className={`${inputClass} bg-gray-50 text-gray-500`} />
                  </FormField>
                  <FormField label="Mobile number">
                    <input value={profileForm.contact} onChange={(event) => setProfileForm({ ...profileForm, contact: event.target.value })} inputMode="tel" className={inputClass} />
                  </FormField>
                  <button disabled={savingProfile} className={primaryButton}>{savingProfile ? "Saving..." : "Save changes"}</button>
                </form>
              </section>
            )}

            {activePage === "password" && (
              <section className="max-w-2xl">
                <PageHeading title="Change Password" description="Use a strong password you don’t use on other sites." />
                <form onSubmit={handleChangePassword} className="mt-8 max-w-xl space-y-5">
                  <FormField label="Current password">
                    <input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required className={inputClass} />
                  </FormField>
                  <FormField label="New password">
                    <input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={6} required className={inputClass} />
                    <span className="mt-1 block text-xs font-normal text-gray-500">At least 6 characters.</span>
                  </FormField>
                  <FormField label="Confirm new password">
                    <input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={6} required className={inputClass} />
                  </FormField>
                  <button type="submit" disabled={savingPassword} className={primaryButton}>
                    {savingPassword ? "Changing password..." : "Change Password"}
                  </button>
                </form>
              </section>
            )}

            {activePage === "addresses" && (
              <section>
                <PageHeading title="Manage Addresses" description="Saved addresses are available to select during checkout." />
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
                  <p className="text-sm text-gray-500">{addresses.length} saved {addresses.length === 1 ? "address" : "addresses"}</p>
                  <button type="button" onClick={() => { setEditingAddressId(null); setAddressForm(emptyAddress); }} className="text-sm font-semibold text-blue-600 hover:underline">+ Add a new address</button>
                </div>

                {addresses.length ? (
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {addresses.map((address) => (
                      <article key={address._id} className="rounded-sm border border-gray-200 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-semibold text-gray-900">{address.label || "Address"}</h3>
                          {address.isDefault && <span className="rounded-sm bg-green-50 px-2 py-1 text-xs font-medium text-green-700">Default</span>}
                        </div>
                        <p className="mt-3 text-sm font-medium text-gray-800">{address.name} · {address.phone}</p>
                        <p className="mt-1 text-sm leading-6 text-gray-600">{address.address}, {address.city}{address.state ? `, ${address.state}` : ""}, {address.pincode}</p>
                        <div className="mt-4 flex flex-wrap gap-4 border-t border-gray-100 pt-3 text-sm">
                          <button type="button" onClick={() => editAddress(address)} className="font-medium text-blue-600 hover:underline">Edit</button>
                          {!address.isDefault && <button type="button" onClick={() => setDefaultAddress(address._id)} className="font-medium text-gray-600 hover:underline">Set as default</button>}
                          <button type="button" onClick={() => deleteAddress(address._id)} className="font-medium text-red-600 hover:underline">Remove</button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="mt-5 rounded-sm bg-gray-50 p-5 text-sm text-gray-500">No saved addresses yet. Add an address below to use it at checkout.</p>
                )}

                <form onSubmit={saveAddress} className="mt-7 max-w-3xl border-t border-gray-100 pt-6">
                  <h3 className="font-semibold text-gray-900">{editingAddressId ? "Edit address" : "Add a new address"}</h3>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <FormField label="Address type">
                      <select value={addressForm.label} onChange={(event) => setAddressForm({ ...addressForm, label: event.target.value })} className={inputClass}><option>Home</option><option>Work</option><option>Other</option></select>
                    </FormField>
                    <FormField label="Recipient name">
                      <input value={addressForm.name} onChange={(event) => setAddressForm({ ...addressForm, name: event.target.value })} required className={inputClass} />
                    </FormField>
                    <FormField label="Phone">
                      <input value={addressForm.phone} onChange={(event) => setAddressForm({ ...addressForm, phone: event.target.value })} required inputMode="tel" className={inputClass} />
                    </FormField>
                    <FormField label="Pincode">
                      <input value={addressForm.pincode} onChange={(event) => setAddressForm({ ...addressForm, pincode: event.target.value })} required inputMode="numeric" className={inputClass} />
                    </FormField>
                    <div className="sm:col-span-2"><FormField label="Street address"><textarea value={addressForm.address} onChange={(event) => setAddressForm({ ...addressForm, address: event.target.value })} required rows={2} className={`${inputClass} resize-y`} /></FormField></div>
                    <FormField label="City"><input value={addressForm.city} onChange={(event) => setAddressForm({ ...addressForm, city: event.target.value })} required className={inputClass} /></FormField>
                    <FormField label="State (optional)"><input value={addressForm.state} onChange={(event) => setAddressForm({ ...addressForm, state: event.target.value })} className={inputClass} /></FormField>
                  </div>
                  <label className="mt-4 flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={addressForm.isDefault} onChange={(event) => setAddressForm({ ...addressForm, isDefault: event.target.checked })} /> Set as my default address</label>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button disabled={savingAddress} className={primaryButton}>{savingAddress ? "Saving..." : editingAddressId ? "Update address" : "Save address"}</button>
                    {editingAddressId && <button type="button" onClick={() => { setEditingAddressId(null); setAddressForm(emptyAddress); }} className="rounded-md border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700">Cancel</button>}
                  </div>
                </form>
              </section>
            )}

            {activePage === "orders" && (
              <section>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <PageHeading title="My Orders" description="Review your purchases and follow their delivery progress." />
                  <Link to="/products" className="text-sm font-medium text-blue-600 hover:underline">Continue shopping</Link>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <SummaryCard label="Total Orders" value={summary?.totalOrders || 0} />
                  <SummaryCard label="Active Orders" value={summary?.activeOrders || 0} />
                  <SummaryCard label="Delivered" value={summary?.deliveredOrders || 0} />
                  <SummaryCard label="Cancelled" value={summary?.cancelledOrders || 0} />
                  <SummaryCard label="Total Spent" value={`₹${Math.round(summary?.totalSpent || 0).toLocaleString("en-IN")}`} />
                </div>
                {orders.length ? (
                  <div className="mt-6 space-y-5">
                    {orders.map((order) => (
                      <OrderCard
                        key={order._id}
                        order={order}
                        onCancel={() => {
                          setCancelDialogOrder(order);
                          setCancellationReason(CANCELLATION_REASONS[0]);
                          setCancellationDetails("");
                        }}
                        onExchange={() => {
                          setExchangeDialogOrder(order);
                          setExchangeReason("");
                          setExchangeError("");
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="mt-6 rounded-sm bg-gray-50 p-8 text-center"><p className="font-medium text-gray-800">No orders yet</p><p className="mt-1 text-sm text-gray-500">Your orders and tracking updates will appear here.</p></div>
                )}
              </section>
            )}
          </main>
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
      {cancelDialogOrder && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 px-4 py-6" role="presentation">
          <form onSubmit={handleCancelOrder} role="dialog" aria-modal="true" aria-labelledby="cancel-order-title" className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h2 id="cancel-order-title" className="text-xl font-semibold text-gray-900">Cancel this order?</h2>
            <p className="mt-2 text-sm text-gray-500">Order #{String(cancelDialogOrder._id).slice(-8).toUpperCase()}</p>
            <label className="mt-5 block text-sm font-medium text-gray-700">
              <span className="mb-2 block">Reason for cancellation</span>
              <select value={cancellationReason} onChange={(event) => setCancellationReason(event.target.value)} className={inputClass}>
                {CANCELLATION_REASONS.map((reason) => <option key={reason}>{reason}</option>)}
              </select>
            </label>
            {cancellationReason === "Other" && (
              <textarea value={cancellationDetails} onChange={(event) => setCancellationDetails(event.target.value)} required rows={3} maxLength={300} placeholder="Tell us why you’re cancelling" className={`${inputClass} mt-4 resize-y`} />
            )}
            <p className="mt-4 text-xs text-gray-500">Stock will be returned after cancellation. Orders already shipped cannot be cancelled here.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" disabled={Boolean(cancellingOrderId)} onClick={() => setCancelDialogOrder(null)} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 disabled:opacity-50">Keep order</button>
              <button type="submit" disabled={Boolean(cancellingOrderId)} className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                {cancellingOrderId ? "Cancelling…" : "Confirm cancellation"}
              </button>
            </div>
          </form>
        </div>
      )}
      {exchangeDialogOrder && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-black/55 px-4 py-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !exchangeLoadingOrderId) { setExchangeDialogOrder(null); setExchangeError(""); } }}>
          <form onSubmit={handleExchangeOrder} role="dialog" aria-modal="true" aria-labelledby="exchange-order-title" className="relative my-auto w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6 dark:bg-gray-900">
            <button type="button" disabled={Boolean(exchangeLoadingOrderId)} onClick={() => { setExchangeDialogOrder(null); setExchangeError(""); }} aria-label="Close exchange dialog" className="absolute right-4 top-4 rounded-full px-2 py-1 text-xl leading-none text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50 dark:hover:bg-gray-800 dark:hover:text-white">×</button>
            <h2 id="exchange-order-title" className="pr-8 text-xl font-semibold text-gray-900 dark:text-white">Request an exchange</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Order #{String(exchangeDialogOrder._id).slice(-8).toUpperCase()}. Tell us why you’d like to exchange it.</p>
            <label className="mt-5 block text-sm font-medium text-gray-700 dark:text-gray-200">
              <span className="mb-2 block">Reason</span>
              <textarea autoFocus value={exchangeReason} onChange={(event) => { setExchangeReason(event.target.value); if (exchangeError) setExchangeError(""); }} required rows={4} maxLength={500} placeholder="Example: wrong size, damaged product..." aria-describedby="exchange-reason-help" aria-invalid={Boolean(exchangeError)} className={`${inputClass} resize-y dark:border-gray-700 dark:bg-gray-800 dark:text-white ${exchangeError ? "border-red-500 focus:border-red-500" : ""}`} />
              <span id="exchange-reason-help" className="mt-1 block text-xs font-normal text-gray-500 dark:text-gray-400">{exchangeReason.trim().length}/500 characters</span>
            </label>
            {exchangeError && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{exchangeError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" disabled={Boolean(exchangeLoadingOrderId)} onClick={() => setExchangeDialogOrder(null)} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200">Cancel</button>
              <button type="submit" disabled={Boolean(exchangeLoadingOrderId) || !exchangeReason.trim()} className="rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50">
                {exchangeLoadingOrderId ? "Submitting…" : "Submit request"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

const inputClass = "w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm outline-none focus:border-gray-500";
const primaryButton = "rounded-xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-wait disabled:opacity-60";

const sidebarLink = (active) => `flex w-full items-center gap-3 px-5 py-3.5 text-left text-sm transition ${active ? "bg-blue-50 font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-200" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-gray-800"}`;
const sidebarSubLink = (active) => `block w-full py-3 pl-14 pr-5 text-left text-sm transition ${active ? "bg-blue-50 font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-200" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-gray-800"}`;

function PageHeading({ title, description }) {
  return <div className="border-b border-gray-100 pb-5"><h2 className="text-xl font-semibold text-gray-900">{title}</h2><p className="mt-1 text-sm text-gray-500">{description}</p></div>;
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <label className="block text-sm font-medium text-gray-700">
      <span className="mb-2 block">{label}</span>
      {children}
    </label>
  );
}

function OrderCard({ order, onCancel, onExchange }) {
  const terminalStatus = ["CANCELLED", "REJECTED"].includes(order.status);
  const activeIndex = ORDER_STEPS.indexOf(order.status);
  const canCancel = CANCELLABLE_STATUSES.includes(order.status) && ["PENDING", "PAID"].includes(order.paymentStatus);
  const exchangeStatus = order.exchangeStatus || "NONE";
  const canRequestExchange = order.status === "DELIVERED" && exchangeStatus === "NONE" && !order.exchangeRequested;

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Order #{String(order._id || "").slice(-8).toUpperCase()}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Placed {order.createdAt && !Number.isNaN(new Date(order.createdAt).getTime()) ? new Date(order.createdAt).toLocaleDateString() : "Date unavailable"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">{order.paymentStatus || "PAYMENT UNKNOWN"}</span>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-200">{order.status?.replaceAll("_", " ") || "STATUS UNKNOWN"}</span>
        </div>
      </div>

      {canCancel && (
        <button type="button" onClick={onCancel} className="mt-4 rounded-lg border border-red-200 px-3.5 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50">
          Cancel order
        </button>
      )}
      {canRequestExchange && (
        <button type="button" onClick={onExchange} className="mt-4 rounded-xl border border-orange-500 px-5 py-3 font-semibold text-orange-600 transition hover:bg-orange-50 dark:hover:bg-orange-950/40">
          Request Exchange
        </button>
      )}
      {exchangeStatus === "REQUESTED" && (
        <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950/30">
          <p className="font-semibold text-orange-700 dark:text-orange-300">Exchange Request Submitted</p>
          <p className="mt-1 text-sm text-orange-600 dark:text-orange-200">Your exchange request is waiting for review.</p>
          {order.exchangeReason && <p className="mt-2 text-sm text-orange-700 dark:text-orange-200">Reason: {order.exchangeReason}</p>}
        </div>
      )}
      {["APPROVED", "REJECTED", "COMPLETED"].includes(exchangeStatus) && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-700 dark:bg-gray-800">
          <span className="font-semibold text-gray-800 dark:text-gray-100">Exchange {exchangeStatus.toLowerCase()}</span>
          {order.exchangeReason && <p className="mt-1 text-gray-600 dark:text-gray-300">Reason: {order.exchangeReason}</p>}
        </div>
      )}

      <div className="mt-4 divide-y divide-gray-100 dark:divide-gray-800">
        {(Array.isArray(order.items) ? order.items : []).map((item, index) => (
          <div key={`${order._id}-${index}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            {item.productId ? (
              <Link to={`/products/${item.productId}`} aria-label={`View ${item.name || "product"}`} className="shrink-0 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500">
                {item.image ? <img src={item.image} alt={item.name || ""} className="h-12 w-12 rounded-lg bg-gray-50 object-contain transition hover:opacity-80" /> : <div className="h-12 w-12 rounded-lg bg-gray-100" />}
              </Link>
            ) : item.image ? <img src={item.image} alt={item.name || ""} className="h-12 w-12 rounded-lg bg-gray-50 object-contain" /> : <div className="h-12 w-12 rounded-lg bg-gray-100" />}
            <p className="min-w-0 flex-1 truncate text-sm text-gray-700 dark:text-gray-200">{item.productId ? <Link to={`/products/${item.productId}`} className="rounded-sm hover:text-blue-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 dark:hover:text-blue-300">{item.name || "Product"}</Link> : item.name || "Product"} <span className="text-gray-400">× {item.quantity || 0}</span></p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">₹{Math.round((Number(item.price) || 0) * (Number(item.quantity) || 0)).toLocaleString("en-IN")}</p>
          </div>
        ))}
        {!order.items?.length && <p className="py-3 text-sm text-gray-500">No item details are available for this order.</p>}
      </div>

      {!terminalStatus && (
        <div className="mt-5 rounded-xl bg-gray-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-gray-900">{order.deliveryUpdate || "Order placed"}</p>
            <p className="text-sm font-semibold text-gray-900">Total ₹{Math.round(order.amount || 0)}</p>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-1 sm:grid-cols-7">
            {ORDER_STEPS.map((step, index) => (
              <div key={step} className="text-center">
                <div className={`mx-auto h-2 rounded-full ${activeIndex >= index ? "bg-green-600" : "bg-gray-200"}`} />
                <p className={`mt-2 text-[10px] leading-4 sm:text-xs ${activeIndex >= index ? "text-green-700" : "text-gray-400"}`}>{step.replaceAll("_", " ")}</p>
              </div>
            ))}
          </div>
          {(order.trackingNumber || order.courierPartner || order.expectedDeliveryDate || order.sellerFulfillments?.length) && (
            <div className="mt-4 space-y-2 text-xs text-gray-600">
              <div className="flex flex-wrap gap-x-5 gap-y-1">
              {order.courierPartner && <span>Courier: {order.courierPartner}</span>}
              {order.trackingNumber && <span>Tracking: {order.trackingNumber}</span>}
              {order.expectedDeliveryDate && <span>Estimated delivery: {new Date(order.expectedDeliveryDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>}
              </div>
              {(order.sellerFulfillments || []).map((fulfillment) => <div key={String(fulfillment.seller)} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <p className="font-medium text-gray-800 dark:text-gray-200">{fulfillment.sellerName}: {fulfillment.status?.replaceAll("_", " ")}</p>
                {fulfillment.readyAt && <p className="mt-1">Ready for dispatch: {new Date(fulfillment.readyAt).toLocaleString()}</p>}
                {fulfillment.expectedDeliveryDate && <p className="mt-1 font-medium text-green-700 dark:text-green-300">Estimated delivery: {new Date(fulfillment.expectedDeliveryDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>}
                {!fulfillment.expectedDeliveryDate && !["CANCELLED", "REJECTED", "DELIVERED"].includes(fulfillment.status) && <p className="mt-1 text-gray-500 dark:text-gray-400">Delivery estimate will be available after courier handover.</p>}
                {(fulfillment.courierPartner || fulfillment.trackingNumber) && <p className="mt-1">{fulfillment.courierPartner && `Courier: ${fulfillment.courierPartner}`} {fulfillment.trackingNumber && `· Tracking: ${fulfillment.trackingNumber}`}</p>}
              </div>)}
            </div>
          )}
        </div>
      )}
      {terminalStatus && (
        <div className="mt-4 flex items-center justify-between rounded-xl bg-gray-50 p-4 text-sm">
          <span className="text-gray-600">{order.deliveryUpdate || order.status}</span>
          <span className="font-semibold text-gray-900">Total ₹{Math.round(order.amount || 0)}</span>
        </div>
      )}
    </article>
  );
}

export default Account;
