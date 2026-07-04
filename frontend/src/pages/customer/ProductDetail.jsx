import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    ShoppingCart,
    Minus,
    Plus,
    Timer,
    CheckCircle,
    ArrowLeft,
    Info,
    Package,
    Zap,
    Calculator,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/customer/layout/Header';
import ProductCard from '@/components/customer/shop/ProductCard';
import { useCart } from '@/contexts/CartContext';
import { toast } from '@/hooks/use-toast';
import { useApi } from '@/contexts/RestContext';
import { Button } from '@/components/ui/button';

const ProductDetail = () => {
    const { id } = useParams();
    const [product, setProduct] = useState(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [customQuantity, setCustomQuantity] = useState(''); // For measure unit input
    const [isLoading, setIsLoading] = useState(true);
    const [isWishlisted, setIsWishlisted] = useState(false);
    const { addItem, getItemQuantity } = useCart();
    const [added, setAdded] = useState(false);

    const { api } = useApi();

    useEffect(() => {
        const fetchProduct = async () => {
            if (!id) return;

            setIsLoading(true);
            try {
                const [productData, response, responseCode, error] =
                    await api.get(`/product/get/${id}`);
                console.log('productData', productData);

                if (responseCode === 200 && productData) {
                    setProduct(productData);
                    console.log('Product data received:', productData);
                } else {
                    console.error('Failed to fetch product:', error);
                    toast({
                        title: 'خطأ',
                        description:
                            error?.response?.data?.message ||
                            error?.message ||
                            'فشل في تحميل المنتج',
                        variant: 'destructive',
                    });
                    setProduct(null);
                }
            } catch (err) {
                console.error('Error fetching product:', err);
                toast({
                    title: 'خطأ',
                    description: 'حدث خطأ أثناء تحميل المنتج',
                    variant: 'destructive',
                });
                setProduct(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProduct();
    }, [id, api, toast]);

    useEffect(() => {
        setSelectedImageIndex(0);
    }, [selectedVariant]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-shop-bg">
                <div className="container mx-auto px-4 py-8">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-4 text-muted-foreground">
                            جاري تحميل المنتج...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="min-h-screen bg-shop-bg">
                <div className="container mx-auto px-4 py-8">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold mb-4">
                            المنتج غير موجود
                        </h1>
                        <Link to="/shop">
                            <Button>العودة للمتجر</Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const getDisplayData = () => {
        if (product.has_variants && selectedVariant) {
            return {
                currentData: selectedVariant,
                currentImages: selectedVariant.images || [],
                mainImageUrl: selectedVariant.primary_image_url,
                cartProductId: selectedVariant.id,
                isVariant: true,
            };
        } else {
            return {
                currentData: product,
                currentImages: product.images || [],
                mainImageUrl: product.main_image_url,
                cartProductId: product.id,
                isVariant: false,
            };
        }
    };

    const {
        currentData,
        currentImages,
        mainImageUrl,
        cartProductId,
        isVariant,
    } = getDisplayData();

    const getUnitPriceForQuantity = qty => {
        const threshold = parseFloat(currentData.discount_threshold || '0');
        const pct = parseFloat(currentData.discount_percentage || '0');

        if (threshold > 0 && pct > 0 && qty > threshold) {
            return currentPrice * (1 - pct / 100);
        }
        return currentPrice;
    };

    const calculateLiveTotal = () => {
        if (hasMeasureUnit) {
            const qty = parseFloat(customQuantity);
            if (isNaN(qty) || qty <= 0) return null;
            return getUnitPriceForQuantity(qty) * qty;
        } else {
            return getUnitPriceForQuantity(quantity) * quantity;
        }
    };

    const getCurrentPricing = () => {
        const data = currentData;
        const hasDiscountWindow =
            data.has_discount && new Date(data.has_discount) > new Date();
        const originalPrice = parseFloat(data.price || '0');
        const discountPrice = parseFloat(data.discount_price || '0');

        // Only treat it as a real discount if it's actually cheaper
        const hasDiscount =
            hasDiscountWindow &&
            discountPrice > 0 &&
            discountPrice < originalPrice;

        const currentPrice = hasDiscount ? discountPrice : originalPrice;

        return {
            hasDiscount,
            originalPrice,
            discountPrice,
            currentPrice,
            discountEnd: data.has_discount,
        };
    };

    const {
        hasDiscount,
        originalPrice,
        discountPrice,
        currentPrice,
        discountEnd,
    } = getCurrentPricing();

    const cartQuantity = getItemQuantity(cartProductId);

    // Check if the current product/variant has measure unit
    const hasMeasureUnit =
        currentData.has_measure_unit === 1 ||
        currentData.has_measure_unit === true;
    const measureUnit = currentData.measure_unit || product.measure_unit;

    const formatPrice = price => {
        return new Intl.NumberFormat('ar-DZ', {
            style: 'currency',
            currency: 'DZD',
            minimumFractionDigits: 0,
        }).format(price);
    };

    const getTimeRemaining = () => {
        if (!discountEnd) return null;

        const now = new Date();
        const endDate = new Date(discountEnd);
        const timeDiff = endDate.getTime() - now.getTime();

        if (timeDiff <= 0) return null;

        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor(
            (timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        );

        if (days > 0) return `${days} يوم متبقي`;
        return `${hours} ساعة متبقية`;
    };

    // Get the effective quantity based on whether the product has measure unit
    const getEffectiveQuantity = () => {
        if (hasMeasureUnit) {
            const customQty = parseFloat(customQuantity);
            return isNaN(customQty) || customQty <= 0 ? 0 : customQty;
        }
        return quantity;
    };

    const handleAddToCart = () => {
        const effectiveQty = getEffectiveQuantity();

        if (effectiveQty <= 0) {
            toast({
                title: 'خطأ',
                description: hasMeasureUnit
                    ? `يرجى إدخال كمية صحيحة بال${measureUnit}`
                    : 'يرجى اختيار كمية صحيحة',
                variant: 'destructive',
            });
            return;
        }

        let itemToAdd;

        if (product.has_variants && selectedVariant) {
            itemToAdd = {
                id: selectedVariant.id,
                name: `${product.name} - ${selectedVariant.title}`,
                price: getUnitPriceForQuantity(effectiveQty),
                discount_price: selectedVariant.discount_price,
                has_discount: selectedVariant.has_discount,
                used_discount: selectedVariant.has_discount, // Ensure consistency
                main_image_url:
                    selectedVariant.primary_image_url || product.main_image_url,
                description: selectedVariant.description || product.description,
                category: product.category,
                subcategory: product.subcategory,
                parent_product_id: product.id,
                variant_title: selectedVariant.title,
                size: selectedVariant.size,
                measure_unit: selectedVariant.measure_unit,
                is_variant: true,
                has_variants: false, // Variants themselves don't have variants
                has_measure_unit: selectedVariant.has_measure_unit,
                discount_threshold: selectedVariant.discount_threshold,
            };
        } else {
            itemToAdd = {
                id: product.id,
                name: product.name,
                price: getUnitPriceForQuantity(effectiveQty),
                discount_price: product.discount_price,
                has_discount: product.has_discount,
                used_discount: product.has_discount, // Ensure consistency
                main_image_url: product.main_image_url,
                description: product.description,
                category: product.category,
                subcategory: product.subcategory,
                is_variant: false,
                has_variants: product.has_variants,
                has_measure_unit: product.has_measure_unit,
                measure_unit: product.measure_unit,
                discount_threshold: product.discount_threshold,
            };
        }

        if (hasMeasureUnit) {
            // For measure unit products: add as a single item with the specified quantity
            addItem(itemToAdd, effectiveQty);
        } else {
            // For regular products, add multiple times (each addition is quantity 1)
            for (let i = 0; i < effectiveQty; i++) {
                addItem(itemToAdd);
            }
        }

        setAdded(true);
        setTimeout(() => setAdded(false), 3000);

        const quantityText = hasMeasureUnit
            ? `${effectiveQty} ${measureUnit}`
            : `${effectiveQty}`;

        toast({
            title: 'تمت الإضافة',
            description: `تم إضافة ${quantityText} من ${itemToAdd.name} إلى السلة`,
            variant: 'success',
        });
    };

    const handleVariantSelect = variant => {
        setSelectedVariant(variant);
        setQuantity(1);
        setCustomQuantity('');
    };

    const handleBackToMain = () => {
        setSelectedVariant(null);
        setQuantity(1);
        setCustomQuantity('');
    };

    const handleCustomQuantityChange = value => {
        // Allow only numbers and decimal point
        const sanitizedValue = value.replace(/[^\d.]/g, '');

        // Prevent multiple decimal points
        const parts = sanitizedValue.split('.');
        if (parts.length > 2) {
            return;
        }

        setCustomQuantity(sanitizedValue);
    };

    const timeRemaining = getTimeRemaining();
    const discountPercentage = hasDiscount
        ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
        : 0;
    const relatedProducts = product.related_products || [];

    return (
        <div dir="rtl" className="min-h-screen bg-background text-right">
            <div className="container mx-auto px-4 py-6">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                    <Link
                        to="/"
                        className="hover:text-primary transition-colors"
                    >
                        الرئيسية
                    </Link>
                    <span>/</span>
                    <Link
                        to="/shop"
                        className="hover:text-primary transition-colors"
                    >
                        المتجر
                    </Link>
                    <span>/</span>
                    <Link
                        to={`/shop?category=${product.category?.id}`}
                        className="hover:text-primary transition-colors"
                    >
                        {product.category?.name}
                    </Link>
                    <span>/</span>
                    <span className="text-primary font-medium">
                        {product.name}
                    </span>
                </nav>

                {/* Back to main product button */}
                {selectedVariant && (
                    <div className="mb-4">
                        <Button
                            variant=""
                            onClick={handleBackToMain}
                            className="rounded-none flex items-center gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            العودة للمنتج الرئيسي
                        </Button>
                    </div>
                )}

                <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 mb-8 sm:mb-12">
                    {/* Product Images */}
                    <div className="space-y-4">
                        <div className="relative">
                            <div className="aspect-square bg-card border border-border overflow-hidden">
                                <img
                                    src={
                                        currentImages?.[selectedImageIndex]
                                            ?.url ||
                                        mainImageUrl ||
                                        '/placeholder.svg'
                                    }
                                    alt={currentData.name || product.name}
                                    className="w-full h-full object-cover"
                                />
                                {hasDiscount && (
                                    <div className="absolute top-4 left-4 bg-destructive text-destructive-foreground px-4 py-2 font-bold">
                                        خصم {discountPercentage}%
                                    </div>
                                )}
                            </div>

                            {currentImages && currentImages.length > 1 && (
                                <div className="flex gap-3 mt-4">
                                    {currentImages.map((image, index) => (
                                        <button
                                            key={image.id || index}
                                            onClick={() =>
                                                setSelectedImageIndex(index)
                                            }
                                            className={`flex-shrink-0 w-20 h-20 overflow-hidden border-2 transition-colors ${
                                                selectedImageIndex === index
                                                    ? 'border-primary'
                                                    : 'border-border hover:border-primary'
                                            }`}
                                        >
                                            <img
                                                src={image.url}
                                                alt={`${product.name} ${index + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Product Info */}
                    <div className="space-y-4 sm:space-y-6">
                        {/* Header */}
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3 sm:mb-4 leading-tight">
                            {product.name}
                            {selectedVariant && (
                                <span className="text-base sm:text-lg font-normal text-muted-foreground ml-2 block sm:inline">
                                    - {selectedVariant.title}
                                </span>
                            )}
                        </h1>

                        <div>
                            <div className="flex items-center flex-wrap gap-2 mb-3">
                                {product.category?.name && (
                                    <span className="px-3 py-1 bg-muted text-foreground text-sm font-medium">
                                        {product.category.name}
                                    </span>
                                )}
                                {product.subcategory?.name && (
                                    <span className="px-3 py-1 bg-accent text-accent-foreground text-sm font-medium">
                                        {product.subcategory.name}
                                    </span>
                                )}
                                {selectedVariant && (
                                    <Badge
                                        variant="secondary"
                                        className="rounded-none"
                                    >
                                        {selectedVariant.size}{' '}
                                        {selectedVariant.measure_unit}
                                    </Badge>
                                )}
                                {hasMeasureUnit && (
                                    <Badge
                                        variant="outline"
                                        className="rounded-none flex items-center gap-1"
                                    >
                                        <Calculator className="h-3 w-3" />
                                        يُباع بال{measureUnit}
                                    </Badge>
                                )}
                                {currentData.discount_threshold &&
                                    currentData.discount_threshold > 0 && (
                                        <div className="w-full bg-accent border border-border text-accent-foreground px-3 py-2 text-sm font-medium flex items-center gap-2">
                                            <Zap className="h-4 w-4" />
                                            يوجد خصم خاص عند شراء أكثر من{' '}
                                            {currentData.discount_threshold} من
                                            هذا المنتج
                                        </div>
                                    )}
                            </div>

                            {product.tags && product.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {product.tags.map((tag, index) => (
                                        <span
                                            key={index}
                                            className="px-3 py-1 bg-accent text-accent-foreground text-sm flex items-center gap-1"
                                        >
                                            <Zap className="h-3 w-3" />
                                            {typeof tag === 'string'
                                                ? tag
                                                : tag.name}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Variants Selection */}
                        {!selectedVariant &&
                            product.has_variants &&
                            product.variants &&
                            product.variants.length > 0 && (
                                <div className="bg-white p-6 border border-0 mb-6">
                                    <h3 className="font-bold text-xl text-foreground flex items-center gap-3 mb-4">
                                        <Package className="h-6 w-6" />
                                        اختر النوع والحجم:
                                    </h3>
                                    <p className="text-muted-foreground text-sm mb-4">
                                        يرجى اختيار نوع وحجم الخزان المناسب
                                        لاحتياجاتك
                                    </p>
                                    <div className="grid grid-cols-1 gap-3 sm:gap-4">
                                        {product.variants.map(variant => {
                                            const variantHasDiscount =
                                                variant.has_discount &&
                                                new Date(variant.has_discount) >
                                                    new Date();
                                            const variantOriginalPrice =
                                                parseFloat(
                                                    variant.price || '0'
                                                );
                                            const variantDiscountPrice =
                                                parseFloat(
                                                    variant.discount_price ||
                                                        '0'
                                                );
                                            const variantCurrentPrice =
                                                variantHasDiscount &&
                                                variantDiscountPrice > 0
                                                    ? variantDiscountPrice
                                                    : variantOriginalPrice;

                                            return (
                                                <button
                                                    key={variant.id}
                                                    onClick={() =>
                                                        handleVariantSelect(
                                                            variant
                                                        )
                                                    }
                                                    className="p-4 border-1 border-border bg-card text-right hover:border-primary transition-colors"
                                                >
                                                    <div className="flex gap-3">
                                                        {variant.primary_image_url && (
                                                            <div className="w-16 h-16 bg-card border border-border overflow-hidden flex-shrink-0">
                                                                <img
                                                                    src={
                                                                        variant.primary_image_url
                                                                    }
                                                                    alt={
                                                                        variant.title
                                                                    }
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                        )}
                                                        <div className="flex-1">
                                                            <div className="font-bold text-foreground text-base mb-1">
                                                                {variant.size}{' '}
                                                                {
                                                                    variant.measure_unit
                                                                }
                                                            </div>
                                                            <div className="text-sm text-muted-foreground mb-2">
                                                                {variant.title}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <div className="font-bold text-lg text-primary">
                                                                    {formatPrice(
                                                                        variantCurrentPrice
                                                                    )}
                                                                    {variant.has_measure_unit &&
                                                                        variant.measure_unit && (
                                                                            <span className="text-xs text-muted-foreground">
                                                                                /
                                                                                {
                                                                                    variant.measure_unit
                                                                                }
                                                                            </span>
                                                                        )}
                                                                </div>
                                                                {variantHasDiscount &&
                                                                    variantDiscountPrice >
                                                                        0 &&
                                                                    variantOriginalPrice !==
                                                                        variantCurrentPrice && (
                                                                        <div className="text-sm line-through text-muted-foreground">
                                                                            {formatPrice(
                                                                                variantOriginalPrice
                                                                            )}
                                                                        </div>
                                                                    )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="mt-4 p-3 bg-accent border border-border text-accent-foreground">
                                        <p className="text-sm flex items-center gap-2">
                                            <Info className="h-4 w-4" />
                                            يجب اختيار نوع معين لإضافة المنتج
                                            إلى السلة
                                        </p>
                                    </div>
                                </div>
                            )}

                        {/* Price and Add to Cart Section */}
                        {(selectedVariant || !product.has_variants) && (
                            <div
                                className={
                                    selectedVariant
                                        ? 'bg-white p-6 border border-border'
                                        : ''
                                }
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4">
                                    <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
                                        {formatPrice(currentPrice)}
                                        {hasMeasureUnit && measureUnit && (
                                            <span className="text-sm sm:text-base lg:text-lg text-muted-foreground">
                                                /{measureUnit}
                                            </span>
                                        )}
                                    </span>
                                    {hasDiscount &&
                                        discountPrice > 0 &&
                                        originalPrice !== currentPrice && (
                                            <div className="flex flex-col">
                                                <span className="text-xl text-muted-foreground line-through">
                                                    {formatPrice(originalPrice)}
                                                </span>
                                                <span className="text-primary font-medium text-sm">
                                                    وفر{' '}
                                                    {formatPrice(
                                                        originalPrice -
                                                            currentPrice
                                                    )}
                                                </span>
                                            </div>
                                        )}
                                </div>

                                {hasDiscount && timeRemaining && (
                                    <div className="flex items-center gap-2 text-destructive font-medium border border-destructive px-4 py-2 mb-4">
                                        <Timer className="h-5 w-5" />
                                        <span>
                                            العرض ينتهي خلال: {timeRemaining}
                                        </span>
                                    </div>
                                )}

                                {/* Unit price / Quantity */}
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className=" p-4">
                                        <div className="text-sm text-muted-foreground mb-1">
                                            سعر الوحدة
                                        </div>
                                        <div className="text-xl font-bold text-foreground">
                                            {formatPrice(currentPrice)}
                                        </div>
                                    </div>

                                    <div className=" border-0 p-4">
                                        <div className="text-sm text-muted-foreground mb-1">
                                            {hasMeasureUnit
                                                ? `الكمية (${measureUnit})`
                                                : 'الكمية'}
                                        </div>

                                        {hasMeasureUnit ? (
                                            <input
                                                type="text"
                                                value={customQuantity}
                                                onChange={e =>
                                                    handleCustomQuantityChange(
                                                        e.target.value
                                                    )
                                                }
                                                placeholder={`أدخل الكمية بال${measureUnit}`}
                                                className="w-full px-2 py-1 border border-border bg-background text-foreground font-semibold focus:border-primary focus:outline-none"
                                            />
                                        ) : (
                                            <div className="flex bg-muted items-center border border-border">
                                                <button
                                                    onClick={() =>
                                                        setQuantity(
                                                            Math.max(
                                                                1,
                                                                quantity - 1
                                                            )
                                                        )
                                                    }
                                                    disabled={quantity <= 1}
                                                    className="p-2 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    <Minus className="h-4 w-4" />
                                                </button>
                                                <span className="flex-1 text-center font-semibold text-foreground">
                                                    {quantity}
                                                </span>
                                                <button
                                                    onClick={() =>
                                                        setQuantity(
                                                            quantity + 1
                                                        )
                                                    }
                                                    className="p-2 hover:bg-muted transition-colors"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {cartQuantity > 0 && (
                                    <p className="text-sm text-muted-foreground mb-4">
                                        ({cartQuantity} في السلة)
                                    </p>
                                )}

                                {hasMeasureUnit && (
                                    <div className="border border-border bg-muted p-3 mb-4 flex items-start gap-2">
                                        <Calculator className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                        <p className="text-sm text-muted-foreground">
                                            أدخل الكمية المطلوبة بال
                                            {measureUnit}. سعر ال{measureUnit}{' '}
                                            الواحد: {formatPrice(currentPrice)}
                                        </p>
                                    </div>
                                )}

                                {/* Add to cart button */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleAddToCart}
                                        disabled={
                                            hasMeasureUnit &&
                                            (!customQuantity ||
                                                parseFloat(customQuantity) <= 0)
                                        }
                                        className="w-full bg-primary text-primary-foreground px-4 sm:px-6 lg:px-8 py-3 sm:py-4 font-semibold text-base sm:text-lg flex flex-col items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                                    >
                                        <span className="flex items-center gap-2">
                                            <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
                                            أضف إلى السلة (
                                            {hasMeasureUnit
                                                ? measureUnit
                                                : 'قطعة'}
                                            )
                                        </span>
                                        {getEffectiveQuantity() > 0 &&
                                            calculateLiveTotal() && (
                                                <span className="text-sm opacity-90">
                                                    {formatPrice(
                                                        calculateLiveTotal()
                                                    )}
                                                </span>
                                            )}
                                    </button>

                                    {added && (
                                        <div className="flex items-center gap-2 text-primary bg-accent px-4 py-2 border border-primary">
                                            <CheckCircle className="h-5 w-5" />
                                            <span className="font-medium">
                                                تم الإضافة!
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Description */}
                <div className="bg-white border border-border overflow-hidden mb-6 sm:mb-8">
                    <div className="bg-accent px-4 sm:px-6 py-3 sm:py-4 border-b border-border">
                        <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2 sm:gap-3">
                            <Info className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                            وصف المنتج
                        </h2>
                    </div>
                    <div className="p-4 sm:p-6">
                        <div
                            className="prose prose-sm sm:prose-lg max-w-none text-foreground leading-relaxed font-admin!"
                            dangerouslySetInnerHTML={{
                                __html:
                                    currentData.description ||
                                    product.description,
                            }}
                        />
                    </div>
                </div>

                {/* Related Products */}
                {relatedProducts.length > 0 && (
                    <section>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-3xl font-bold text-foreground">
                                منتجات مشابهة
                            </h2>
                            <Link to="/shop">
                                <Button variant="" className="rounded-none">
                                    عرض المزيد
                                    <ArrowLeft className="h-4 w-4 ml-2" />
                                </Button>
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                            {relatedProducts.map(relatedProduct => (
                                <ProductCard
                                    key={relatedProduct.id}
                                    product={relatedProduct}
                                />
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};

export default ProductDetail;
