function Toast({ type, title, message, onClose }) {
  const isSuccess = type === "success";

  return (
    <div className="fixed top-6 right-6 z-[100] animate-[slideIn_0.35s_ease-out]">
      <div
        className={`flex min-w-[320px] items-center gap-4 rounded-2xl border bg-white px-5 py-4 shadow-2xl ${
          isSuccess ? "border-green-100" : "border-red-100"
        }`}
      >
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl ${
            isSuccess
              ? "bg-green-100 text-green-600"
              : "bg-red-100 text-red-600"
          }`}
        >
          {isSuccess ? "✓" : "!"}
        </div>

        <div className="flex-1">
          <p className="text-sm font-bold text-gray-900">
            {title || (isSuccess ? "Added to cart" : "Something went wrong")}
          </p>
          <p className="mt-1 text-sm text-gray-500">{message}</p>
        </div>

        <button
          onClick={onClose}
          className="text-xl text-gray-400 transition hover:text-gray-700"
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default Toast;
