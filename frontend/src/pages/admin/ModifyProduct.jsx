import React, { useState, useEffect } from "react";
import { Upload, Trash2, Star, ArrowLeft, Loader2 } from "lucide-react";
import DescriptionEditor from "@/components/admin/DescriptionEditor";
import { useApi } from "@/contexts/RestContext";
import { toast } from "sonner";
import { useParams, useNavigate } from "react-router-dom";

const ModifyProduct = () => {
  const { api } = useApi();
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState([]);
  const [mainImageIndex, setMainImageIndex] = useState(0);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [productData, setProductData] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "<p></p>",
    initial_price: "",
    profit: "",
    category: "",
    subcategory: "",
    discount_percentage: "",
    discount_price: "",
    discount_start: "",
    discount_end: "",
    tags: "",
  });
  const [errors, setErrors] = useState({});

  // Fetch product data and categories on component mount
  useEffect(() => {
    fetchProduct();
    fetchCategories();
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const [data, _, responseCode, error] = await api.get(
        `/product/get/${id}`
      );

      console.log(data);

      if (responseCode === 200 && data) {
        setProductData(data);

        // Populate form data with correct field mapping
        setFormData({
          name: data.name || "",
          description: data.description || "<p></p>",
          initial_price: data.admin_pricing?.initial_price || "",
          profit: data.admin_pricing?.profit || "",
          category: data.category?.name || "",
          subcategory: data.subcategory?.name || "",
          discount_percentage: data.admin_pricing?.discount_percentage || "",
          discount_price: data.discount_price || "",
          discount_start: data.discount_start || "",
          discount_end: data.discount_end || "",
          tags: "", // You might need to fetch tags separately if available
        });

        // Process images
        if (data.images && data.images.length > 0) {
          const processedImages = data.images.map((img, index) => ({
            id: img.id,
            url: img.url,
            preview: img.url,
            name: `صورة ${index + 1}`,
            isExisting: true,
          }));
          setImages(processedImages);

          // Find main image index
          const mainImageIdx = data.images.findIndex(
            (img) => img.is_main === 1
          );
          setMainImageIndex(mainImageIdx >= 0 ? mainImageIdx : 0);
        }
      } else {
        toast.error("خطأ في تحميل المنتج", {
          description: "لم يتم العثور على المنتج المطلوب",
          duration: 4000,
        });
        navigate("/admin/products");
      }
    } catch (error) {
      console.error("Error fetching product:", error);
      toast.error("خطأ في الاتصال", {
        description: "تعذر تحميل بيانات المنتج",
        duration: 4000,
      });
      navigate("/admin/products");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      // Reset subcategory when category changes
      ...(name === "category" && { subcategory: "" }),
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleDescriptionChange = (html) => {
    setFormData((prev) => ({
      ...prev,
      description: html,
    }));
    if (errors.description && html !== "<p></p>") {
      setErrors((prev) => ({ ...prev, description: "" }));
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files).slice(0, 10 - images.length);
    const validImages = [];
    let hasErrors = false;

    files.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("خطأ في رفع الصورة", {
          description: `الصورة ${file.name} تتجاوز حد 5 ميجابايت`,
          duration: 4000,
        });
        hasErrors = true;
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("نوع ملف غير صالح", {
          description: `${file.name} ليس ملف صورة صالح`,
          duration: 4000,
        });
        hasErrors = true;
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        validImages.push({
          file,
          preview: event.target.result,
          name: file.name,
          isExisting: false,
        });
        if (
          validImages.length ===
          files.filter(
            (f) => f.size <= 5 * 1024 * 1024 && f.type.startsWith("image/")
          ).length
        ) {
          setImages((prev) => [...prev, ...validImages]);
          if (validImages.length > 0) {
            toast.success("تم رفع الصور بنجاح", {
              description: `تم رفع ${validImages.length} صورة بنجاح`,
              duration: 3000,
            });
          }
        }
      };
      reader.readAsDataURL(file);
    });

    if (files.length === 0) {
      toast("تنبيه", {
        description: "لم يتم اختيار أي ملفات",
        duration: 3000,
      });
    }
  };

  const removeImage = (indexToRemove) => {
    const removedImage = images[indexToRemove];
    setImages((prev) => prev.filter((_, i) => i !== indexToRemove));

    if (mainImageIndex === indexToRemove) {
      setMainImageIndex(0);
    } else if (mainImageIndex > indexToRemove) {
      setMainImageIndex((prev) => prev - 1);
    }

    toast.success("تم حذف الصورة", {
      description: `تم حذف ${removedImage.name} بنجاح`,
      duration: 2000,
    });
  };

  const setAsMainImage = (index) => {
    setMainImageIndex(index);
    toast.success("تم تحديث الصورة الرئيسية", {
      description: "تم تعيين الصورة كصورة رئيسية للمنتج",
      duration: 2000,
    });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = "اسم المنتج مطلوب";
    if (!formData.description || formData.description === "<p></p>")
      newErrors.description = "الوصف مطلوب";
    if (!formData.initial_price || formData.initial_price <= 0)
      newErrors.initial_price = "السعر الأولي صالح مطلوب";
    if (!formData.profit || formData.profit < 0)
      newErrors.profit = "الربح صالح مطلوب";
    if (!formData.category) newErrors.category = "الفئة مطلوبة";
    if (!formData.subcategory) newErrors.subcategory = "الفئة الفرعية مطلوبة";

    // Validate discount_percentage ONLY if it's defined
    if (
      formData.discount_percentage !== undefined &&
      formData.discount_percentage !== null &&
      formData.discount_percentage !== "" &&
      formData.discount_percentage !== 0
    ) {
      if (
        formData.discount_percentage < 0 ||
        formData.discount_percentage > 100
      ) {
        newErrors.discount_percentage = "الخصم يجب أن يكون بين 0 و 100%";
      }
    }

    // Validate discount dates and price ONLY if any of them is filled
    const hasManualDiscount =
      formData.discount_price ||
      formData.discount_start ||
      formData.discount_end;

    if (hasManualDiscount) {
      if (!formData.discount_price) {
        newErrors.discount_price = "سعر الخصم مطلوب عند وجود تاريخ خصم";
      }

      if (!formData.discount_start) {
        newErrors.discount_start = "تاريخ بداية الخصم مطلوب";
      }

      if (!formData.discount_end) {
        newErrors.discount_end = "تاريخ نهاية الخصم مطلوب";
      }

      if (
        formData.discount_start &&
        formData.discount_end &&
        formData.discount_start > formData.discount_end
      ) {
        newErrors.discount_end = "تاريخ النهاية يجب أن يكون بعد تاريخ البداية";
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast.error("خطأ في التحقق من البيانات", {
        description: "يرجى تصحيح الأخطاء في النموذج قبل المتابعة",
        duration: 4000,
      });
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);

    const loadingToast = toast("جاري تحديث المنتج...", {
      description: "يتم الآن حفظ التعديلات",
      duration: 500,
      style: {
        background: "#1d4ed8",
        color: "#ffffff",
        direction: "rtl",
        textAlign: "right",
      },
    });

    try {
      const formDataToSend = new FormData();

      // Basic fields
      formDataToSend.append("name", formData.name);
      formDataToSend.append("description", formData.description);
      formDataToSend.append(
        "initial_price",
        parseFloat(formData.initial_price)
      );
      formDataToSend.append("profit", parseFloat(formData.profit));
      formDataToSend.append("category", formData.category);
      formDataToSend.append("subcategory", formData.subcategory);
      formDataToSend.append("main_image_index", mainImageIndex);

      // Optional discount
      if (formData.discount_percentage) {
        formDataToSend.append(
          "discount_percentage",
          parseFloat(formData.discount_percentage)
        );
      }
      if (
        formData.discount_price &&
        formData.discount_start &&
        formData.discount_end
      ) {
        formDataToSend.append(
          "discount_price",
          parseFloat(formData.discount_price)
        );
        formDataToSend.append("discount_start", formData.discount_start);
        formDataToSend.append("discount_end", formData.discount_end);
      }

      // Optional tags
      if (formData.tags) {
        const tags = formData.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag);
        formDataToSend.append("tags", JSON.stringify(tags));
      }

      // Add new images only
      const newImages = images.filter((img) => !img.isExisting);
      newImages.forEach((image) => {
        formDataToSend.append("images", image.file);
      });

      // Send existing image IDs and their order
      const existingImages = images.filter((img) => img.isExisting);
      if (existingImages.length > 0) {
        formDataToSend.append(
          "existing_images",
          JSON.stringify(existingImages.map((img) => img.id))
        );
      }

      const [data, _, responseCode, error] = await api.put(
        `/product/update/${id}`,
        formDataToSend,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          withCredentials: true,
        }
      );

      if (responseCode === 200 || responseCode === 201) {
        toast.success(data.message || "تم تحديث المنتج بنجاح! 🎉", {
          description: data.description || "تم حفظ جميع التعديلات بنجاح",
          duration: 5000,
          style: {
            background: "#22c55e",
            color: "#ffffff",
            direction: "rtl",
            textAlign: "right",
          },
        });
        // Optionally navigate back or refresh data
        // navigate("/admin/products");
      } else {
        handleApiError(error, error.response.data);
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Error updating product:", error);
      toast.error("خطأ في الاتصال", {
        description:
          "تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.",
        duration: 6000,
        style: {
          background: "#ef4444",
          color: "#ffffff",
          direction: "rtl",
          textAlign: "right",
        },
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApiError = (error, data) => {
    let errorMessage = "خطأ في تحديث المنتج";
    let errorDescription =
      "حدث خطأ أثناء تحديث المنتج. يرجى المحاولة مرة أخرى.";

    if (data?.message) {
      errorMessage = data.message;
      errorDescription = data.description || errorDescription;
    } else if (error?.message) {
      errorMessage = "خطأ في النظام";
      errorDescription = error.message;
    }

    if (data?.errorType) {
      switch (data.errorType) {
        case "VALIDATION_ERROR":
          errorDescription =
            "يرجى التحقق من البيانات المدخلة وملء جميع الحقول المطلوبة";
          break;
        case "PRODUCT_NOT_FOUND":
          errorDescription = "المنتج غير موجود";
          break;
        case "DUPLICATE_PRODUCT_NAME":
          errorDescription = "يوجد منتج بنفس الاسم. يرجى اختيار اسم مختلف";
          break;
        case "CATEGORY_NOT_FOUND":
        case "SUBCATEGORY_NOT_FOUND":
          errorDescription = "الفئة المحددة غير صحيحة. يرجى اختيار فئة أخرى";
          break;
        case "INVALID_DISCOUNT_PRICE":
          errorDescription = "سعر الخصم يجب أن يكون أقل من السعر الأساسي";
          break;
        case "INVALID_DISCOUNT_DATES":
          errorDescription = "تواريخ الخصم غير صحيحة. تأكد من التواريخ المدخلة";
          break;
        case "EXPIRED_DISCOUNT_DATE":
          errorDescription = "تاريخ انتهاء الخصم يجب أن يكون في المستقبل";
          break;
        case "SERVER_ERROR":
          errorDescription = "خطأ في الخادم. يرجى المحاولة مرة أخرى لاحقاً";
          break;
      }
    }

    toast.error(errorMessage, {
      description: errorDescription,
      duration: 6000,
      style: {
        background: "#ef4444",
        color: "#ffffff",
        direction: "rtl",
        textAlign: "right",
      },
    });

    if (data?.errors) {
      console.error("Validation errors:", data.errors);
    }
  };

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const [data, _, responseCode, error] = await api.get(
        "/category/getAll?page=1&limit=200"
      );

      if (responseCode === 200 && data?.categories) {
        setCategories(data.categories);
      } else {
        console.error("Error fetching categories:", error);
        toast.error("حدث خطأ أثناء تحميل الفئات");
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("حدث خطأ أثناء تحميل الفئات");
    } finally {
      setLoadingCategories(false);
    }
  };

  const selectedCategory = categories.find(
    (cat) => cat.name === formData.category
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">جاري تحميل بيانات المنتج...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8" dir="rtl">
      <div className="">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              تعديل المنتج: {productData?.name}
            </h1>
          </div>
          <p className="text-gray-600">قم بتعديل معلومات المنتج وصوره</p>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Product Information */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Info Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">
                  معلومات المنتج الأساسية
                </h3>
                <div className="space-y-4">
                  {/* Product Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      اسم المنتج *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-lg ${
                        errors.name ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder="ادخل اسم المنتج"
                      required
                    />
                    {errors.name && (
                      <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                    )}
                  </div>

                  {/* Categories */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الفئة *
                      </label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border rounded-lg ${
                          errors.category ? "border-red-500" : "border-gray-300"
                        }`}
                        required
                        disabled={loadingCategories}
                      >
                        <option value="">اختر الفئة</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.name}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      {errors.category && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.category}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الفئة الفرعية *
                      </label>
                      <select
                        name="subcategory"
                        value={formData.subcategory}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border rounded-lg ${
                          errors.subcategory
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                        required
                        disabled={!selectedCategory}
                      >
                        <option value="">اختر الفئة الفرعية</option>
                        {selectedCategory?.subcategories?.map((subcategory) => (
                          <option key={subcategory.id} value={subcategory.name}>
                            {subcategory.name}
                          </option>
                        ))}
                      </select>
                      {errors.subcategory && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.subcategory}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        السعر الأولي *
                      </label>
                      <input
                        type="number"
                        name="initial_price"
                        value={formData.initial_price}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                        className={`w-full px-4 py-3 border rounded-lg ${
                          errors.initial_price
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                        placeholder="0.00"
                        required
                      />
                      {errors.initial_price && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.initial_price}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الربح *
                      </label>
                      <input
                        type="number"
                        name="profit"
                        value={formData.profit}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                        className={`w-full px-4 py-3 border rounded-lg ${
                          errors.profit ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="0.00"
                        required
                      />
                      {errors.profit && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.profit}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      العلامات (مفصولة بفواصل)
                    </label>
                    <input
                      type="text"
                      name="tags"
                      value={formData.tags}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                      placeholder="علامة 1, علامة 2, علامة 3"
                    />
                  </div>
                </div>
              </div>

              {/* Description Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">
                  وصف المنتج *
                </h3>
                <DescriptionEditor
                  content={formData.description}
                  onUpdate={handleDescriptionChange}
                  error={errors.description}
                />
              </div>

              {/* Discount Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">
                  الخصم (اختياري)
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الخصم عند شراء اكثر من منتج %
                      </label>
                      <input
                        type="number"
                        name="discount_percentage"
                        value={formData.discount_percentage}
                        onChange={handleInputChange}
                        min="0"
                        max="100"
                        className={`w-full px-4 py-3 border rounded-lg ${
                          errors.discount_percentage
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                        placeholder="0"
                      />
                      {errors.discount_percentage && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.discount_percentage}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        سعر خصم خاص
                      </label>
                      <input
                        type="number"
                        name="discount_price"
                        value={formData.discount_price}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                        className={`w-full px-4 py-3 border rounded-lg ${
                          errors.discount_price
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                        placeholder="0.00"
                      />
                      {errors.discount_price && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.discount_price}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        بداية الخصم
                      </label>
                      <input
                        type="date"
                        name="discount_start"
                        value={formData.discount_start}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border rounded-lg ${
                          errors.discount_start
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                      />
                      {errors.discount_start && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.discount_start}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        نهاية الخصم
                      </label>
                      <input
                        type="date"
                        name="discount_end"
                        value={formData.discount_end}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border rounded-lg ${
                          errors.discount_end
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                      />
                      {errors.discount_end && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.discount_end}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Images Section */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">
                  صور المنتج
                </h3>

                {/* Image Upload */}
                <div className="mb-6">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-gray-500" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">اضغط لرفع الصور</span>
                      </p>
                      <p className="text-xs text-gray-500">
                        PNG, JPG أو JPEG (حد أقصى 5MB)
                      </p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={images.length >= 10}
                    />
                  </label>
                  <p className="text-sm text-gray-500 mt-2">
                    {images.length}/10 صور مرفوعة
                  </p>
                </div>

                {/* Images Preview */}
                {images.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">
                      الصور المرفوعة
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      {images.map((image, index) => (
                        <div
                          key={index}
                          className={`relative group border-2 rounded-lg overflow-hidden ${
                            mainImageIndex === index
                              ? "border-blue-500"
                              : "border-gray-200"
                          }`}
                        >
                          <img
                            src={image.preview || image.url}
                            alt={image.name}
                            className="w-full h-24 object-cover"
                          />

                          {/* Image Actions */}
                          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => setAsMainImage(index)}
                              className={`p-1 rounded ${
                                mainImageIndex === index
                                  ? "bg-blue-500 text-white"
                                  : "bg-white text-gray-700 hover:bg-gray-100"
                              }`}
                              title="تعيين كصورة رئيسية"
                            >
                              <Star size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                              title="حذف الصورة"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          {/* Main Image Badge */}
                          {mainImageIndex === index && (
                            <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                              رئيسية
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Product Preview */}
                {productData && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">
                      معاينة المنتج
                    </h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">السعر النهائي: </span>
                        {productData.price} ج.م
                      </div>
                      <div>
                        <span className="font-medium">إجمالي الصور: </span>
                        {images.length} صورة
                      </div>
                      {productData.has_discount && (
                        <div className="text-green-600">
                          <span className="font-medium">يوجد خصم نشط</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-4 pt-6 mt-8 border-t-2 border-blue-500">
            <button
              type="button"
              onClick={() => navigate(-1)}
              disabled={submitting}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3 bg-accent hover:bg-blue-700 text-white rounded-lg font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? "جاري الحفظ..." : "حفظ التعديلات"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModifyProduct;
