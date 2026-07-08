import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
    Percent,
} from 'lucide-react';
import { useApi } from '@/contexts/RestContext';
import { toast } from 'sonner';

const AddProductVariant = () => {
    const { productId } = useParams();
    const navigate = useNavigate();
    const { api } = useApi();

    const [product, setProduct] = useState(null);
    const [loadingProduct, setLoadingProduct] = useState(true);
    const [variants, setVariants] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    // Fetch product details on component mount
    useEffect(() => {
        if (productId) {
            fetchProduct();
        }
    }, [productId]);

    const fetchProduct = async () => {
        try {
            setLoadingProduct(true);
            const [data, _, responseCode, error] = await api.get(
                `/product/get/${productId}`
            );

            if (responseCode === 200 && data) {
                setProduct(data);
                addVariant(data);
            } else {
                console.error('Error fetching product:', error);
                toast.error('خطأ في تحميل المنتج', {
                    description: 'لم يتم العثور على المنتج المحدد',
                    duration: 4000,
                });
            }
        } catch (error) {
            console.error('Error fetching product:', error);
            toast.error('خطأ في الاتصال', {
                description: 'تعذر تحميل بيانات المنتج',
                duration: 4000,
            });
            navigate(-1);
        } finally {
            setLoadingProduct(false);
        }
    };

    const addVariant = (productData = product) => {
        if (!productData) return;

        const baseInitialPrice = parseFloat(productData.price || 0);
        const discountPrice = productData.discount_price
            ? parseFloat(productData.discount_price)
            : null;

        const newVariant = {
            id: Date.now(),
            title: '',
            initial_price: baseInitialPrice,
            profit: 0,
            discount_price: discountPrice,
            discount_start: productData.discount_start || '',
            discount_end: productData.discount_end || '',
            measure_unit: '',
            size: '',
            images: [],
            mainImageIndex: 0,
            is_active: true,
            bulk_discount_percentage: 0,
            prod_ref: '',
            discount_threshold: null,
            allows_custom_quantity: false,
        };

        setVariants(prev => [...prev, newVariant]);
    };

    const removeVariant = variantId => {
        setVariants(prev => prev.filter(variant => variant.id !== variantId));
        toast.success('تم حذف المتغير', {
            description: 'تم حذف متغير المنتج بنجاح',
            duration: 2000,
        });
    };

    const updateVariant = (variantId, field, value) => {
        setVariants(prev =>
            prev.map(variant =>
                variant.id === variantId
                    ? { ...variant, [field]: value, hasChanges: true }
                    : variant
            )
        );
    };

    // حساب السعر النهائي
    const calculateFinalPrice = variant => {
        const initialPrice = parseFloat(variant.initial_price) || 0;
        const profit = parseFloat(variant.profit) || 0;
        return initialPrice + profit;
    };

    // حساب الربح (للعرض فقط)
    const getProfit = variant => {
        return parseFloat(variant.profit) || 0;
    };

    const handleVariantImageUpload = (variantId, e) => {
        const files = Array.from(e.target.files).slice(0, 5);
        const validImages = [];
        let hasErrors = false;

        files.forEach(file => {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('خطأ في رفع الصورة', {
                    description: `الصورة ${file.name} تتجاوز حد 5 ميجابايت`,
                    duration: 4000,
                });
                hasErrors = true;
                return;
            }
            if (!file.type.startsWith('image/')) {
                toast.error('نوع ملف غير صالح', {
                    description: `${file.name} ليس ملف صورة صالح`,
                    duration: 4000,
                });
                hasErrors = true;
                return;
            }

            const reader = new FileReader();
            reader.onload = event => {
                validImages.push({
                    file,
                    preview: event.target.result,
                    name: file.name,
                });

                if (
                    validImages.length ===
                    files.filter(
                        f =>
                            f.size <= 5 * 1024 * 1024 &&
                            f.type.startsWith('image/')
                    ).length
                ) {
                    setVariants(prev =>
                        prev.map(variant =>
                            variant.id === variantId
                                ? {
                                      ...variant,
                                      images: [
                                          ...variant.images,
                                          ...validImages,
                                      ],
                                  }
                                : variant
                        )
                    );

                    if (validImages.length > 0) {
                        toast.success('تم رفع الصور بنجاح', {
                            description: `تم رفع ${validImages.length} صورة للمتغير`,
                            duration: 3000,
                        });
                    }
                }
            };
            reader.readAsDataURL(file);
        });
    };

    const removeVariantImage = (variantId, imageIndex) => {
        setVariants(prev =>
            prev.map(variant =>
                variant.id === variantId
                    ? {
                          ...variant,
                          images: variant.images.filter(
                              (_, i) => i !== imageIndex
                          ),
                          mainImageIndex:
                              variant.mainImageIndex === imageIndex
                                  ? 0
                                  : variant.mainImageIndex > imageIndex
                                    ? variant.mainImageIndex - 1
                                    : variant.mainImageIndex,
                      }
                    : variant
            )
        );
    };

    const setVariantMainImage = (variantId, imageIndex) => {
        setVariants(prev =>
            prev.map(variant =>
                variant.id === variantId
                    ? { ...variant, mainImageIndex: imageIndex }
                    : variant
            )
        );
    };

    const validateForm = () => {
        const newErrors = {};

        if (variants.length === 0) {
            newErrors.variants = 'يجب إضافة متغير واحد على الأقل';
        }

        variants.forEach((variant, index) => {
            if (!variant.title.trim()) {
                newErrors[`variant_title_${index}`] = 'عنوان المتغير مطلوب';
            }
            if (!variant.initial_price || variant.initial_price <= 0) {
                newErrors[`variant_initial_price_${index}`] =
                    'السعر الأولي مطلوب';
            }
            if (variant.profit < 0) {
                newErrors[`variant_profit_${index}`] =
                    'الربح لا يمكن أن يكون سالباً';
            }

            const finalPrice = calculateFinalPrice(variant);
            if (
                variant.discount_price &&
                variant.discount_price >= finalPrice
            ) {
                newErrors[`variant_discount_${index}`] =
                    'سعر الخصم يجب أن يكون أقل من السعر النهائي';
            }
        });

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
            toast.error('خطأ في التحقق من البيانات', {
                description: 'يرجى تصحيح الأخطاء في النموذج قبل المتابعة',
                duration: 4000,
            });
        }

        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async e => {
        e.preventDefault();
        if (!validateForm()) return;

        setSubmitting(true);

        const loadingToast = toast('جاري إضافة المتغيرات...', {
            description: 'يتم الآن رفع البيانات والصور',
            duration: 500,
            style: {
                background: '#1d4ed8',
                color: '#ffffff',
                direction: 'rtl',
                textAlign: 'right',
            },
        });

        try {
            const formDataToSend = new FormData();

            // Add product ID
            formDataToSend.append('product_id', productId);

            // Add variants data
            formDataToSend.append(
                'variants',
                JSON.stringify(
                    variants.map(variant => ({
                        title: variant.title,
                        initial_price: variant.initial_price,
                        profit: variant.profit,
                        discount_price: variant.discount_price,
                        discount_start: variant.discount_start,
                        discount_end: variant.discount_end,
                        measure_unit: variant.measure_unit,
                        size: variant.size,
                        is_active: variant.is_active,
                        main_image_index: variant.mainImageIndex,
                        bulk_discount_percentage:
                            variant.bulk_discount_percentage,
                        prod_ref: variant.prod_ref || null,
                        discount_threshold: variant.discount_threshold || null,
                        allows_custom_quantity:
                            variant.allows_custom_quantity || false,
                    }))
                )
            );

            // Add variant images
            variants.forEach((variant, variantIndex) => {
                variant.images.forEach((image, imageIndex) => {
                    formDataToSend.append(
                        `variant_images_${variantIndex}`,
                        image.file
                    );
                });
            });

            const [data, _, responseCode, error] = await api.post(
                '/product/add/variant',
                formDataToSend,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                    withCredentials: true,
                }
            );

            if (responseCode === 200 || responseCode === 201) {
                toast.success(data.message || 'تم إضافة المتغيرات بنجاح! 🎉', {
                    description:
                        data.description || 'تم حفظ جميع متغيرات المنتج بنجاح',
                    duration: 5000,
                    style: {
                        background: '#22c55e',
                        color: '#ffffff',
                        direction: 'rtl',
                        textAlign: 'right',
                    },
                });
                navigate(-1);
            } else {
                handleApiError(error, error.response?.data);
            }
        } catch (error) {
            toast.dismiss(loadingToast);
            console.error('Error adding variants:', error);
            toast.error('خطأ في الاتصال', {
                description:
                    'تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.',
                duration: 6000,
                style: {
                    background: '#ef4444',
                    color: '#ffffff',
                    direction: 'rtl',
                    textAlign: 'right',
                },
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleApiError = (error, data) => {
        let errorMessage = 'خطأ في إضافة المتغيرات';
        let errorDescription =
            'حدث خطأ أثناء إضافة متغيرات المنتج. يرجى المحاولة مرة أخرى.';

        if (data?.message) {
            errorMessage = data.message;
            errorDescription = data.description || errorDescription;
        } else if (error?.message) {
            errorMessage = 'خطأ في النظام';
            errorDescription = error.message;
        }

        toast.error(errorMessage, {
            description: errorDescription,
            duration: 6000,
            style: {
                background: '#ef4444',
                color: '#ffffff',
                direction: 'rtl',
                textAlign: 'right',
            },
        });
    };

    const resetForm = () => {
        setVariants([]);
        setErrors({});
        if (product) {
            addVariant(product);
        }
    };

    if (loadingProduct) {
        return (
            <div
                className="min-h-screen p-4 sm:p-6 lg:p-8 flex items-center justify-center bg-gray-50"
                dir="rtl"
            >
                <div className="text-center bg-white p-8 rounded-xl ">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600 text-lg">
                        جاري تحميل بيانات المنتج...
                    </p>
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
                    <p className="text-gray-600 mb-4">
                        لم يتم العثور على المنتج المحدد
                    </p>
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

    return (
        <div className="min-h-screen " dir="rtl">
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
                                إضافة متغيرات للمنتج
                            </h1>
                            <p className="text-xl text-blue-600 mt-1 font-medium">
                                {product.name}
                            </p>
                        </div>
                    </div>

                    {/* Product Info Card */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 ">
                        <h3 className="font-bold text-blue-900 mb-4 text-lg flex items-center gap-2">
                            <Package size={20} />
                            معلومات المنتج الأساسية
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white p-4 rounded-lg ">
                                <div className="flex items-center gap-2 mb-2">
                                    <DollarSign
                                        size={16}
                                        className="text-green-600"
                                    />
                                    <span className="text-gray-700 font-medium">
                                        السعر الاصلي
                                    </span>
                                </div>
                                <span className="text-2xl font-bold text-green-600">
                                    {product.price} د.ج
                                </span>
                            </div>
                            {product.discount_price && (
                                <div className="bg-white p-4 rounded-lg ">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Tag
                                            size={16}
                                            className="text-red-600"
                                        />
                                        <span className="text-gray-700 font-medium">
                                            سعر الخصم
                                        </span>
                                    </div>
                                    <span className="text-2xl font-bold text-red-600">
                                        {product.discount_price} د.ج
                                    </span>
                                </div>
                            )}
                            <div className="bg-white p-4 rounded-lg ">
                                <div className="flex items-center gap-2 mb-2">
                                    <Package
                                        size={16}
                                        className="text-blue-600"
                                    />
                                    <span className="text-gray-700 font-medium">
                                        الفئة
                                    </span>
                                </div>
                                <span className="text-lg font-semibold text-blue-600">
                                    {product.category.name}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <form
                    onSubmit={handleSubmit}
                    autoComplete="off"
                    className="space-y-8"
                >
                    {/* Variants Section */}
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                        <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                                    <Package
                                        size={24}
                                        className="text-blue-600"
                                    />
                                    متغيرات المنتج
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => addVariant()}
                                    className="px-6  py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center gap-2 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                >
                                    <Plus size={18} />
                                    إضافة متغير جديد
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            {errors.variants && (
                                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
                                    <p className="text-red-700 font-medium">
                                        {errors.variants}
                                    </p>
                                </div>
                            )}

                            <div className="space-y-8">
                                {variants.map((variant, index) => (
                                    <div
                                        key={variant.id}
                                        className="border-2 border-gray-200 rounded-xl p-6 hover:border-blue-300 transition-colors bg-gray-50"
                                    >
                                        {/* Variant Header */}
                                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                    <span className="font-bold text-blue-600">
                                                        {index + 1}
                                                    </span>
                                                </div>
                                                <h4 className="text-xl font-bold text-gray-900">
                                                    المتغير {index + 1}
                                                </h4>
                                                {/* Final Price Display */}
                                                <div className="bg-gradient-to-r from-green-100 to-green-200 px-4 py-2 rounded-full">
                                                    <span className="text-sm font-medium text-green-800">
                                                        السعر النهائي:{' '}
                                                    </span>
                                                    <span className="text-lg font-bold text-green-900">
                                                        {variant.discount_price &&
                                                        variant.discount_price >
                                                            0
                                                            ? `${variant.discount_price.toFixed(2)} د.ج`
                                                            : `${calculateFinalPrice(variant).toFixed(2)} د.ج`}
                                                    </span>
                                                </div>
                                                {/* Profit Display */}
                                                <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 px-4 py-2 rounded-full">
                                                    <span className="text-sm font-medium text-yellow-800">
                                                        الربح:{' '}
                                                    </span>
                                                    <span className="text-lg font-bold text-yellow-900">
                                                        {getProfit(
                                                            variant
                                                        ).toFixed(2)}{' '}
                                                        د.ج
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeVariant(variant.id)
                                                }
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all duration-200"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                            {/* Left Column - Images */}
                                            <div className="lg:col-span-1">
                                                <div className="bg-white rounded-xl p-4 border border-gray-200 ">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h5 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                                            <ImageIcon
                                                                size={18}
                                                                className="text-blue-600"
                                                            />
                                                            صور المتغير
                                                        </h5>
                                                        <label className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 cursor-pointer flex items-center gap-2 font-medium shadow-md hover:shadow-lg">
                                                            <Upload size={16} />
                                                            رفع صور
                                                            <input
                                                                type="file"
                                                                multiple
                                                                accept="image/*"
                                                                onChange={e =>
                                                                    handleVariantImageUpload(
                                                                        variant.id,
                                                                        e
                                                                    )
                                                                }
                                                                className="hidden"
                                                            />
                                                        </label>
                                                    </div>

                                                    {variant.images.length >
                                                    0 ? (
                                                        <div className="space-y-4">
                                                            {/* Main Image */}
                                                            <div className="relative">
                                                                <img
                                                                    src={
                                                                        variant
                                                                            .images[
                                                                            variant
                                                                                .mainImageIndex
                                                                        ]
                                                                            ?.preview
                                                                    }
                                                                    alt={`متغير ${index + 1} - الصورة الرئيسية`}
                                                                    className="w-full h-48 object-cover rounded-lg border-4 border-blue-500 shadow-md"
                                                                />
                                                                <div className="absolute top-2 right-2 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                                                                    <Star
                                                                        size={
                                                                            14
                                                                        }
                                                                        className="fill-current"
                                                                    />
                                                                    رئيسية
                                                                </div>
                                                            </div>

                                                            {/* Thumbnail Images */}
                                                            {variant.images
                                                                .length > 1 && (
                                                                <div className="grid grid-cols-3 gap-2">
                                                                    {variant.images.map(
                                                                        (
                                                                            image,
                                                                            imageIndex
                                                                        ) => (
                                                                            <div
                                                                                key={
                                                                                    imageIndex
                                                                                }
                                                                                className={`relative group border-2 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${
                                                                                    variant.mainImageIndex ===
                                                                                    imageIndex
                                                                                        ? 'border-blue-500 ring-2 ring-blue-200'
                                                                                        : 'border-gray-200 hover:border-blue-300'
                                                                                }`}
                                                                            >
                                                                                <img
                                                                                    src={
                                                                                        image.preview
                                                                                    }
                                                                                    alt={`متغير ${index + 1} - صورة ${
                                                                                        imageIndex +
                                                                                        1
                                                                                    }`}
                                                                                    className="w-full h-16 object-cover"
                                                                                    onClick={() =>
                                                                                        setVariantMainImage(
                                                                                            variant.id,
                                                                                            imageIndex
                                                                                        )
                                                                                    }
                                                                                />
                                                                                <div className="absolute inset-0 bg-black bg-opacity-60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                                                                    {variant.mainImageIndex !==
                                                                                        imageIndex && (
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() =>
                                                                                                setVariantMainImage(
                                                                                                    variant.id,
                                                                                                    imageIndex
                                                                                                )
                                                                                            }
                                                                                            title="جعل رئيسية"
                                                                                            className="bg-blue-500 hover:bg-blue-600 text-white p-1.5 rounded transition-colors"
                                                                                        >
                                                                                            <Star
                                                                                                size={
                                                                                                    12
                                                                                                }
                                                                                            />
                                                                                        </button>
                                                                                    )}
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() =>
                                                                                            removeVariantImage(
                                                                                                variant.id,
                                                                                                imageIndex
                                                                                            )
                                                                                        }
                                                                                        title="حذف"
                                                                                        className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded transition-colors"
                                                                                    >
                                                                                        <Trash2
                                                                                            size={
                                                                                                12
                                                                                            }
                                                                                        />
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        )
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-12 text-gray-400">
                                                            <ImageIcon
                                                                size={48}
                                                                className="mx-auto mb-3 text-gray-300"
                                                            />
                                                            <p className="font-medium">
                                                                لا توجد صور
                                                            </p>
                                                            <p className="text-sm">
                                                                انقر على "رفع
                                                                صور" لإضافة
                                                                الصور
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
                                                        <Tag
                                                            size={18}
                                                            className="text-green-600"
                                                        />
                                                        المعلومات الأساسية
                                                    </h6>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="md:col-span-2">
                                                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                                                عنوان المتغير *
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={
                                                                    variant.title
                                                                }
                                                                onChange={e =>
                                                                    updateVariant(
                                                                        variant.id,
                                                                        'title',
                                                                        e.target
                                                                            .value
                                                                    )
                                                                }
                                                                className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                                                                    errors[
                                                                        `variant_title_${index}`
                                                                    ]
                                                                        ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                                                                        : 'border-gray-300'
                                                                }`}
                                                                placeholder="مثال: حجم كبير، لون أحمر"
                                                            />
                                                            {errors[
                                                                `variant_title_${index}`
                                                            ] && (
                                                                <p className="text-red-500 text-sm mt-1 font-medium">
                                                                    {
                                                                        errors[
                                                                            `variant_title_${index}`
                                                                        ]
                                                                    }
                                                                </p>
                                                            )}
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                                                السعر الأولي *
                                                                (د.ج)
                                                            </label>
                                                            <div className="relative">
                                                                <DollarSign
                                                                    size={20}
                                                                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                                                />
                                                                <input
                                                                    type="number"
                                                                    value={
                                                                        variant.initial_price
                                                                    }
                                                                    onChange={e =>
                                                                        updateVariant(
                                                                            variant.id,
                                                                            'initial_price',
                                                                            parseFloat(
                                                                                e
                                                                                    .target
                                                                                    .value
                                                                            ) ||
                                                                                0
                                                                        )
                                                                    }
                                                                    min="0"
                                                                    step="0.01"
                                                                    className={`w-full px-4 py-3 pl-12 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                                                                        errors[
                                                                            `variant_initial_price_${index}`
                                                                        ]
                                                                            ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                                                                            : 'border-gray-300'
                                                                    }`}
                                                                    placeholder="0.00"
                                                                />
                                                            </div>
                                                            {errors[
                                                                `variant_initial_price_${index}`
                                                            ] && (
                                                                <p className="text-red-500 text-sm mt-1 font-medium">
                                                                    {
                                                                        errors[
                                                                            `variant_initial_price_${index}`
                                                                        ]
                                                                    }
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
                                                                    value={
                                                                        variant.profit
                                                                    }
                                                                    onChange={e =>
                                                                        updateVariant(
                                                                            variant.id,
                                                                            'profit',
                                                                            parseFloat(
                                                                                e
                                                                                    .target
                                                                                    .value
                                                                            ) ||
                                                                                0
                                                                        )
                                                                    }
                                                                    min="0"
                                                                    step="0.01"
                                                                    className={`w-full px-4 py-3 pl-12 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                                                                        errors[
                                                                            `variant_profit_${index}`
                                                                        ]
                                                                            ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                                                                            : 'border-gray-300'
                                                                    }`}
                                                                    placeholder="0.00"
                                                                />
                                                            </div>
                                                            {errors[
                                                                `variant_profit_${index}`
                                                            ] && (
                                                                <p className="text-red-500 text-sm mt-1 font-medium">
                                                                    {
                                                                        errors[
                                                                            `variant_profit_${index}`
                                                                        ]
                                                                    }
                                                                </p>
                                                            )}
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                                                رقم المرجع
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={
                                                                    variant.prod_ref ||
                                                                    ''
                                                                }
                                                                onChange={e =>
                                                                    updateVariant(
                                                                        variant.id,
                                                                        'prod_ref',
                                                                        e.target
                                                                            .value
                                                                    )
                                                                }
                                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                                                placeholder="أدخل رقم المرجع"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                                                حد الخصم
                                                                (الكمية)
                                                            </label>
                                                            <input
                                                                type="number"
                                                                value={
                                                                    variant.discount_threshold ||
                                                                    ''
                                                                }
                                                                onChange={e =>
                                                                    updateVariant(
                                                                        variant.id,
                                                                        'discount_threshold',
                                                                        parseInt(
                                                                            e
                                                                                .target
                                                                                .value
                                                                        ) ||
                                                                            null
                                                                    )
                                                                }
                                                                min="1"
                                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                                                placeholder="أدخل الحد الأدنى للكمية"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Size & Measurement */}
                                                <div className="bg-white rounded-xl p-4 border border-gray-200 ">
                                                    <h6 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                                        <Ruler
                                                            size={18}
                                                            className="text-purple-600"
                                                        />
                                                        القياسات والوحدات
                                                    </h6>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                                                وحدة القياس
                                                            </label>
                                                            <select
                                                                value={
                                                                    variant.measure_unit
                                                                }
                                                                onChange={e =>
                                                                    updateVariant(
                                                                        variant.id,
                                                                        'measure_unit',
                                                                        e.target
                                                                            .value
                                                                    )
                                                                }
                                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                                            >
                                                                <option
                                                                    value=""
                                                                    disabled
                                                                >
                                                                    اختر الوحدة
                                                                </option>
                                                                <optgroup label="وحدات الوزن">
                                                                    <option value="piece">
                                                                        قطعة
                                                                    </option>
                                                                    <option value="kilogram">
                                                                        كيلوغرام
                                                                    </option>
                                                                    <option value="gram">
                                                                        غرام
                                                                    </option>
                                                                    <option value="milligram">
                                                                        ميليغرام
                                                                    </option>
                                                                </optgroup>
                                                                <optgroup label="وحدات الحجم">
                                                                    <option value="liter">
                                                                        لتر
                                                                    </option>
                                                                    <option value="milliliter">
                                                                        مليلتر
                                                                    </option>
                                                                    <option value="cubic_meter">
                                                                        متر مكعب
                                                                    </option>
                                                                    <option value="cubic_centimeter">
                                                                        سم مكعب
                                                                    </option>
                                                                </optgroup>
                                                                <optgroup label="وحدات الطول">
                                                                    <option value="meter">
                                                                        متر
                                                                    </option>
                                                                    <option value="centimeter">
                                                                        سم
                                                                    </option>
                                                                    <option value="millimeter">
                                                                        مم
                                                                    </option>
                                                                </optgroup>
                                                                <optgroup label="وحدات كهربائية">
                                                                    <option value="celsius">
                                                                        درجة
                                                                        مئوية
                                                                    </option>
                                                                    <option value="ampere">
                                                                        أمبير
                                                                    </option>
                                                                    <option value="milliampere">
                                                                        ميلي
                                                                        أمبير
                                                                    </option>
                                                                    <option value="volt">
                                                                        فولت
                                                                    </option>
                                                                    <option value="watt">
                                                                        واط
                                                                    </option>
                                                                    <option value="kilowatt">
                                                                        كيلوواط
                                                                    </option>
                                                                    <option value="megawatt">
                                                                        ميغاواط
                                                                    </option>
                                                                    <option value="ohm">
                                                                        أوم
                                                                    </option>
                                                                    <option value="farad">
                                                                        فاراد
                                                                    </option>
                                                                    <option value="henry">
                                                                        هنري
                                                                    </option>
                                                                    <option value="hertz">
                                                                        هرتز
                                                                    </option>
                                                                    <option value="kilohertz">
                                                                        كيلوهرتز
                                                                    </option>
                                                                    <option value="megahertz">
                                                                        ميغاهرتز
                                                                    </option>
                                                                </optgroup>
                                                                <optgroup label="وحدات التعبئة والتغليف">
                                                                    <option value="box">
                                                                        علبة
                                                                    </option>
                                                                    <option value="bottle">
                                                                        زجاجة
                                                                    </option>
                                                                    <option value="bag">
                                                                        كيس
                                                                    </option>
                                                                    <option value="pack">
                                                                        عبوة
                                                                    </option>
                                                                    <option value="roll">
                                                                        لفة
                                                                    </option>
                                                                    <option value="dozen">
                                                                        دزينة
                                                                    </option>
                                                                </optgroup>
                                                            </select>
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                                                الحجم/المقاس
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={
                                                                    variant.size
                                                                }
                                                                onChange={e =>
                                                                    updateVariant(
                                                                        variant.id,
                                                                        'size',
                                                                        e.target
                                                                            .value
                                                                    )
                                                                }
                                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                                                placeholder="مثال: صغير، 500غ، 10x20سم"
                                                            />
                                                        </div>
                                                    </div>
                                                    {variant.measure_unit && (
                                                        <div className="md:col-span-2 flex items-start gap-3 mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                                            <input
                                                                type="checkbox"
                                                                id={`allows_custom_quantity_${variant.id}`}
                                                                checked={
                                                                    variant.allows_custom_quantity ||
                                                                    false
                                                                }
                                                                onChange={e =>
                                                                    updateVariant(
                                                                        variant.id,
                                                                        'allows_custom_quantity',
                                                                        e.target
                                                                            .checked
                                                                    )
                                                                }
                                                                className="h-4 w-4 mt-0.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                                                            />
                                                            <label
                                                                htmlFor={`allows_custom_quantity_${variant.id}`}
                                                                className="text-sm text-gray-900 cursor-pointer"
                                                            >
                                                                <span className="font-medium block">
                                                                    السماح بكمية
                                                                    مخصصة
                                                                </span>
                                                                <span className="text-gray-500 text-xs">
                                                                    يسمح للعميل
                                                                    بإدخال كمية
                                                                    غير صحيحة
                                                                    (مثال: 2.5
                                                                    متر)
                                                                </span>
                                                            </label>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Discount Section */}
                                                <div className="bg-white rounded-xl p-4 border border-gray-200 ">
                                                    <h6 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                                        <Tag
                                                            size={18}
                                                            className="text-red-600"
                                                        />
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
                                                                    value={
                                                                        variant.discount_price ||
                                                                        ''
                                                                    }
                                                                    onChange={e =>
                                                                        updateVariant(
                                                                            variant.id,
                                                                            'discount_price',
                                                                            e
                                                                                .target
                                                                                .value
                                                                                ? parseFloat(
                                                                                      e
                                                                                          .target
                                                                                          .value
                                                                                  )
                                                                                : null
                                                                        )
                                                                    }
                                                                    min="0"
                                                                    step="0.01"
                                                                    className={`w-full px-4 py-3 pl-12 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                                                                        errors[
                                                                            `variant_discount_${index}`
                                                                        ]
                                                                            ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                                                                            : 'border-gray-300'
                                                                    }`}
                                                                    placeholder="0.00"
                                                                />
                                                            </div>
                                                            {errors[
                                                                `variant_discount_${index}`
                                                            ] && (
                                                                <p className="text-red-500 text-sm mt-1 font-medium">
                                                                    {
                                                                        errors[
                                                                            `variant_discount_${index}`
                                                                        ]
                                                                    }
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
                                                                    value={
                                                                        variant.discount_start ||
                                                                        ''
                                                                    }
                                                                    onChange={e =>
                                                                        updateVariant(
                                                                            variant.id,
                                                                            'discount_start',
                                                                            e
                                                                                .target
                                                                                .value
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
                                                                    value={
                                                                        variant.discount_end ||
                                                                        ''
                                                                    }
                                                                    onChange={e =>
                                                                        updateVariant(
                                                                            variant.id,
                                                                            'discount_end',
                                                                            e
                                                                                .target
                                                                                .value
                                                                        )
                                                                    }
                                                                    className="w-full px-4 py-3 pl-12 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Bulk Discount Section */}
                                                <div className="mt-4">
                                                    <label className=" text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                                        <Percent
                                                            size={18}
                                                            className="text-orange-500"
                                                        />
                                                        الخصم عند شراء اكثر من
                                                        منتج %
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            value={
                                                                variant.discountPercentage ||
                                                                ''
                                                            } // FIX: Handle null/undefined values
                                                            onChange={e =>
                                                                updateVariant(
                                                                    variant.id,
                                                                    'discountPercentage',
                                                                    e.target
                                                                        .value
                                                                        ? parseFloat(
                                                                              e
                                                                                  .target
                                                                                  .value
                                                                          )
                                                                        : 0 // FIX: Default to 0 instead of null
                                                                )
                                                            }
                                                            min="0"
                                                            max="100"
                                                            step="0.01"
                                                            className="w-full px-4 py-3 pl-12 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                                            placeholder="0.00"
                                                        />
                                                        <Percent
                                                            size={20}
                                                            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                                        />
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        أدخل النسبة المئوية
                                                        للخصم عند شراء أكثر من
                                                        وحدة من هذا المتغير
                                                    </p>
                                                </div>

                                                {/* Status Section */}
                                                <div className="bg-white rounded-xl p-4 border border-gray-200 ">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <Eye
                                                                size={18}
                                                                className="text-gray-600"
                                                            />
                                                            <span className="text-lg font-bold text-gray-900">
                                                                حالة المتغير
                                                            </span>
                                                        </div>

                                                        {/* Enhanced Toggle Switch */}
                                                        <label className="relative inline-flex items-center cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={
                                                                    variant.is_active
                                                                }
                                                                onChange={e =>
                                                                    updateVariant(
                                                                        variant.id,
                                                                        'is_active',
                                                                        e.target
                                                                            .checked
                                                                    )
                                                                }
                                                                className="sr-only peer"
                                                            />
                                                            <div className="relative w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-green-400 peer-checked:to-green-500 shadow-lg"></div>
                                                            <span
                                                                className={`mr-3 text-sm font-bold ${
                                                                    variant.is_active
                                                                        ? 'text-green-600'
                                                                        : 'text-gray-500'
                                                                }`}
                                                            >
                                                                {variant.is_active
                                                                    ? 'نشط'
                                                                    : 'غير نشط'}
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
                                        <Package
                                            size={64}
                                            className="mx-auto mb-6 text-gray-300"
                                        />
                                        <h3 className="text-2xl font-bold text-gray-400 mb-2">
                                            لا توجد متغيرات
                                        </h3>
                                        <p className="text-lg mb-2">
                                            لم يتم إضافة أي متغيرات بعد
                                        </p>
                                        <p className="text-sm">
                                            انقر على "إضافة متغير جديد" لبدء
                                            إضافة المتغيرات
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Form Actions */}
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                        <div className="flex items-center justify-end gap-4">
                            <button
                                type="button"
                                onClick={resetForm}
                                disabled={submitting}
                                className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                إعادة تعيين
                            </button>
                            <button
                                type="submit"
                                disabled={submitting || variants.length === 0}
                                className="px-12 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
                            >
                                {submitting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        جاري الإضافة...
                                    </>
                                ) : (
                                    <>
                                        <Plus size={18} />
                                        إضافة المتغيرات ({variants.length})
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddProductVariant;
