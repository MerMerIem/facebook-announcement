import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowRight,
  ShoppingCart,
  Minus,
  Plus,
  Timer,
  Star,
  Heart,
  Share2,
  CheckCircle,
  Shield,
  Truck,
  RotateCcw,
  ArrowLeft,
  Info,
  Package,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  const currentData = selectedVariant || product;
  const currentImages = selectedVariant?.images || product.images || [];
  const mainImageUrl =
    selectedVariant?.primary_image_url || product.main_image_url;

  const getCurrentPricing = () => {
    const data = selectedVariant || product;
    const hasDiscount =
      data.has_discount && new Date(data.has_discount) > new Date();
    const originalPrice = parseFloat(data.price || "0");
    const discountPrice = parseFloat(data.discount_price || "0");
    const currentPrice =
      hasDiscount && discountPrice > 0 ? discountPrice : originalPrice;

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

  const cartItemId = selectedVariant
    ? `${product.id}_variant_${selectedVariant.id}`
    : product.id;
  const cartQuantity = getItemQuantity(cartItemId);

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

  const handleAddToCart = () => {
    const itemToAdd = selectedVariant
      ? {
          ...product,
          selectedVariant,
          cartItemId,
          price: currentPrice,
          variant_info: {
            id: selectedVariant.id,
            title: selectedVariant.title,
            size: selectedVariant.size,
            measure_unit: selectedVariant.measure_unit,
          },
        }
      : {
          ...product,
          cartItemId,
          price: currentPrice,
        };

    for (let i = 0; i < quantity; i++) {
      addItem(itemToAdd);
    }

    setAdded(true);
    setTimeout(() => setAdded(false), 3000);
  };

  const handleVariantSelect = (variant) => {
    setSelectedVariant(variant);
    setQuantity(1);
  };

  const handleBackToMain = () => {
    setSelectedVariant(null);
    setQuantity(1);
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

            {/* Main Product Price and Add to Cart - Show when no variants OR when variants exist but none selected */}
            <div>
              <div className="flex items-center gap-4 mb-4">
                <span className="text-4xl font-bold ">
                  {formatPrice(currentPrice)}
                </span>
                {hasDiscount && originalPrice !== currentPrice && (
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

              {/* Quantity and Add to Cart */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="font-medium text-gray-900">الكمية:</span>
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
                  {cartQuantity > 0 && (
                    <span className="text-sm text-muted-foreground">
                      ({cartQuantity} في السلة)
                    </span>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleAddToCart}
                    className="flex-1 bg-gradient-to-r from-accent to-primary text-white px-8 py-4 rounded-xl font-semibold text-lg hover:scale-105 transition-all duration-300 hover:shadow-xl flex items-center justify-center gap-3"
                  >
                    <ShoppingCart className="h-6 w-6" />
                    أضف إلى السلة
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

            {/* Variants */}
            {!selectedVariant &&
              product.has_variants &&
              product.variants &&
              product.variants.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    اختر النوع:
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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

                      return (
                        <button
                          key={variant.id}
                          onClick={() => handleVariantSelect(variant)}
                          className="p-4 border-2 border-gray-200 rounded-xl transition-all duration-300 text-right hover:border-primary "
                        >
                          {variant.primary_image_url && (
                            <div className="aspect-square bg-white rounded-lg overflow-hidden border border-gray-200 mb-2">
                              <img
                                src={variant.primary_image_url}
                                alt={variant.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="font-medium text-sm">
                            {variant.size} {variant.measure_unit}
                          </div>
                          <div className="text-xs text-gray-600 mb-1">
                            {variant.title}
                          </div>
                          <div className="font-bold text-sm text-primary ">
                            {formatPrice(variantCurrentPrice)}
                          </div>
                          {variantHasDiscount &&
                            variantOriginalPrice !== variantCurrentPrice && (
                              <div className="text-xs line-through text-gray-500">
                                {formatPrice(variantOriginalPrice)}
                              </div>
                            )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

            {/* Selected Variant Price and Add to Cart */}
            {selectedVariant && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-4xl font-bold text-blue-600">
                    {formatPrice(currentPrice)}
                  </span>
                  {hasDiscount && originalPrice !== currentPrice && (
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

                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="font-medium text-gray-900">الكمية:</span>
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
                    {cartQuantity > 0 && (
                      <span className="text-sm text-muted-foreground">
                        ({cartQuantity} في السلة)
                      </span>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleAddToCart}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
                    >
                      <ShoppingCart className="h-6 w-6" />
                      أضف إلى السلة
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
        <div className="bg-white rounded-lg  border border-gray-300 overflow-hidden mb-8">
          <div className="bg-accent/10 px-6 py-4 border-b border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Info className="h-6 w-6 text-primary" />
              وصف المنتج
            </h2>
          </div>
          <div className="p-6">
            <div
              className="prose prose-lg max-w-none text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: product.description }}
              style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
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
