import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  MapPin,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Header from "@/components/customer/layout/Header";
import { useCart } from "@/contexts/CartContext";

// TODO check if le calclul pour plus qu'une quantitée est juste
const Cart = () => {
  const {
    items,
    total,
    updateQuantity,
    removeItem,
    clearCart,
    pricingData,
    loadingPricing,
    getServerPricing,
  } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedWilayaId, setSelectedWilayaId] = useState(null);
  const [editingQuantity, setEditingQuantity] = useState({});
  const [itemsLoadingPricing, setItemsLoadingPricing] = useState(new Set());
  const navigate = useNavigate();
  console.log("pricingData",pricingData)

  const formatPrice = (price) => {
    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice)) {
      console.warn("Invalid price value:", price);
      return "0 د.ج";
    }

    return new Intl.NumberFormat("ar-DZ", {
      style: "currency",
      currency: "DZD",
      minimumFractionDigits: 0,
    }).format(numericPrice);
  };

  // Enhanced quantity change handler with loading state
  const handleQuantityChange = (cartItemId, newQuantity) => {
    const quantity = parseFloat(newQuantity);
    if (quantity <= 0 || isNaN(quantity)) {
      removeItem(cartItemId);
    } else {
      // Add item to loading state
      setItemsLoadingPricing((prev) => new Set(prev).add(cartItemId));

      updateQuantity(cartItemId, quantity);

      // Remove from loading state after a delay (you might want to do this based on API response instead)
      setTimeout(() => {
        setItemsLoadingPricing((prev) => {
          const newSet = new Set(prev);
          newSet.delete(cartItemId);
          return newSet;
        });
      }, 1000); // Adjust this based on your API response time
    }
  };

  // Enhanced function to get item price with better fallback logic
  const getItemPrice = (item) => {
    // If item is loading new pricing, return current price temporarily
    if (itemsLoadingPricing.has(item._cartItemId)) {
      // Try to find the closest quantity match or fallback to original logic
      if (pricingData?.pricing_details) {
        const productPricing = pricingData.pricing_details.filter(
          (detail) => detail.product_id === item.product.id
        );

        if (productPricing.length > 0) {
          // Find exact match first
          const exactMatch = productPricing.find(
            (detail) => detail.quantity === item.quantity
          );
          if (exactMatch) {
            return exactMatch.unit_price;
          }

          // If no exact match, use the first available pricing for this product
          return productPricing[0].unit_price;
        }
      }
    }

    // Original exact match logic
    if (pricingData?.pricing_details) {
      const serverItem = pricingData.pricing_details.find(
        (detail) =>
          detail.product_id === item.product.id &&
          detail.quantity === item.quantity
      );

      if (serverItem) {
        return serverItem.unit_price;
      }

      // Fallback: find any pricing for this product if exact quantity not found
      const anyProductPricing = pricingData.pricing_details.find(
        (detail) => detail.product_id === item.product.id
      );
      if (anyProductPricing) {
        return anyProductPricing.unit_price;
      }
    }

    if (getServerPricing) {
      const serverPricing = getServerPricing(item.product.id);
      if (serverPricing) {
        return serverPricing.unit_price;
      }
    }

    const hasDiscount = item.product.used_discount;
    const discountPrice = parseFloat(item.product.discount_price || "0");
    const originalPrice = parseFloat(item.product.price || "0");
    return hasDiscount && discountPrice > 0 ? discountPrice : originalPrice;
  };

  // Enhanced function to get server item details with better fallback
  const getServerItemDetails = (item) => {
    // If loading, try to return best available data
    if (itemsLoadingPricing.has(item._cartItemId)) {
      if (pricingData?.pricing_details) {
        const productPricing = pricingData.pricing_details.filter(
          (detail) => detail.product_id === item.product.id
        );

        if (productPricing.length > 0) {
          // Find exact match first
          const exactMatch = productPricing.find(
            (detail) => detail.quantity === item.quantity
          );
          if (exactMatch) {
            return exactMatch;
          }

          // Return a computed version based on available pricing
          const basePricing = productPricing[0];
          return {
            ...basePricing,
            quantity: item.quantity,
            item_total: basePricing.unit_price * item.quantity,
            savings:
              (basePricing.original_price - basePricing.unit_price) *
              item.quantity,
            // Mark as estimated
            _isEstimated: true,
          };
        }
      }
    }

    // Original exact match logic
    if (pricingData?.pricing_details) {
      const serverItem = pricingData.pricing_details.find(
        (detail) =>
          detail.product_id === item.product.id &&
          detail.quantity === item.quantity
      );
      if (serverItem) {
        return serverItem;
      }

      // Fallback: compute from available data
      const anyProductPricing = pricingData.pricing_details.find(
        (detail) => detail.product_id === item.product.id
      );
      if (anyProductPricing) {
        return {
          ...anyProductPricing,
          quantity: item.quantity,
          item_total: anyProductPricing.unit_price * item.quantity,
          savings:
            (anyProductPricing.original_price - anyProductPricing.unit_price) *
            item.quantity,
          _isEstimated: true,
        };
      }
    }

    if (getServerPricing) {
      const serverPricing = getServerPricing(item.product.id);
      if (serverPricing) {
        return serverPricing;
      }
    }

    return null;
  };

  const getProductName = (item) => {
    const serverItem = getServerItemDetails(item);
    if (serverItem?.product_name) {
      return serverItem.product_name;
    }

    return item.product.name || item.product.product_name || "منتج غير محدد";
  };

  const selectedWilayaInfo = useMemo(() => {
    if (!selectedWilayaId || !pricingData?.wilayas) {
      return null;
    }
    return pricingData.wilayas.find(
      (option) => option.id === parseInt(selectedWilayaId)
    );
  }, [selectedWilayaId, pricingData?.wilayas]);

  const calculations = useMemo(() => {
    const deliveryFee = selectedWilayaInfo?.delivery_fee || 0;
    const subtotal = pricingData?.subtotal || total;
    const totalWithDelivery =
      selectedWilayaInfo?.total_with_delivery || subtotal + deliveryFee;
    const totalSavings = pricingData?.total_savings || 0;

    return {
      deliveryFee,
      subtotal,
      totalWithDelivery,
      totalSavings,
    };
  }, [selectedWilayaInfo, pricingData, total]);

  const { deliveryFee, subtotal, totalWithDelivery, totalSavings } =
    calculations;

  const handleQuantityInputChange = (cartItemId, value) => {
    setEditingQuantity((prev) => ({
      ...prev,
      [cartItemId]: value,
    }));
  };

  const handleQuantityInputBlur = (cartItemId) => {
    const value = editingQuantity[cartItemId];
    if (value !== undefined) {
      handleQuantityChange(cartItemId, value);
      setEditingQuantity((prev) => {
        const newState = { ...prev };
        delete newState[cartItemId];
        return newState;
      });
    }
  };

  const handleQuantityInputKeyPress = (e, cartItemId) => {
    if (e.key === "Enter") {
      handleQuantityInputBlur(cartItemId);
    }
  };

  // Prepare checkout data
  const prepareCheckoutData = () => {
    const checkoutItems = items.map((item) => {
      const itemPrice = getItemPrice(item);
      const productName = getProductName(item);
      const serverItemDetails = getServerItemDetails(item);

      return {
        productId: item.product.id,
        productName: productName,
        quantity: item.quantity,
        unitPrice: itemPrice,
        originalPrice:
          serverItemDetails?.original_price ||
          parseFloat(item.product.price || "0"),
        itemTotal: serverItemDetails?.item_total || itemPrice * item.quantity,
        savings: serverItemDetails?.savings || 0,
        hasDiscount:
          serverItemDetails?.used_discount || item.product.used_discount,
        hasMeasureUnit: item.product.has_measure_unit === 1,
        measureUnit: item.product.measure_unit || "",
        hasVariant: item._itemType?.hasVariant || false,
        variant: item.variant || null,
        imageUrl: item.product.main_image_url,
        category: item.product.category?.name || item.product.category,
        subcategory: item.product.subcategory?.name || item.product.subcategory,
        parent_product_id : item.product?.parent_product_id || null,
      
      };
    });

    console.log(selectedWilayaInfo)

    const checkoutData = {
      items: checkoutItems,
      pricing: {
        subtotal: subtotal,
        deliveryFee: deliveryFee,
        totalWithDelivery: totalWithDelivery,
        totalSavings: totalSavings,
      },
      wilaya: selectedWilayaInfo
        ? {
            id: selectedWilayaInfo.wilaya_id,
            name: selectedWilayaInfo.name,
            deliveryFee: selectedWilayaInfo.delivery_fee,
          }
        : null,
      timestamp: new Date().toISOString(),
    };

    return checkoutData;
  };

  const handleCheckout = () => {
    if (!selectedWilayaId) return;

    const checkoutData = prepareCheckoutData();

    // Encode the data to base64 for URL safety (handle Arabic text)
    const jsonString = JSON.stringify(checkoutData);
    const encodedData = btoa(encodeURIComponent(jsonString));

    // Navigate to checkout with encoded data
    navigate(`/checkout?data=${encodedData}`);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-shop-bg">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <ShoppingBag className="h-24 w-24 text-muted-foreground mx-auto mb-6" />
            <h1 className="text-3xl font-bold mb-4">السلة فارغة</h1>
            <p className="text-muted-foreground mb-8">
              لم تقم بإضافة أي منتجات إلى السلة بعد
            </p>
            <Link to="/shop">
              <Button size="lg">
                ابدأ التسوق
                <ArrowRight className="h-5 w-5 mr-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-shop-bg">
      <Header />
      <div className="container mx-auto px-4 py-6">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary">
            الرئيسية
          </Link>
          <span>/</span>
          <span className="text-foreground">السلة</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4" dir="rtl">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-right">
                سلة التسوق ({items.length} منتج)
              </h1>
              <Button
                variant="destructive"
                size="sm"
                onClick={clearCart}
                className="text-destructive bg-white! hover:bg-red-400! hover:text-white!"
              >
                <Trash2 className="h-4 w-4" />
                <span>مسح الكل</span>
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item) => {
                const itemPrice = getItemPrice(item);
                const productName = getProductName(item);
                const hasMeasureUnit = item.product.has_measure_unit === 1;
                const measureUnit = item.product.measure_unit || "";
                const hasVariant = item._itemType.hasVariant;
                const isLoadingPrice = itemsLoadingPricing.has(
                  item._cartItemId
                );

                // Get server item details with exact quantity match
                const serverItemDetails = getServerItemDetails(item);

                const hasDiscount =
                  serverItemDetails?.used_discount ||
                  (item.product.has_discount &&
                    new Date(item.product.has_discount) > new Date());

                const originalPrice =
                  serverItemDetails?.original_price ||
                  parseFloat(item.product.price || "0");

                const savings = serverItemDetails?.savings || 0;
                const itemTotal = serverItemDetails?.item_total || itemPrice * item.quantity;
                console.log("serverItemDetails",itemTotal)

                // Check if we're using estimated pricing
                const isEstimated = serverItemDetails?._isEstimated;

                const isEditingThisQuantity = editingQuantity.hasOwnProperty(
                  item._cartItemId
                );
                const displayQuantity = isEditingThisQuantity
                  ? editingQuantity[item._cartItemId]
                  : item.quantity;

                return (
                  <Card
                    dir="rtl"
                    key={item._cartItemId}
                    className={`border border-gray-200 rounded-lg shadow-sm transition-all duration-200 ${
                      isLoadingPrice ? "opacity-75" : ""
                    }`}
                  >
                    <CardContent className="">
                      <div className="flex gap-5">
                        {/* Product Image */}
                        <div className="w-38 h-auto bg-gray-50 rounded-lg overflow-hidden flex-shrink-0 relative">
                          <img
                            src={
                              item.product.main_image_url || "/placeholder.svg"
                            }
                            alt={productName}
                            className="w-full h-full object-cover"
                          />
                          {isLoadingPrice && (
                            <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center">
                              <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                          )}
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                          {/* Header Row */}
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <p
                                className="text-lg font-semibold text-gray-900 hover:text-primary transition-colors line-clamp-2"
                              >
                                {productName}
                              </p>
                              <p className="text-sm text-gray-500 mt-1">
                                {item.product.category?.name ||
                                  item.product.category}
                                {(item.product.subcategory?.name ||
                                  item.product.subcategory) && (
                                  <>
                                    {" - "}
                                    {item.product.subcategory?.name ||
                                      item.product.subcategory}
                                  </>
                                )}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(item._cartItemId)}
                              className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 h-auto rounded-full"
                            >
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          </div>

                          {/* Variant Info */}
                          {hasVariant && item.variant && (
                            <div className="text-sm text-gray-500 mb-3 bg-gray-50 px-2 py-1 rounded text-right">
                              <span className="font-medium">المتغير: </span>
                              {Object.entries(
                                item.variant.attributes || {}
                              ).map(([key, value]) => (
                                <span key={key} className="mr-2">
                                  {key}: {value}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Special Pricing Badge */}
                          <div className="flex items-center gap-2 mb-2">
                            {serverItemDetails?.special_pricing && (
                              <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded inline-block">
                                تسعير خاص متاح
                              </div>
                            )}
                            {isLoadingPrice && (
                              <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block flex items-center gap-1">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                جاري تحديث السعر...
                              </div>
                            )}
                            {isEstimated && !isLoadingPrice && (
                              <div className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded inline-block">
                                سعر تقديري
                              </div>
                            )}
                          </div>

                          {/* Price & Quantity Row */}
                          <div className="flex justify-between items-end space-y-2">
                            {/* Price Section */}
                            <div className="text-right">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-lg font-bold text-primary transition-all duration-200 ${
                                    isLoadingPrice ? "opacity-50" : ""
                                  }`}
                                >
                                  المجموع: {formatPrice(itemTotal)}
                                </span>
                                {isLoadingPrice && (
                                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                )}
                              </div>

                              <div className="flex items-center gap-2 mb-2">
                                <span
                                  className={`text-base font-semibold text-gray-400 transition-all duration-200 ${
                                    isLoadingPrice ? "opacity-50" : ""
                                  }`}
                                >
                                  {formatPrice(itemPrice)}
                                  {hasMeasureUnit ? ` / ${measureUnit}` : ""}
                                </span>
                                {hasDiscount && originalPrice !== itemPrice && (
                                  <span className="text-sm line-through text-gray-400">
                                    {formatPrice(originalPrice)}
                                  </span>
                                )}
                                {savings > 0 && (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                                    توفير {formatPrice(savings)}
                                  </span>
                                )}
                              </div>
                            </div>
                            {/* Quantity Controls */}
                            <div
                              className={`flex items-center bg-gray-100 rounded-lg border transition-all duration-200 ${
                                isLoadingPrice ? "opacity-75" : ""
                              }`}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-10 w-10 p-0 hover:bg-gray-200 rounded-l-lg"
                                onClick={() =>
                                  handleQuantityChange(
                                    item._cartItemId,
                                    Math.max(0, item.quantity - 1)
                                  )
                                }
                                disabled={isLoadingPrice}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>

                              {isEditingThisQuantity ? (
                                <input
                                  type="number"
                                  min="0.1"
                                  step="0.1"
                                  value={displayQuantity}
                                  onChange={(e) =>
                                    handleQuantityInputChange(
                                      item._cartItemId,
                                      e.target.value
                                    )
                                  }
                                  onBlur={() =>
                                    handleQuantityInputBlur(item._cartItemId)
                                  }
                                  onKeyPress={(e) =>
                                    handleQuantityInputKeyPress(
                                      e,
                                      item._cartItemId
                                    )
                                  }
                                  className="px-4 py-2 min-w-[80px] text-center font-semibold text-gray-900 bg-transparent border-0 focus:outline-none focus:ring-0"
                                  autoFocus
                                  disabled={isLoadingPrice}
                                />
                              ) : (
                                <span
                                  className="px-4 py-2 min-w-[80px] text-center font-semibold text-gray-900 cursor-pointer hover:bg-gray-200 flex items-center justify-center gap-1"
                                  onClick={() =>
                                    !isLoadingPrice &&
                                    setEditingQuantity((prev) => ({
                                      ...prev,
                                      [item._cartItemId]: item.quantity,
                                    }))
                                  }
                                >
                                  {item.quantity}
                                  {hasMeasureUnit ? ` ${measureUnit}` : ""}
                                  {isLoadingPrice && (
                                    <Loader2 className="h-3 w-3 animate-spin ml-1" />
                                  )}
                                </span>
                              )}

                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-10 w-10 p-0 hover:bg-gray-200 rounded-r-lg"
                                onClick={() =>
                                  handleQuantityChange(
                                    item._cartItemId,
                                    item.quantity + 1
                                  )
                                }
                                disabled={isLoadingPrice}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-1" dir="rtl">
            <Card className="sticky top-20 border-gray-300 shadow-none rounded-xl">
              <CardHeader>
                <CardTitle className="text-right text-xl">ملخص الطلب</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-right">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2 justify-end">
                    <span>اختر الولاية للتوصيل</span>
                    <MapPin className="h-4 w-4" />
                  </label>

                  {loadingPricing ? (
                    <div className="text-center py-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto"></div>
                      <span className="text-sm text-muted-foreground mt-2 block">
                        جاري تحميل الولايات...
                      </span>
                    </div>
                  ) : !pricingData?.wilayas?.length ? (
                    <div className="text-center py-2">
                      <span className="text-sm text-destructive">
                        لا توجد ولايات متاحة
                      </span>
                    </div>
                  ) : (
                    <Select
                      value={selectedWilayaId || ""}
                      onValueChange={(value) => {
                        console.log("Selected wilaya:", value);
                        setSelectedWilayaId(value);
                      }}
                    >
                      <SelectTrigger className="text-right w-full">
                        <SelectValue placeholder="اختر الولاية" />
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        className="max-h-60 overflow-y-auto z-50"
                        sideOffset={4}
                      >
                        {pricingData.wilayas.map((wilaya) => (
                          <SelectItem
                            key={`wilaya-${wilaya.id}`}
                            value={wilaya.id.toString()}
                            className="text-right cursor-pointer"
                          >
                            {`${wilaya.name} - ${
                              wilaya.delivery_fee === 0
                                ? "مجاني"
                                : formatPrice(wilaya.delivery_fee)
                            }`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {!selectedWilayaId && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                    <p className="text-sm text-yellow-800 text-right">
                      يرجى اختيار الولاية لحساب رسوم التوصيل وإتمام الطلب
                    </p>
                  </div>
                )}

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>المجموع الفرعي:</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>

                  {totalSavings > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>إجمالي التوفير:</span>
                      <span>-{formatPrice(totalSavings)}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span>رسوم التوصيل:</span>
                    <span>
                      {selectedWilayaId ? (
                        deliveryFee === 0 ? (
                          <span className="text-success">مجاني</span>
                        ) : (
                          formatPrice(deliveryFee)
                        )
                      ) : (
                        <span className="text-muted-foreground">
                          اختر الولاية
                        </span>
                      )}
                    </span>
                  </div>

                  {selectedWilayaInfo && (
                    <div className="text-sm text-muted-foreground">
                      التوصيل إلى: {selectedWilayaInfo.wilaya_name}
                    </div>
                  )}

                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>المجموع الكلي:</span>
                    <span className="text-primary">
                      {selectedWilayaId
                        ? formatPrice(totalWithDelivery)
                        : formatPrice(subtotal)}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {selectedWilayaId && !isProcessing ? (
                    <Button
                      className="w-full bg-primary hover:bg-primary-dark transition-all duration-200"
                      size="lg"
                      onClick={handleCheckout}
                    >
                      إتمام الطلب
                    </Button>
                  ) : (
                    <Button
                      className={`w-full transition-all duration-200 ${
                        !selectedWilayaId
                          ? "opacity-50 cursor-not-allowed bg-gray-400 hover:bg-gray-400"
                          : ""
                      }`}
                      size="lg"
                      disabled={true}
                      onClick={(e) => e.preventDefault()}
                    >
                      {isProcessing ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>جاري المعالجة...</span>
                        </div>
                      ) : (
                        "اختر الولاية أولاً"
                      )}
                    </Button>
                  )}

                  <Link to="/shop" className="block">
                    <Button
                      variant="outline"
                      className="w-full border-primary text-primary hover:bg-primary hover:text-white"
                    >
                      متابعة التسوق
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
