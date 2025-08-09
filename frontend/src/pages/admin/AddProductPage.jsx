import React, { useState, useEffect } from "react";
import { Upload, Trash2, Star, ArrowRight } from "lucide-react";
import DescriptionEditor from "@/components/admin/DescriptionEditor";
import { useApi } from "@/contexts/RestContext";
import { toast } from "sonner";

const ProductPage = () => {
  const { api } = useApi();
  const [images, setImages] = useState([]);
  const [mainImageIndex, setMainImageIndex] = useState(0);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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

  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories();
  }, []);

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

    // ✅ Validate discount_percentage ONLY if it's defined (not null or undefined)
    if (
      formData.discount_percentage !== undefined &&
      formData.discount_percentage !== null &&
      formData.discount_percentage !== 0
    ) {
      if (
        formData.discount_percentage < 0 ||
        formData.discount_percentage > 100
      ) {
        newErrors.discount_percentage = "الخصم يجب أن يكون بين 0 و 100%";
      }
    }

    // ✅ Validate discount dates and price ONLY if any of them is filled (excluding percentage)
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

    // Show validation error toast if there are errors
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

    // Show loading toast
    const loadingToast = toast("جاري إضافة المنتج...", {
      description: "يتم الآن رفع البيانات والصور",
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

      // Add images
      images.forEach((image) => {
        formDataToSend.append("images", image.file);
      });

      const [data, _, responseCode, error] = await api.post(
        "/product/add",
        formDataToSend,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          withCredentials: true,
        }
      );

      if (responseCode === 200 || responseCode === 201) {
        toast.success(data.message || "تم إضافة المنتج بنجاح! 🎉", {
          description:
            data.description || "تم حفظ المنتج وجميع البيانات المرفقة بنجاح",
          duration: 5000,
          style: {
            background: "#22c55e",
            color: "#ffffff",
            direction: "rtl",
            textAlign: "right",
          },
        });
        resetForm();
      } else {
        handleApiError(error, error.response.data);
      }
    } catch (error) {
      toast.dismiss(loadingToast);

      console.error("Error creating product:", error);

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

  // Error handler
  const handleApiError = (error, data) => {
    let errorMessage = "خطأ في إضافة المنتج";
    let errorDescription =
      "حدث خطأ أثناء إضافة المنتج. يرجى المحاولة مرة أخرى.";

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
        case "DUPLICATE_PRODUCT_NAME":
          errorDescription = "يوجد منتج بنفس الاسم. يرجى اختيار اسم مختلف";
          break;
        case "CATEGORY_NOT_FOUND":
        case "SUBCATEGORY_NOT_FOUND":
          errorDescription = "الفئة المحددة غير صحيحة. يرجى اختيار فئة أخرى";
          break;
        case "NO_IMAGES":
          errorDescription = "يجب إضافة صورة واحدة على الأقل للمنتج";
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
        case "TAGS_FORMAT_ERROR":
          errorDescription =
            "تنسيق الكلمات المفتاحية غير صحيح. تأكد من التنسيق";
          break;
        case "INVALID_PRICE":
          errorDescription = "السعر الأساسي يجب أن يكون رقمًا موجباً";
          break;
        case "INVALID_PROFIT":
          errorDescription = "هامش الربح يجب أن يكون رقمًا موجباً أو صفر";
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

  const resetForm = () => {
    setFormData({
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
    setImages([]);
    setMainImageIndex(0);
    setErrors({});
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
        alert("حدث خطأ أثناء تحميل الفئات");
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      alert("حدث خطأ أثناء تحميل الفئات");
    } finally {
      setLoadingCategories(false);
    }
  };

  // Get selected category object
  const selectedCategory = categories.find(
    (cat) => cat.name === formData.category
  );

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8" dir="rtl">
      <div className="">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
              <ArrowRight size={20} className="text-gray-600" />
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              إضافة منتج جديد
            </h1>
          </div>
          <p className="text-gray-600">
            أضف معلومات المنتج الجديد وصوره للمتجر
          </p>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">
                معلومات المنتج
              </h3>
              <div className="space-y-6 h-full">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    اسم المنتج *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                      errors.name ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="أدخل اسم المنتج"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                  )}
                </div>

                <DescriptionEditor
                  content={formData.description}
                  onUpdate={handleDescriptionChange}
                  error={errors.description}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* السعر الأولي */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      السعر شراء * (د.ج)
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
                    />
                    {errors.initial_price && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.initial_price}
                      </p>
                    )}
                  </div>

                  {/* الربح */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الربح * (د.ج)
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
                    />
                    {errors.profit && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.profit}
                      </p>
                    )}
                  </div>

                  {/* سعر البيع (readonly calculated field) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      سعر البيع (د.ج)
                    </label>
                    <input
                      type="text"
                      readOnly
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 
               focus:outline-none focus:ring-0 focus:border-gray-200 cursor-default"
                      value={
                        formData.discount_price &&
                        parseFloat(formData.discount_price) > 0
                          ? parseFloat(formData.discount_price).toFixed(2)
                          : (
                              parseFloat(formData.initial_price || 0) +
                              parseFloat(formData.profit || 0)
                            ).toFixed(2)
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">
                  صور المنتج
                </h3>
                <div className="mb-6">
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-10 h-10 mb-3 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500 font-medium">
                        انقر لرفع الصور
                      </p>
                      <p className="text-xs text-gray-400">
                        الحد الأقصى 5 ميجابايت لكل صورة
                      </p>
                    </div>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-4">
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
                          src={image.preview}
                          alt={`معاينة ${index + 1}`}
                          className="w-full h-24 object-cover"
                        />
                        {mainImageIndex === index && (
                          <div className="absolute top-1 right-1 bg-blue-500 text-white px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1">
                            <Star size={12} className="fill-current" /> رئيسية
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black bg-opacity-60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          {mainImageIndex !== index && (
                            <button
                              type="button"
                              onClick={() => setAsMainImage(index)}
                              title="جعل رئيسية"
                              className="group/star bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full transition-colors cursor-pointer"
                            >
                              <Star
                                size={16}
                                className="fill-none group-hover/star:fill-white transition-colors"
                              />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            title="حذف"
                            className="group/trash bg-red-500 hover:bg-red-800 text-white p-2 rounded-full transition-colors cursor-pointer"
                          >
                            <Trash2 size={16} className="fill-none " />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الفئة *
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      disabled={loadingCategories}
                      className={`w-full px-4 py-3 border rounded-lg ${
                        errors.category ? "border-red-500" : "border-gray-300"
                      } ${
                        loadingCategories
                          ? "bg-gray-100 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      <option value="">
                        {loadingCategories ? "جاري التحميل..." : "اختر الفئة"}
                      </option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name}
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
                      disabled={
                        !formData.category ||
                        !selectedCategory?.subcategories?.length
                      }
                      className={`w-full px-4 py-3 border rounded-lg ${
                        errors.subcategory
                          ? "border-red-500"
                          : "border-gray-300"
                      } ${
                        !formData.category ||
                        !selectedCategory?.subcategories?.length
                          ? "bg-gray-100 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      <option value="">اختر الفئة الفرعية</option>
                      {selectedCategory?.subcategories?.map((sub) => (
                        <option key={sub.id} value={sub.name}>
                          {sub.name}
                        </option>
                      ))}
                    </select>
                    {errors.subcategory && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.subcategory}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tags
                    </label>
                    <input
                      type="text"
                      name="tags"
                      value={formData.tags}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                      placeholder="tag, tag2, tag3"
                    />
                  </div>
                </div>
              </div>

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
          </div>

          <div className="flex items-center justify-end gap-4 pt-6 mt-8 border-t-2 border-accent">
            <button
              type="button"
              onClick={resetForm}
              disabled={submitting}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              إعادة تعيين
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3 bg-accent hover:bg-blue-800 text-white rounded-lg font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "جاري الإضافة..." : "إضافة المنتج"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductPage;
