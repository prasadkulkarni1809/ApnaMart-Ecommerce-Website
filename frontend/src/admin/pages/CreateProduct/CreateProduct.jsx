import { useEffect, useRef, useState } from "react";
import axios from "axios";

function CreateProduct() {
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState("");

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [discount, setDiscount] = useState("");
  const [stock, setStock] = useState("");
  const [sku, setSku] = useState("");

  const [images, setImages] = useState([]);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef(null);

  // =========================
  // FETCH CATEGORIES
  // =========================
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(
          "http://localhost:3000/api/categories"
        );

        setCategories(response.data.categories);
      } catch (error) {
        console.error("CATEGORY FETCH ERROR:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // =========================
  // IMAGE SELECTION
  // =========================
  const handleImageChange = (e) => {
    const selectedImages = Array.from(e.target.files);

    if (selectedImages.length > 6) {
      alert("You can select a maximum of 6 images.");
      return;
    }

    setImages(selectedImages);
  };

  // =========================
  // REMOVE IMAGE
  // =========================
  const removeImage = (indexToRemove) => {
    setImages((currentImages) =>
      currentImages.filter(
        (_, index) => index !== indexToRemove
      )
    );

    // Reset file input so the same files can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // =========================
  // CREATE PRODUCT
  // =========================
  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log("CREATE PRODUCT BUTTON CLICKED");

    if (!name || !price || !category) {
      alert("Please fill name, price and category.");
      return;
    }

    if (images.length === 0) {
      alert("Please select at least one image.");
      return;
    }

    try {
      setCreating(true);

      const formData = new FormData();

      formData.append("name", name);
      formData.append("price", price);
      formData.append("discount", discount);
      formData.append("category", category);
      formData.append("stock", stock);
      formData.append("sku", sku);

      images.forEach((image) => {
        formData.append("images", image);
      });

      console.log("SENDING PRODUCT...");

      const response = await axios.post(
        "http://localhost:3000/products/create",
        formData,
        {
          withCredentials: true,
        }
      );

      console.log("PRODUCT CREATED:", response.data);

      setSuccess(true);

      // Clear form
      setName("");
      setPrice("");
      setDiscount("");
      setStock("");
      setSku("");
      setCategory("");
      setImages([]);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

    } catch (error) {
      console.error("CREATE PRODUCT ERROR:", error);

      if (error.response) {
        console.log(
          "SERVER RESPONSE:",
          error.response.data
        );

        alert(
          error.response.data.message ||
            "Failed to create product"
        );
      } else {
        alert("Could not connect to backend.");
      }

    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">

      {/* =========================
          SUCCESS POPUP
      ========================= */}

      {success && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">

          <div className="w-[90%] max-w-md rounded-2xl bg-white p-8 shadow-2xl text-center">

            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">

              <svg
                className="h-8 w-8 text-green-600"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>

            </div>

            <h2 className="text-2xl font-bold text-gray-900">
              Product Created!
            </h2>

            <p className="mt-2 text-gray-500">
              Your product has been successfully added
              to the store.
            </p>

            <button
              onClick={() => setSuccess(false)}
              className="mt-6 w-full rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-800"
            >
              Continue
            </button>

          </div>

        </div>
      )}

      {/* =========================
          PAGE HEADER
      ========================= */}

      <h1 className="text-3xl font-bold">
        Create Product
      </h1>

      <p className="mt-2 text-gray-500">
        Add a new product to your store
      </p>

      {/* =========================
          FORM
      ========================= */}

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-6"
      >

        {/* =========================
            PRODUCT IMAGES
        ========================= */}

        <div>

          <label className="block text-sm font-medium mb-2">
            Product Images
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            className="border rounded-lg px-4 py-3 w-full"
          />

          <p className="text-sm text-gray-500 mt-2">
            Select up to 6 product images.
          </p>

          {/* IMAGE COUNT */}

          {images.length > 0 && (
            <p className="text-sm font-medium text-slate-700 mt-3">
              {images.length} / 6 images selected
            </p>
          )}

          {/* IMAGE PREVIEWS */}

          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">

              {images.map((image, index) => (

                <div
                  key={`${image.name}-${index}`}
                  className="relative group"
                >

                  <img
                    src={URL.createObjectURL(image)}
                    alt={`Product ${index + 1}`}
                    className="w-full h-40 object-cover rounded-xl border"
                  />

                  {/* IMAGE NUMBER */}

                  <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md">
                    Image {index + 1}
                  </div>

                  {/* REMOVE BUTTON */}

                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 text-white font-bold opacity-0 group-hover:opacity-100 transition"
                  >
                    ×
                  </button>

                </div>

              ))}

            </div>
          )}

        </div>

        {/* =========================
            PRODUCT NAME
        ========================= */}

        <div>

          <label className="block text-sm font-medium mb-2">
            Product Name
          </label>

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter product name"
            className="border rounded-lg px-4 py-3 w-full"
          />

        </div>

        {/* =========================
            PRICE
        ========================= */}

        <div>

          <label className="block text-sm font-medium mb-2">
            Price
          </label>

          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Enter product price"
            className="border rounded-lg px-4 py-3 w-full"
          />

        </div>

        {/* STOCK AND SKU */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Stock Quantity
            </label>

            <input
              type="number"
              min="0"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              placeholder="e.g. 25"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              SKU
            </label>

            <input
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="e.g. SHOE-VK-001"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 uppercase outline-none focus:border-slate-900"
            />
          </div>
        </div>

        {/* =========================
            DISCOUNT
        ========================= */}

        <div>

          <label className="block text-sm font-medium mb-2">
            Discount (%)
          </label>

          <input
            type="number"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            placeholder="Enter discount percentage"
            className="border rounded-lg px-4 py-3 w-full"
          />

        </div>

        {/* =========================
            CATEGORY
        ========================= */}

        <div>

          <label className="block text-sm font-medium mb-2">
            Category
          </label>

          {loading ? (
            <p className="text-gray-500">
              Loading categories...
            </p>
          ) : (
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="border rounded-lg px-4 py-3 w-full"
            >

              <option value="">
                Select Category
              </option>

              {categories.map((category) => (
                <option
                  key={category._id}
                  value={category._id}
                >
                  {category.name}
                </option>
              ))}

            </select>
          )}

        </div>

        {/* =========================
            SUBMIT
        ========================= */}

        <button
          type="submit"
          disabled={creating}
          className="bg-slate-800 text-white px-8 py-4 rounded-lg font-semibold hover:bg-slate-700 disabled:opacity-50 transition"
        >
          {creating
            ? "Creating..."
            : "Create Product"}
        </button>

      </form>

    </div>
  );
}

export default CreateProduct;
