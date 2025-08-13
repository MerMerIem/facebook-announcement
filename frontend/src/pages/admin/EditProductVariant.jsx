import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Upload,
  Trash2,
  Star,
  ArrowRight,
  Plus,
  X,
  Package,
  Eye,
  DollarSign,
  Tag,
  Ruler,
  Calendar,
  Image as ImageIcon,
  TrendingUp,
  Save,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { useApi } from "@/contexts/RestContext";
import { toast } from "sonner";

const EditProductVariant = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { api } = useApi();

  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [originalVariants, setOriginalVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingVariant, setDeletingVariant] = useState(null);
  const [errors, setErrors] = useState({});
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(null);
  const [deletedImages, setDeletedImages] = useState([]);
  const [deletedImagesPublicIds, setDeletedImagesPublicIds] = useState([]);

  // Fetch product and variants on component mount
  useEffect(() => {
    if (productId) {
      fetchProductVariants();
    }
  }, [productId]);

  const fetchProductVariants = async () => {
    try {
      setLoading(true);
      const [response, _, responseCode, error] = await api.get(
        `/product/getvariant/${productId}`
      );

      const data = response.data;

      if (responseCode === 200 && data) {
        setProduct(data.product);

        console.log(data.variants);

        // Transform the variants data to match our component state structure
        const formattedVariants = data.variants.map((variant) => ({
          id: variant.id,
          title: variant.title,
          initial_price: variant.pricing.initialPrice,
          profit: variant.pricing.profit,
          discount_price: variant.discount?.discountPrice || null,
          discount_start: variant.discount?.discountStart?.split("T")[0] || "",
          discountPercentage: variant.discount?.discountPercentage || 0,
          discount_end: variant.discount?.discountEnd?.split("T")[0] || "",
          measure_unit: variant.specifications.measureUnit || "",
          size: variant.specifications.size || "",
          images: variant.images.all.map((img) => ({
            preview: img.url,
            url: img.url,
            name: `image_${img.sortOrder}`,
            existing: true, // Flag to identify existing images
            id: img.id, // Add image ID for deletion tracking
            publicId: img.public_id, // Add public ID for Cloudinary deletion
          })),
          mainImageIndex:
            Math.max(0, variant.images.all.findIndex((img) => img.isPrimary)),
          is_active: variant.status.isActive,
          hasChanges: false, // Track if this variant has been modified
          orders: {
            totalOrders: variant.orders?.totalOrders || 0,
            totalQuantityOrdered: variant.orders?.totalQuantityOrdered || 0,
            hasOrders: variant.orders?.hasOrders || false,
          },
        }));

        setVariants(formattedVariants);
        setOriginalVariants(JSON.parse(JSON.stringify(formattedVariants)));
      } else {
        console.error("Error fetching variants:", error);
        toast.error("خطأ في تحميل المتغيرات", {
          description: "لم يتم العثور على متغيرات المنتج",
          duration: 4000,
        });
      }
    } catch (error) {
      console.error("Error fetching variants:", error);
      toast.error("خطأ في الاتصال", {
        description: "تعذر تحميل بيانات المتغيرات",
        duration: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  const updateVariant = (variantId, field, value) => {
    setVariants((prev) =>
      prev.map((variant) =>
        variant.id === variantId
          ? { ...variant, [field]: value, hasChanges: true }
          : variant
      )
    );
  };

  const calculateFinalPrice = (variant) => {
    const initialPrice = parseFloat(variant.initial_price) || 0;
    const profit = parseFloat(variant.profit) || 0;
    return initialPrice + profit;
  };

  const getProfit = (variant) => {
    return parseFloat(variant.profit) || 0;
  };

  const handleVariantImageUpload = (variantId, e) => {
    const files = Array.from(e.target.files);
    const validImages = [];
    let processedCount = 0;
    const validFiles = [];

    // Filter valid files first
    files.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("خطأ في رفع الصورة", {
          description: `الصورة ${file.name} تتجاوز حد 5 ميجابايت`,
          duration: 4000,
        });
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("نوع ملف غير صالح", {
          description: `${file.name} ليس ملف صورة صالح`,
          duration: 4000,
        });
        return;
      }
      validFiles.push(file);
    });

    if (validFiles.length === 0) return;

    // Process valid files
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        validImages.push({
          file,
          preview: event.target.result,
          name: file.name,
          existing: false,
        });

        processedCount++;

        if (processedCount === validFiles.length) {
          setVariants((prev) =>
            prev.map((variant) =>
              variant.id === variantId
                ? {
                    ...variant,
                    images: [...variant.images, ...validImages],
                    hasChanges: true,
                  }
                : variant
            )
          );

          toast.success("تم رفع الصور بنجاح", {
            description: `تم رفع ${validImages.length} صورة للمتغير`,
            duration: 3000,
          });
        }
      };
      reader.readAsDataURL(file);
    });

    // Clear the input
    e.target.value = '';
  };

  const removeVariantImage = (variantId, imageIndex) => {
    setVariants((prev) =>
      prev.map((variant) => {
        if (variant.id === variantId) {
          const imageToRemove = variant.images[imageIndex];
          
          // If it's an existing image, add to deletedImages array
          if (imageToRemove.existing && imageToRemove.id) {
            setDeletedImages(prevDeleted => [...prevDeleted, imageToRemove.id]);
            // Also track public ID for Cloudinary deletion
            if (imageToRemove.publicId) {
              setDeletedImagesPublicIds(prevDeleted => [...prevDeleted, imageToRemove.publicId]);
            }
          }

          const newImages = variant.images.filter((_, i) => i !== imageIndex);
          let newMainImageIndex = variant.mainImageIndex;

          // Adjust main image index
          if (variant.mainImageIndex === imageIndex) {
            // If we're deleting the main image, set the first remaining image as main
            newMainImageIndex = 0;
          } else if (variant.mainImageIndex > imageIndex) {
            // If main image index is after the deleted image, decrease it by 1
            newMainImageIndex = variant.mainImageIndex - 1;
          }

          // Ensure main image index is valid
          if (newMainImageIndex >= newImages.length) {
            newMainImageIndex = Math.max(0, newImages.length - 1);
          }

          return {
            ...variant,
            images: newImages,
            mainImageIndex: newMainImageIndex,
            hasChanges: true,
          };
        }
        return variant;
      })
    );
  };

  const setVariantMainImage = (variantId, imageIndex) => {
    setVariants((prev) =>
      prev.map((variant) =>
        variant.id === variantId
          ? { ...variant, mainImageIndex: imageIndex, hasChanges: true }
          : variant
      )
    );
  };

  const showDeleteConfirmation = (variantId) => {
    const variant = variants.find((v) => v.id === variantId);
    setDeleteConfirmModal({ variantId, variant });
  };

  const deleteVariant = async (variantId) => {
    try {
      setDeletingVariant(variantId);

      const [data, _, responseCode, error] = await api.delete(
        `/product/removeVariant/${variantId}`
      );

      if (responseCode === 200) {
        setVariants((prev) => prev.filter((v) => v.id !== variantId));
        toast.success("تم حذف المتغير بنجاح", {
          description: data.message || "تم حذف المتغير من قاعدة البيانات",
          duration: 3000,
          style: {
            background: "#10b981", // Green background
            color: "#ffffff", // White text
            border: "1px solid #059669", // Darker green border
          },
        });
      } else {
        throw new Error(data?.message || "فشل في حذف المتغير");
      }
    } catch (error) {
      console.error("Error deleting variant:", error);
      toast.error("خطأ في حذف المتغير", {
        description: error.message || "تعذر حذف المتغير من قاعدة البيانات",
        duration: 4000,
        style: {
          background: "#ef4444", // Red background
          color: "#ffffff", // White text
          border: "1px solid #dc2626", // Darker red border
        },
      });
    } finally {
      setDeletingVariant(null);
      setDeleteConfirmModal(null);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (variants.length === 0) {
      newErrors.variants = "يجب وجود متغير واحد على الأقل";
    }

    variants.forEach((variant, index) => {
      if (!variant.title.trim()) {
        newErrors[`variant_title_${index}`] = "عنوان المتغير مطلوب";
      }
      if (!variant.initial_price || variant.initial_price <= 0) {
        newErrors[`variant_initial_price_${index}`] = "السعر الأولي مطلوب";
      }
      if (variant.profit < 0) {
        newErrors[`variant_profit_${index}`] = "الربح لا يمكن أن يكون سالباً";
      }

      const finalPrice = calculateFinalPrice(variant);
      if (variant.discount_price && variant.discount_price >= finalPrice) {
        newErrors[`variant_discount_${index}`] =
          "سعر الخصم يجب أن يكون أقل من السعر النهائي";
      }

      // Check if variant has images (removed requirement for at least one image)
      // if (variant.hasChanges && variant.images.length === 0) {
      //   newErrors[`variant_images_${index}`] = "يجب إضافة صورة واحدة على الأقل";
      // }
    });

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

    // Check if there are any changes
    const hasChanges = variants.some((v) => v.hasChanges);
    if (!hasChanges) {
      toast.info("لا توجد تغييرات", {
        description: "لم يتم إجراء أي تغييرات على المتغيرات",
        duration: 3000,
      });
      return;
    }

    setSubmitting(true);

    const loadingToast = toast("جاري تحديث المتغيرات...", {
      description: "يتم الآن حفظ التغييرات والصور",
      duration: 500,
      style: {
        background: "#1d4ed8",
        color: "#ffffff",
        direction: "rtl",
        textAlign: "right",
      },
    });

    try {
      // Get only updated variants
      const updatedVariants = variants.filter((v) => v.hasChanges);

      // Handle updated variants (if any)
      if (updatedVariants.length > 0) {
        const updateFormData = new FormData();

        updateFormData.append(
          "variants",
          JSON.stringify(
            updatedVariants.map((variant) => ({
              id: variant.id,
              title: variant.title,
              initial_price: variant.initial_price,
              profit: variant.profit,
              discount_price: variant.discount_price,
              discountPercentage: variant.discountPercentage,
              discount_start: variant.discount_start,
              discount_end: variant.discount_end,
              measure_unit: variant.measure_unit,
              size: variant.size,
              is_active: variant.is_active,
              main_image_index: variant.mainImageIndex,
              deletedImages: deletedImages,
              deletedImagesPublicIds:deletedImagesPublicIds
            }))
          )
        );

        // Add deleted images array to form data
        if (deletedImages.length > 0) {
          updateFormData.append("deletedImages", JSON.stringify(deletedImages));
        }

        // Add updated variant images (only new files)
        let globalImageIndex = 0;
        updatedVariants.forEach((variant) => {
          const newImages = variant.images.filter(
            (img) => img.file && !img.existing
          );
          if (newImages.length > 0) {
            newImages.forEach((image) => {
              updateFormData.append(`variant_images_${variant.id}_${globalImageIndex}`, image.file);
              globalImageIndex++;
            });
          }
        });

        const [updateData, , updateResponseCode, updateError] = await api.post(
          `/product/modify/variant/${productId}`,
          updateFormData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
            withCredentials: true,
          }
        );

        if (updateResponseCode !== 200) {
          throw new Error(updateData?.message || "فشل في تحديث المتغيرات");
        }
      }

      toast.success("تم تحديث المتغيرات بنجاح! 🎉", {
        description: `تم حفظ ${updatedVariants.length} متغيرات`,
        duration: 5000,
        style: {
          background: "#22c55e",
          color: "#ffffff",
          direction: "rtl",
          textAlign: "right",
        },
      });

      // Refresh the data
      await fetchProductVariants();
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Error updating variants:", error);
      toast.error("خطأ في التحديث", {
        description: error.message || "تعذر حفظ التغييرات",
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

  const resetChanges = () => {
    setVariants(JSON.parse(JSON.stringify(originalVariants)));
    setDeletedImages([]);
    setDeletedImagesPublicIds([]);
    setErrors({});
    toast.info("تم إلغاء التغييرات", {
      description: "تم استعادة البيانات الأصلية",
      duration: 2000,
    });
  };

  const hasAnyChanges = () => {
    return variants.some((v) => v.hasChanges);
  };

  if (loading) {
    return (
      <div
        className="min-h-screen p-4 sm:p-6 lg:p-8 flex items-center justify-center bg-gray-50"
        dir="rtl"
      >
        <div className="text-center bg-white p-8 rounded-xl ">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">جاري تحميل المتغيرات...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div
        className="min-h-screen p-4 sm:p-6 lg:p-8 flex items-center justify-center bg-gray-50"
        dir="rtl"
      >
        <div className="text-center bg-white p-8 rounded-xl ">
          <Package size={64} className="text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            المنتج غير موجود
          </h2>
          <p className="text-gray-600 mb-4">لم يتم العثور على المنتج المحدد</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
          >
            العودة
          </button>
        </div>
      </div>
    );
  }

  console.log(variants);

  return (
    <div className="min-h-screen  sm:p-6 lg:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate(-1)}
              className="p-3 hover:bg-white rounded-xl transition-colors  border border-gray-200"
            >
              <ArrowRight size={20} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                تعديل متغيرات المنتج
              </h1>
              <p className="text-xl text-blue-600 mt-1 font-medium">
                {product.name}
              </p>
            </div>
          </div>

          {/* Product Info Card */}
          <div className="bg-accent/10 border border-ring rounded-xl p-6 shadow-none">
            <h3 className="font-bold text-black mb-4 text-lg flex items-center gap-2">
              <Package size={20} />
              معلومات المنتج الأساسية
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg ">
                <div className="flex items-center gap-2 mb-2">
                  <Package size={16} className="text-blue-600" />
                  <span className="text-gray-700 font-medium">
                    عدد المتغيرات
                  </span>
                </div>
                <span className="text-2xl font-bold text-blue-600">
                  {variants.length}
                </span>
              </div>
              <div className="bg-white p-4 rounded-lg ">
                <div className="flex items-center gap-2 mb-2">
                  <Eye size={16} className="text-purple-600" />
                  <span className="text-gray-700 font-medium">
                    المتغيرات النشطة
                  </span>
                </div>
                <span className="text-2xl font-bold text-purple-600">
                  {variants.filter((v) => v.is_active).length}
                </span>
              </div>
            </div>
          </div>

          {/* Changes Alert */}
          {hasAnyChanges() && (
            <div className="mt-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4 ">
              <div className="flex items-center gap-3">
                <AlertTriangle size={20} className="text-yellow-600" />
                <div>
                  <p className="font-bold text-yellow-800">
                    يوجد تغييرات غير محفوظة
                  </p>
                  <p className="text-sm text-yellow-700">
                    تأكد من حفظ التغييرات قبل مغادرة الصفحة
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-8">
          {/* Variants Section */}
          <div className="bg-white rounded-xl  border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <Package size={24} className="text-blue-600" />
                  متغيرات المنتج ({variants.length})
                </h3>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={resetChanges}
                    disabled={!hasAnyChanges()}
                    className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <RefreshCw size={16} />
                    إلغاء التغييرات
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              {errors.variants && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
                  <p className="text-red-700 font-medium">{errors.variants}</p>
                </div>
              )}

              <div className="space-y-8">
                {variants.map((variant, index) => (
                  <div
                    key={variant.id}
                    className={`border-2 rounded-xl p-6 transition-all duration-200 ${
                      variant.hasChanges
                        ? "border-yellow-300 bg-yellow-50"
                        : "border-gray-200 bg-gray-50 hover:border-blue-300"
                    }`}
                  >
                    {/* Variant Header */}
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            variant.hasChanges
                              ? "bg-yellow-100 text-yellow-600"
                              : "bg-blue-100 text-blue-600"
                          }`}
                        >
                          <span className="font-bold">{index + 1}</span>
                        </div>
                        <div>
                          <h4 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            المتغير {index + 1}
                            {variant.hasChanges && (
                              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-bold">
                                معدّل
                              </span>
                            )}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {variant.title || "بدون عنوان"}
                          </p>
                        </div>

                        {/* Orders Display */}
                        {variant.orders && (
                          <div
                            className={`px-4 py-2 rounded-full ${
                              variant.orders.hasOrders
                                ? "bg-gradient-to-r from-blue-100 to-blue-200"
                                : "bg-gradient-to-r from-gray-100 to-gray-200"
                            }`}
                          >
                            <span
                              className={`text-sm font-medium ${
                                variant.orders.hasOrders
                                  ? "text-blue-800"
                                  : "text-gray-600"
                              }`}
                            >
                              الطلبات:{" "}
                            </span>
                            <span
                              className={`text-lg font-bold ${
                                variant.orders.hasOrders
                                  ? "text-blue-900"
                                  : "text-gray-700"
                              }`}
                            >
                              {variant.orders.totalOrders}
                            </span>
                            {variant.orders.hasOrders && (
                              <span className="text-sm text-blue-700 mr-2">
                                ({variant.orders.totalQuantityOrdered} قطعة)
                              </span>
                            )}
                          </div>
                        )}

                        {/* Final Price Display */}
                        <div className="bg-gradient-to-r from-green-100 to-green-200 px-4 py-2 rounded-full">
                          <span className="text-sm font-medium text-green-800">
                            السعر النهائي:{" "}
                          </span>
                          <span className="text-lg font-bold text-green-900">
                            {variant.discount_price &&
                            variant.discount_price > 0
                              ? `${variant.discount_price.toFixed(2)} د.ج`
                              : `${calculateFinalPrice(variant).toFixed(
                                  2
                                )} د.ج`}
                          </span>
                        </div>

                        {/* Profit Display */}
                        <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 px-4 py-2 rounded-full">
                          <span className="text-sm font-medium text-yellow-800">
                            الربح:{" "}
                          </span>
                          <span className="text-lg font-bold text-yellow-900">
                            {getProfit(variant).toFixed(2)} د.ج
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => showDeleteConfirmation(variant.id)}
                        disabled={deletingVariant === variant.id}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {deletingVariant === variant.id ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-500"></div>
                        ) : (
                          <Trash2 size={20} />
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* Left Column - Images */}
                      <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl p-4 border border-gray-200 ">
                          <div className="flex items-center justify-between mb-4">
                            <h5 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                              <ImageIcon size={18} className="text-blue-600" />
                              صور المتغير
                            </h5>
                            <label className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 cursor-pointer flex items-center gap-2 font-medium shadow-md hover:shadow-lg">
                              <Upload size={16} />
                              رفع صور
                              <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={(e) =>
                                  handleVariantImageUpload(variant.id, e)
                                }
                                className="hidden"
                              />
                            </label>
                          </div>

                          {errors[`variant_images_${index}`] && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                              <p className="text-red-700 text-sm font-medium">
                                {errors[`variant_images_${index}`]}
                              </p>
                            </div>
                          )}

                          {variant.images.length > 0 ? (
                            <div className="space-y-4">
                              {/* Main Image */}
                              <div className="relative group">
                                <img
                                  src={
                                    variant.images[variant.mainImageIndex]
                                      ?.preview
                                  }
                                  alt={`متغير ${index + 1} - الصورة الرئيسية`}
                                  className="w-full h-48 object-cover rounded-lg border-4 border-blue-500 shadow-md"
                                />
                                <div className="absolute top-2 right-2 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                                  <Star size={14} className="fill-current" />
                                  رئيسية
                                </div>
                                {variant.images[variant.mainImageIndex]
                                  ?.existing && (
                                  <div className="absolute top-2 left-2 bg-gray-800 text-white px-2 py-1 rounded-full text-xs font-bold">
                                    محفوظة
                                  </div>
                                )}
                                {/* Delete button for main image */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeVariantImage(
                                      variant.id,
                                      variant.mainImageIndex
                                    );
                                  }}
                                  title="حذف الصورة"
                                  className="absolute bottom-2 left-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>

                              {/* Thumbnail Images */}
                              {variant.images.length > 1 && (
                                <div className="grid grid-cols-3 gap-2">
                                  {variant.images.map((image, imageIndex) => (
                                    <div
                                      key={imageIndex}
                                      className={`relative group border-2 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${
                                        variant.mainImageIndex === imageIndex
                                          ? "border-blue-500 ring-2 ring-blue-200"
                                          : "border-gray-200 hover:border-blue-300"
                                      }`}
                                    >
                                      <img
                                        src={image.preview}
                                        alt={`متغير ${index + 1} - صورة ${
                                          imageIndex + 1
                                        }`}
                                        className="w-full h-16 object-cover"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setVariantMainImage(
                                            variant.id,
                                            imageIndex
                                          );
                                        }}
                                      />
                                      {image.existing && (
                                        <div className="absolute top-1 left-1 bg-gray-800 text-white px-1 py-0.5 rounded text-xs font-bold">
                                          محفوظة
                                        </div>
                                      )}
                                      <div className="absolute inset-0 bg-black bg-opacity-60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                        {variant.mainImageIndex !==
                                          imageIndex && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setVariantMainImage(
                                                variant.id,
                                                imageIndex
                                              );
                                            }}
                                            title="جعل رئيسية"
                                            className="bg-blue-500 hover:bg-blue-600 text-white p-1.5 rounded transition-colors"
                                          >
                                            <Star size={12} />
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            removeVariantImage(
                                              variant.id,
                                              imageIndex
                                            );
                                          }}
                                          title="حذف"
                                          className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded transition-colors"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-12 text-gray-400">
                              <ImageIcon
                                size={48}
                                className="mx-auto mb-3 text-gray-300"
                              />
                              <p className="font-medium">لا توجد صور</p>
                              <p className="text-sm">
                                انقر على "رفع صور" لإضافة الصور
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Column - Form Fields */}
                      <div className="lg:col-span-2 space-y-6">
                        {/* Basic Info */}
                        <div className="bg-white rounded-xl p-4 border border-gray-200 ">
                          <h6 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Tag size={18} className="text-green-600" />
                            المعلومات الأساسية
                          </h6>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-3">
                              <label className="block text-sm font-bold text-gray-700 mb-2">
                                عنوان المتغير *
                              </label>
                              <input
                                type="text"
                                value={variant.title}
                                onChange={(e) =>
                                  updateVariant(
                                    variant.id,
                                    "title",
                                    e.target.value
                                  )
                                }
                                className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                                  errors[`variant_title_${index}`]
                                    ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                                    : "border-gray-300"
                                }`}
                                placeholder="مثال: حجم كبير، لون أحمر"
                              />
                              {errors[`variant_title_${index}`] && (
                                <p className="text-red-500 text-sm mt-1 font-medium">
                                  {errors[`variant_title_${index}`]}
                                </p>
                              )}
                            </div>

                            <div>
                              <label className="block text-sm font-bold text-gray-700 mb-2">
                                السعر الأولي * (د.ج)
                              </label>
                              <div className="relative">
                                <DollarSign
                                  size={20}
                                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                />
                                <input
                                  type="number"
                                  value={variant.initial_price}
                                  onChange={(e) =>
                                    updateVariant(
                                      variant.id,
                                      "initial_price",
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  min="0"
                                  step="0.01"
                                  className={`w-full px-4 py-3 pl-12 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                                    errors[`variant_initial_price_${index}`]
                                      ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                                      : "border-gray-300"
                                  }`}
                                  placeholder="0.00"
                                />
                              </div>
                              {errors[`variant_initial_price_${index}`] && (
                                <p className="text-red-500 text-sm mt-1 font-medium">
                                  {errors[`variant_initial_price_${index}`]}
                                </p>
                              )}
                            </div>

                            <div>
                              <label className="block text-sm font-bold text-gray-700 mb-2">
                                الربح * (د.ج)
                              </label>
                              <div className="relative">
                                <TrendingUp
                                  size={20}
                                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                />
                                <input
                                  type="number"
                                  value={variant.profit}
                                  onChange={(e) =>
                                    updateVariant(
                                      variant.id,
                                      "profit",
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  min="0"
                                  step="0.01"
                                  className={`w-full px-4 py-3 pl-12 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                                    errors[`variant_profit_${index}`]
                                      ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                                      : "border-gray-300"
                                  }`}
                                  placeholder="0.00"
                                />
                              </div>
                              {errors[`variant_profit_${index}`] && (
                                <p className="text-red-500 text-sm mt-1 font-medium">
                                  {errors[`variant_profit_${index}`]}
                                </p>
                              )}
                            </div>

                            <div>
                              <label className="block text-sm font-bold text-gray-700 mb-2">
                                خصم عند شراء اكثر من منتج (%)
                              </label>
                              <div className="relative">
                                <Tag
                                  size={20}
                                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                />
                                <input
                                  type="number"
                                  value={variant.discountPercentage || ""}
                                  onChange={(e) =>
                                    updateVariant(
                                      variant.id,
                                      "discountPercentage",
                                      e.target.value
                                        ? parseFloat(e.target.value)
                                        : null
                                    )
                                  }
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  className="w-full px-4 py-3 pl-12 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                  placeholder="0.00"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Size & Measurement */}
                        <div className="bg-white rounded-xl p-4 border border-gray-200 ">
                          <h6 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Ruler size={18} className="text-purple-600" />
                            القياسات والوحدات
                          </h6>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-bold text-gray-700 mb-2">
                                وحدة القياس
                              </label>
                              <select
                                value={variant.measure_unit}
                                onChange={(e) =>
                                  updateVariant(
                                    variant.id,
                                    "measure_unit",
                                    e.target.value
                                  )
                                }
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                              >
                                <option value="" disabled>
                                  اختر الوحدة
                                </option>
                                <optgroup label="وحدات الوزن">
                                  <option value="piece">قطعة</option>
                                  <option value="kilogram">كيلوغرام</option>
                                  <option value="gram">غرام</option>
                                  <option value="milligram">ميليغرام</option>
                                </optgroup>
                                <optgroup label="وحدات الحجم">
                                  <option value="liter">لتر</option>
                                  <option value="milliliter">مليلتر</option>
                                  <option value="cubic_meter">متر مكعب</option>
                                  <option value="cubic_centimeter">
                                    سم مكعب
                                  </option>
                                </optgroup>
                                <optgroup label="وحدات الطول">
                                  <option value="meter">متر</option>
                                  <option value="centimeter">سم</option>
                                  <option value="millimeter">مم</option>
                                </optgroup>
                                <optgroup label="وحدات كهربائية">
                                  <option value="celsius">درجة مئوية</option>
                                  <option value="ampere">أمبير</option>
                                  <option value="milliampere">
                                    ميلي أمبير
                                  </option>
                                  <option value="volt">فولت</option>
                                  <option value="watt">واط</option>
                                  <option value="kilowatt">كيلوواط</option>
                                  <option value="megawatt">ميغاواط</option>
                                  <option value="ohm">أوم</option>
                                  <option value="farad">فاراد</option>
                                  <option value="henry">هنري</option>
                                  <option value="hertz">هرتز</option>
                                  <option value="kilohertz">كيلوهرتز</option>
                                  <option value="megahertz">ميغاهرتز</option>
                                </optgroup>
                                <optgroup label="وحدات التعبئة والتغليف">
                                  <option value="box">علبة</option>
                                  <option value="bottle">زجاجة</option>
                                  <option value="bag">كيس</option>
                                  <option value="pack">عبوة</option>
                                  <option value="roll">لفة</option>
                                  <option value="dozen">دزينة</option>
                                </optgroup>
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-bold text-gray-700 mb-2">
                                الحجم/المقاس
                              </label>
                              <input
                                type="text"
                                value={variant.size}
                                onChange={(e) =>
                                  updateVariant(
                                    variant.id,
                                    "size",
                                    e.target.value
                                  )
                                }
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                placeholder="مثال: صغير، 500غ، 10x20سم"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Discount Section */}
                        <div className="bg-white rounded-xl p-4 border border-gray-200 ">
                          <h6 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Tag size={18} className="text-red-600" />
                            إعدادات الخصم (اختياري)
                          </h6>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-bold text-gray-700 mb-2">
                                سعر الخصم (د.ج)
                              </label>
                              <div className="relative">
                                <Tag
                                  size={20}
                                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                />
                                <input
                                  type="number"
                                  value={variant.discount_price || ""}
                                  onChange={(e) =>
                                    updateVariant(
                                      variant.id,
                                      "discount_price",
                                      e.target.value
                                        ? parseFloat(e.target.value)
                                        : null
                                    )
                                  }
                                  min="0"
                                  step="0.01"
                                  className={`w-full px-4 py-3 pl-12 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                                    errors[`variant_discount_${index}`]
                                      ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                                      : "border-gray-300"
                                  }`}
                                  placeholder="0.00"
                                />
                              </div>
                              {errors[`variant_discount_${index}`] && (
                                <p className="text-red-500 text-sm mt-1 font-medium">
                                  {errors[`variant_discount_${index}`]}
                                </p>
                              )}
                            </div>

                            <div>
                              <label className="block text-sm font-bold text-gray-700 mb-2">
                                بداية الخصم
                              </label>
                              <div className="relative">
                                <Calendar
                                  size={20}
                                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                />
                                <input
                                  type="date"
                                  value={variant.discount_start || ""}
                                  onChange={(e) =>
                                    updateVariant(
                                      variant.id,
                                      "discount_start",
                                      e.target.value
                                    )
                                  }
                                  className="w-full px-4 py-3 pl-12 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-bold text-gray-700 mb-2">
                                نهاية الخصم
                              </label>
                              <div className="relative">
                                <Calendar
                                  size={20}
                                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                />
                                <input
                                  type="date"
                                  value={variant.discount_end || ""}
                                  onChange={(e) =>
                                    updateVariant(
                                      variant.id,
                                      "discount_end",
                                      e.target.value
                                    )
                                  }
                                  className="w-full px-4 py-3 pl-12 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Status Section */}
                        <div className="bg-white rounded-xl p-4 border border-gray-200 ">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Eye size={18} className="text-gray-600" />
                              <span className="text-lg font-bold text-gray-900">
                                حالة المتغير
                              </span>
                            </div>

                            {/* Enhanced Toggle Switch */}
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={variant.is_active}
                                onChange={(e) =>
                                  updateVariant(
                                    variant.id,
                                    "is_active",
                                    e.target.checked
                                  )
                                }
                                className="sr-only peer"
                              />
                              <div className="relative w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-green-400 peer-checked:to-green-500 shadow-lg"></div>
                              <span
                                className={`mr-3 text-sm font-bold ${
                                  variant.is_active
                                    ? "text-green-600"
                                    : "text-gray-500"
                                }`}
                              >
                                {variant.is_active ? "نشط" : "غير نشط"}
                              </span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {variants.length === 0 && (
                  <div className="text-center py-16 text-gray-500">
                    <Package size={64} className="mx-auto mb-6 text-gray-300" />
                    <h3 className="text-2xl font-bold text-gray-400 mb-2">
                      لا توجد متغيرات
                    </h3>
                    <p className="text-lg mb-2">لا توجد متغيرات لهذا المنتج</p>
                    <p className="text-sm">
                      انقر على "إضافة متغير جديد" لبدء إضافة المتغيرات
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  disabled={submitting}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <ArrowRight size={16} />
                  العودة
                </button>

                {hasAnyChanges() && (
                  <button
                    type="button"
                    onClick={resetChanges}
                    disabled={submitting}
                    className="px-6 py-3 border-2 border-yellow-300 text-yellow-700 rounded-xl hover:bg-yellow-50 hover:border-yellow-400 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <RefreshCw size={16} />
                    إلغاء التغييرات
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4">
                {hasAnyChanges() && (
                  <div className="flex items-center gap-2 text-yellow-600">
                    <AlertTriangle size={16} />
                    <span className="text-sm font-medium">
                      {variants.filter((v) => v.hasChanges || v.isNew).length}{" "}
                      تغييرات غير محفوظة
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !hasAnyChanges()}
                  className="px-12 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      حفظ التغييرات
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Delete Confirmation Modal */}
        {deleteConfirmModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            dir="rtl"
          >
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all">
              <div className="p-6">
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full">
                  <AlertTriangle size={32} className="text-red-600" />
                </div>

                <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                  تأكيد حذف المتغير
                </h3>

                <div className="text-center mb-6">
                  <p className="text-gray-600 mb-4">
                    هل أنت متأكد من حذف المتغير "
                    {deleteConfirmModal.variant?.title || "بدون عنوان"}"؟
                  </p>

                  {deleteConfirmModal.variant?.orders?.hasOrders && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-center mb-2">
                        <AlertTriangle
                          size={20}
                          className="text-red-600 ml-2"
                        />
                        <span className="font-bold text-red-800">
                          تحذير مهم!
                        </span>
                      </div>
                      <p className="text-red-700 text-sm font-medium mb-2">
                        حذف هذا المتغير سيؤدي إلى حذف جميع الطلبات المرتبطة به
                      </p>
                      <div className="text-red-600 text-sm">
                        <p>
                          • عدد الطلبات:{" "}
                          {deleteConfirmModal.variant.orders.totalOrders}
                        </p>
                        <p>
                          • إجمالي الكمية المطلوبة:{" "}
                          {
                            deleteConfirmModal.variant.orders
                              .totalQuantityOrdered
                          }{" "}
                          قطعة
                        </p>
                      </div>
                    </div>
                  )}

                  <p className="text-sm text-gray-500">
                    هذا الإجراء لا يمكن التراجع عنه
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirmModal(null)}
                    disabled={deletingVariant === deleteConfirmModal.variantId}
                    className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={() => deleteVariant(deleteConfirmModal.variantId)}
                    disabled={deletingVariant === deleteConfirmModal.variantId}
                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {deletingVariant === deleteConfirmModal.variantId ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        جاري الحذف...
                      </>
                    ) : (
                      <>
                        <Trash2 size={16} />
                        حذف نهائياً
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditProductVariant;
