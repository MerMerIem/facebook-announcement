import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowRight,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/customer/layout/Header";
import ProductCard from "@/components/customer/shop/ProductCard";
import { useCart } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";
import { useApi } from "@/contexts/RestContext";

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [customQuantity, setCustomQuantity] = useState(""); // For measure unit input
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
        const [productData, response, responseCode, error] = await api.get(
          `/product/get/${id}`
        );
        console.log("productData",productData)

        if (responseCode === 200 && productData) {
          setProduct(productData);
          console.log("Product data received:", productData);
        } else {
          console.error("Failed to fetch product:", error);
          toast({
            title: "خطأ",
            description: error || "فشل في تحميل المنتج",
            variant: "destructive",
          });
          setProduct(null);
        }
      } catch (err) {
        console.error("Error fetching product:", err);
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء تحميل المنتج",
          variant: "destructive",
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
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">جاري تحميل المنتج...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-shop-bg">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">المنتج غير موجود</h1>
            <Link to="/shop">
              <Button>العودة للمتجر</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const calculateLiveTotal = () => {
    if (hasMeasureUnit) {
      const qty = parseFloat(customQuantity);
      if (isNaN(qty) || qty <= 0) return null;
      return currentPrice * qty;
    } else {
      // For regular products, use the quantity state
      return currentPrice * quantity;
    }
  };  

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

  const { currentData, currentImages, mainImageUrl, cartProductId, isVariant } =
    getDisplayData();

    const getCurrentPricing = () => {
      const data = currentData;
      const hasDiscount = data.has_discount && new Date(data.has_discount) > new Date();
      const originalPrice = parseFloat(data.price || "0");
      const discountPrice = parseFloat(data.discount_price || "0");
      
      // Show discount price if it exists and discount is active, otherwise show original price
      const currentPrice = hasDiscount && discountPrice > 0 ? discountPrice : originalPrice;
      
      console.log("hasDiscount", hasDiscount);
      console.log("originalPrice", originalPrice);
      console.log("discountPrice", discountPrice);
      console.log("currentPrice", currentPrice);
    
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
    currentData.has_measure_unit === 1 || currentData.has_measure_unit === true;
  const measureUnit = currentData.measure_unit || product.measure_unit;

  const formatPrice = (price) => {
    return new Intl.NumberFormat("ar-DZ", {
      style: "currency",
      currency: "DZD",
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

  const calculateRegularProductTotal = () => {
    return currentPrice * quantity;
  };

  // Calculate total price based on effective quantity
  const calculateTotalPrice = () => {
    const effectiveQty = getEffectiveQuantity();
    return currentPrice * effectiveQty;
  };

  const handleAddToCart = () => {
    const effectiveQty = getEffectiveQuantity();

    if (effectiveQty <= 0) {
      toast({
        title: "خطأ",
        description: hasMeasureUnit
          ? `يرجى إدخال كمية صحيحة بال${measureUnit}`
          : "يرجى اختيار كمية صحيحة",
        variant: "destructive",
      });
      return;
    }

    let itemToAdd;

    if (product.has_variants && selectedVariant) {
      itemToAdd = {
        id: selectedVariant.id,
        name: `${product.name} - ${selectedVariant.title}`,
        price: currentPrice,
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
        price: currentPrice,
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
      title: "تمت الإضافة",
      description: `تم إضافة ${quantityText} من ${itemToAdd.name} إلى السلة`,
      variant: "success",
    });
  };

  const handleVariantSelect = (variant) => {
    setSelectedVariant(variant);
    setQuantity(1);
    setCustomQuantity("");
  };

  const handleBackToMain = () => {
    setSelectedVariant(null);
    setQuantity(1);
    setCustomQuantity("");
  };

  const handleCustomQuantityChange = (value) => {
    // Allow only numbers and decimal point
    const sanitizedValue = value.replace(/[^\d.]/g, "");

    // Prevent multiple decimal points
    const parts = sanitizedValue.split(".");
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
    <div dir="rtl" className="min-h-screen bg-shop-bg text-right">
      <Header />

      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-600 mb-6">
          <Link
            to="/"
            className="hover:text-primary cursor-pointer transition-colors"
          >
            الرئيسية
          </Link>
          <span>/</span>
          <Link
            to="/shop"
            className="hover:text-primary cursor-pointer transition-colors"
          >
            المتجر
          </Link>
          <span>/</span>
          <Link
            to={`/shop?category=${product.category?.id}`}
            className="hover:text-primary cursor-pointer transition-colors"
          >
            {product.category?.name}
          </Link>
          <span>/</span>
          <span className="text-primary font-medium">{product.name}</span>
        </nav>

        {/* Back to main product button */}
        {selectedVariant && (
          <div className="mb-4">
            <Button
              variant="outline"
              onClick={handleBackToMain}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              العودة للمنتج الرئيسي
            </Button>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-12 mb-12">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="relative group">
              <div className="aspect-square bg-white rounded-lg overflow-hidden border-2 border-gray-100">
                <img
                  src={
                    currentImages?.[selectedImageIndex]?.url ||
                    mainImageUrl ||
                    "/placeholder.svg"
                  }
                  alt={currentData.name || product.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {hasDiscount && (
                  <div className="absolute top-4 left-4 bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 rounded-full font-bold shadow-lg">
                    خصم {discountPercentage}%
                  </div>
                )}
              </div>

              {currentImages && currentImages.length > 1 && (
                <div className="flex gap-3 mt-4">
                  {currentImages.map((image, index) => (
                    <button
                      key={image.id || index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden transition-all duration-300 ${
                        selectedImageIndex === index
                          ? "ring-4 ring-ring shadow-lg scale-105"
                          : "ring-2 ring-gray-200 hover:ring-accent hover:shadow-md"
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
          <div className="space-y-6">
            {/* Header */}
            <h1 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
              {product.name}
              {selectedVariant && (
                <span className="text-lg font-normal text-muted-foreground ml-2">
                  - {selectedVariant.title}
                </span>
              )}
            </h1>

            <div>
              <div className="flex items-center gap-2 mb-3">
                {product.category?.name && (
                  <span className="px-3 py-1 bg-muted/30 text-primary text-sm font-medium rounded-full">
                    {product.category.name}
                  </span>
                )}
                {product.subcategory?.name && (
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm font-medium rounded-full">
                    {product.subcategory.name}
                  </span>
                )}
                {selectedVariant && (
                  <Badge variant="secondary">
                    {selectedVariant.size} {selectedVariant.measure_unit}
                  </Badge>
                )}
                {hasMeasureUnit && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Calculator className="h-3 w-3" />
                    يُباع بال{measureUnit}
                  </Badge>
                )}
                {currentData.discount_threshold && currentData.discount_threshold > 0 && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    يوجد خصم خاص عند شراء أكثر من {currentData.discount_threshold} من هذا المنتج
                  </div>
                )}
              </div>

              {product.tags && product.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {product.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full flex items-center gap-1"
                    >
                      <Zap className="h-3 w-3" />
                      {typeof tag === "string" ? tag : tag.name}
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
                <div className="bg-accent/10 p-6 rounded-2xl border border-border/70 mb-6">
                  <h3 className="font-bold text-xl text-black flex items-center gap-3 mb-4">
                    <Package className="h-6 w-6 text-black" />
                    اختر النوع والحجم:
                  </h3>
                  <p className="text-foreground text-sm mb-4">
                    يرجى اختيار نوع وحجم الخزان المناسب لاحتياجاتك
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {product.variants.map((variant) => {
                      const variantHasDiscount =
                        variant.has_discount &&
                        new Date(variant.has_discount) > new Date();
                      const variantOriginalPrice = parseFloat(
                        variant.price || "0"
                      );
                      const variantDiscountPrice = parseFloat(
                        variant.discount_price || "0"
                      );
                      const variantCurrentPrice =
                        variantHasDiscount && variantDiscountPrice > 0
                          ? variantDiscountPrice
                          : variantOriginalPrice;
                          console.log("variantOriginalPrice",variantOriginalPrice)
                          console.log("variantHasDiscount",variantHasDiscount)
                          console.log("variantDiscountPrice",variantDiscountPrice)
                          console.log("variantCurrentPrice",variantCurrentPrice)

                      return (
                        <button
                          key={variant.id}
                          onClick={() => handleVariantSelect(variant)}
                          className="p-4 border-2 border-border/70 bg-white rounded-xl transition-all duration-300 text-right hover:border-primary hover:shadow-lg hover:scale-105"
                        >
                          <div className="flex gap-3">
                            {variant.primary_image_url && (
                              <div className="w-16 h-16 bg-white rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                                <img
                                  src={variant.primary_image_url}
                                  alt={variant.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="font-bold text-foreground text-base mb-1">
                                {variant.size} {variant.measure_unit}
                              </div>
                              <div className="text-sm text-gray-600 mb-2">
                                {variant.title}
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="font-bold text-lg text-primary">
                                  {formatPrice(variantCurrentPrice)}
                                  {variant.has_measure_unit && variant.measure_unit && (
                                    <span className="text-xs text-muted-foreground">
                                      /{variant.measure_unit}
                                    </span>
                                  )}
                                </div>
                                {variantHasDiscount && variantDiscountPrice > 0 && variantOriginalPrice !== variantCurrentPrice && (
                                  <div className="text-sm line-through text-muted-foreground">
                                    {formatPrice(variantOriginalPrice)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-300 rounded-lg">
                    <p className="text-amber-700 text-sm flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      يجب اختيار نوع معين لإضافة المنتج إلى السلة
                    </p>
                  </div>
                </div>
              )}

            {/* Price and Add to Cart Section */}
            {(selectedVariant || !product.has_variants) && (
              <div
                className={
                  selectedVariant
                    ? "bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100"
                    : ""
                }
              >
                <div className="flex items-center gap-4 mb-4">
                  <span className={`text-4xl font-bold ${selectedVariant ? "text-blue-600" : ""}`}>
                    {formatPrice(currentPrice)}
                    {hasMeasureUnit && measureUnit && (
                      <span className="text-lg text-muted-foreground">
                        /{measureUnit}
                      </span>
                    )}
                  </span>
                  {hasDiscount && discountPrice > 0 && originalPrice !== currentPrice && (
                    <div className="flex flex-col">
                      <span className="text-xl text-gray-500 line-through">
                        {formatPrice(originalPrice)}
                      </span>
                      <span className="text-green-600 font-medium text-sm">
                        وفر {formatPrice(originalPrice - currentPrice)}
                      </span>
                    </div>
                  )}
                </div>

                {hasDiscount && timeRemaining && (
                  <div className="flex items-center gap-2 text-red-600 font-medium bg-red-50 px-4 py-2 rounded-lg mb-4">
                    <Timer className="h-5 w-5 animate-pulse" />
                    <span>العرض ينتهي خلال: {timeRemaining}</span>
                  </div>
                )}

                {/* Quantity Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="font-medium text-gray-900">
                      {hasMeasureUnit ? `الكمية (${measureUnit}):` : "الكمية:"}
                    </span>

                    {hasMeasureUnit ? (
                      // Custom input for measure unit products with live calculation
                      <div className="flex items-center gap-2 flex-1">
                        <div className="relative flex-1 max-w-xs">
                          <input
                            type="text"
                            value={customQuantity}
                            onChange={(e) => handleCustomQuantityChange(e.target.value)}
                            placeholder={`أدخل الكمية بال${measureUnit}`}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-center font-semibold focus:border-primary focus:outline-none transition-colors"
                          />
                          {customQuantity && parseFloat(customQuantity) > 0 && (
                            <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
                              <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-1 rounded">
                                {measureUnit}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Live Price Display */}
                        {customQuantity && parseFloat(customQuantity) > 0 && (
                          <div className="flex-1 min-w-0">
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 animate-pulse">
                              <div className="text-center">
                                <div className="text-sm text-green-600 font-medium mb-1">
                                  إجمالي السعر
                                </div>
                                <div className="text-2xl font-bold text-green-700">
                                  {formatPrice(calculateLiveTotal())}
                                </div>
                                <div className="text-xs text-green-600 mt-1">
                                  {parseFloat(customQuantity)} {measureUnit} × {formatPrice(currentPrice)}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      // Modified regular quantity selector with live price display
                      <div className="flex items-center gap-4">
                        <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden">
                          <button
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            disabled={quantity <= 1}
                            className="p-3 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <Minus className="h-5 w-5" />
                          </button>
                          <span className="px-6 py-3 bg-gray-50 font-semibold min-w-[80px] text-center">
                            {quantity}
                          </span>
                          <button
                            onClick={() => setQuantity(quantity + 1)}
                            className="p-3 hover:bg-gray-100 transition-colors"
                          >
                            <Plus className="h-5 w-5" />
                          </button>
                        </div>
                        
                        {/* ADD THIS: Live Price Display for Regular Products */}
                        <div className="flex-1 min-w-0">
                          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-4">
                            <div className="text-center">
                              <div className="text-sm text-blue-600 font-medium mb-1">
                                إجمالي السعر
                              </div>
                              <div className="text-2xl font-bold text-blue-700">
                                {formatPrice(calculateLiveTotal())}
                              </div>
                              <div className="text-xs text-blue-600 mt-1">
                                {quantity} × {formatPrice(currentPrice)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {cartQuantity > 0 && (
                      <span className="text-sm text-muted-foreground">
                        ({cartQuantity} في السلة)
                      </span>
                    )}
                </div>

  {/* Enhanced info section for measure unit products */}
  {hasMeasureUnit && (
    <div className="space-y-3">
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="flex items-start gap-3">
          <Calculator className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-blue-700 text-sm font-medium mb-1">
              كيفية الحساب:
            </p>
            <p className="text-blue-600 text-sm">
              أدخل الكمية المطلوبة بال{measureUnit}. مثال: 50 للحصول على 50 {measureUnit}
            </p>
            <p className="text-blue-600 text-xs mt-2">
              سعر ال{measureUnit} الواحد: {formatPrice(currentPrice)}
            </p>
                    </div>
                  </div>
                </div>

                {/* Show calculation breakdown when user types */}
                {customQuantity && parseFloat(customQuantity) > 0 && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="flex items-center gap-2 text-amber-700">
                      <Info className="h-4 w-4" />
                      <span className="font-medium text-sm">حساب السعر:</span>
                    </div>
                    <div className="mt-2 text-sm text-amber-800">
                      <div className="flex justify-between items-center">
                        <span>الكمية:</span>
                        <span className="font-semibold">{parseFloat(customQuantity)} {measureUnit}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>السعر لكل {measureUnit}:</span>
                        <span className="font-semibold">{formatPrice(currentPrice)}</span>
                      </div>
                      <hr className="my-2 border-amber-300" />
                      <div className="flex justify-between items-center font-bold text-base">
                        <span>المجموع:</span>
                        <span className="text-lg text-amber-900">{formatPrice(calculateLiveTotal())}</span>
                      </div>
                    </div>
                  </div>
                )}
                
              </div>
            )}

            {/* Add to cart button */}
            <div className="flex gap-3">
            <button
              onClick={handleAddToCart}
              disabled={
                hasMeasureUnit &&
                (!customQuantity || parseFloat(customQuantity) <= 0)
              }
              className={`flex-1 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed ${
                selectedVariant
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  : "bg-gradient-to-r from-accent to-primary hover:scale-105"
              }`}
            >
              <ShoppingCart className="h-6 w-6" />
              أضف إلى السلة
              
              {/* Show live total for both measure unit and regular products */}
              {(() => {
                const effectiveQty = getEffectiveQuantity();
                const liveTotal = calculateLiveTotal();
                
                if (effectiveQty > 0 && liveTotal) {
                  return (
                    <div className="flex flex-col items-start text-sm opacity-90">
                      <span>
                        ({hasMeasureUnit ? `${effectiveQty} ${measureUnit}` : `${effectiveQty} قطعة`})
                      </span>
                      <span className="text-xs">{formatPrice(liveTotal)}</span>
                    </div>
                  );
                }
                return null;
              })()}
            </button>

              {added && (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-xl border border-green-200 animate-pulse">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">تم الإضافة!</span>
                </div>
              )}
            </div>
          </div>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-lg border border-gray-300 overflow-hidden mb-8">
          <div className="bg-accent/10 px-6 py-4 border-b border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Info className="h-6 w-6 text-primary" />
              وصف المنتج
            </h2>
          </div>
          <div className="p-6">
            <div
              className="prose prose-lg max-w-none text-gray-700 leading-relaxed font-admin!"
              dangerouslySetInnerHTML={{
                __html: currentData.description || product.description,
              }}
            />
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-900">
                منتجات مشابهة
              </h2>
              <Link to="/shop">
                <Button variant="outline">
                  عرض المزيد
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;
