import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  MapPin,
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

const Cart = () => {
  const {
    items,
    total,
    updateQuantity,
    removeItem,
    clearCart,
    pricingData,
    loadingPricing,
  } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedWilayaId, setSelectedWilayaId] = useState(null);

  const formatPrice = (price) => {
    // Handle undefined, null, or non-numeric values
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

  const handleQuantityChange = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeItem(productId);
    } else {
      updateQuantity(productId, newQuantity);
    }
  };

  const getItemPrice = (item) => {
    // Use server pricing data if available
    if (pricingData && pricingData.data && pricingData.data.pricing_details) {
      const serverItem = pricingData.data.pricing_details.find(
        (detail) => detail.product_id === item.product.id
      );
      if (serverItem) {
        return serverItem.unit_price;
      }
    }

    // Fallback to client-side calculation
    const hasDiscount = item.product.has_discount;
    const discountPrice = parseFloat(item.product.discount_price || "0");
    const originalPrice = parseFloat(item.product.price || "0");
    return hasDiscount && discountPrice > 0 ? discountPrice : originalPrice;
  };

  // Get selected wilaya delivery info
  const getSelectedWilayaInfo = () => {
    if (!selectedWilayaId || !pricingData?.data?.delivery_options) {
      return null;
    }
    return pricingData.data.delivery_options.find(
      (option) => option.wilaya_id === parseInt(selectedWilayaId)
    );
  };

  console.log("pricingData", pricingData);
  const selectedWilayaInfo = getSelectedWilayaInfo();
  const deliveryFee = selectedWilayaInfo?.delivery_fee || 0;
  const subtotal = pricingData?.data?.subtotal || total;
  const totalWithDelivery = selectedWilayaInfo?.total_with_delivery || subtotal;
  const totalSavings = pricingData?.data?.total_savings || 0;

  // Debug logging - remove in production
  console.log("Cart Debug Info:", {
    pricingData,
    selectedWilayaId,
    selectedWilayaInfo,
    deliveryFee,
    subtotal,
    totalWithDelivery,
    loadingPricing,
    hasWilayas: !!pricingData?.data?.wilayas,
    wilayasCount: pricingData?.data?.wilayas?.length,
  });
  console.log("items",items)

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

      <div className="container mx-auto px-4 py-6 ">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary">
            الرئيسية
          </Link>
          <span>/</span>
          <span className="text-foreground">السلة</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4" dir="rtl">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-right">
                سلة التسوق ({items.length} منتج)
              </h1>
              <Button
                variant="destructive"
                size="sm"
                onClick={clearCart}
                className="text-destructive bg-white! hover:bg-destructive!  hover:text-red-100  "
              >
                <Trash2 className="h-4 w-4" />
                <span>مسح الكل</span>
              </Button>
            </div>

            <div className="space-y-4">
              {items.map((item) => {
                const itemPrice = getItemPrice(item);
                const itemTotal = itemPrice * item.quantity;
                const serverItemDetails =
                  pricingData?.data?.pricing_details?.find(
                    (detail) => detail.product_id === item.product.id
                  );

                const hasDiscount =
                  serverItemDetails?.used_discount ||
                  (item.product.has_discount &&
                    new Date(item.product.has_discount) > new Date());

                const originalPrice =
                  serverItemDetails?.original_price ||
                  parseFloat(item.product.price || "0");

                const savings = serverItemDetails?.savings || 0;

                return (
                  <Card
                    dir="rtl"
                    key={item.product.id}
                    className="overflow-hidden border border-gray-300 p-0"
                  >
                    <CardContent className="p-6">
                      <div className="flex gap-7 flex-row">
                        {/* Product image on the right side */}
                        <div className="w-32 h-32 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={
                              item.product.main_image_url || "/placeholder.svg"
                            }
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Product details on the left side */}
                        <div className="flex-1 space-y-2 text-right">
                          <div className="flex justify-between items-start flex-row">
                            <div>
                              <Link
                                to={`/product/${item.product.id}`}
                                className="text-lg font-semibold hover:text-primary transition-colors"
                              >
                                {item.product.name}
                              </Link>
                              <p className="text-sm text-muted-foreground">
                                {item.product.category?.name} -{" "}
                                {item.product.subcategory?.name}
                              </p>
                              {serverItemDetails?.special_pricing && (
                                <p className="text-xs text-green-600 font-medium">
                                  تسعير خاص متاح
                                </p>
                              )}
                            </div>

                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => removeItem(item.product.id)}
                              className="text-destructive bg-white! hover:bg-destructive! hover:text-red-100  "
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="flex items-center justify-between flex-row">
                            <div className="space-y-1 text-right">
                              <div className="flex items-center gap-2 flex-row">
                                <span className="text-lg font-bold price-color">
                                  {formatPrice(itemPrice)}
                                </span>
                                {hasDiscount && originalPrice !== itemPrice && (
                                  <span className="text-sm line-through original-price-color">
                                    {formatPrice(originalPrice)}
                                  </span>
                                )}
                                {savings > 0 && (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                    توفير {formatPrice(savings)}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                المجموع:{" "}
                                {formatPrice(
                                  serverItemDetails?.item_total || itemTotal
                                )}
                              </div>
                            </div>

                            <div className="flex items-center border rounded-lg p-0 flex-row border-none">
                              <Button
                                variant="outline"
                                className={"shadow-none"}
                                size="sm"
                                onClick={() =>
                                  handleQuantityChange(
                                    item.product.id,
                                    item.quantity - 1
                                  )
                                }
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="px-4 py-2 min-w-[60px] text-center font-black text-primary">
                                {item.quantity}
                              </span>
                              <Button
                                variant="outline"
                                className={"shadow-none"}
                                size="sm"
                                onClick={() =>
                                  handleQuantityChange(
                                    item.product.id,
                                    item.quantity + 1
                                  )
                                }
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

          {/* Order Summary */}
          <div className="lg:col-span-1" dir="rtl">
            <Card className="sticky top-20 border-gray-300">
              <CardHeader>
                <CardTitle className="text-right">ملخص الطلب</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-right">
                {/* Wilaya Selection */}
                <div className="space-y-2 flex justify-between">
                  <label className="text-sm font-medium flex items-center gap-2 justify-end">
                    <span>اختر الولاية للتوصيل</span>
                    <MapPin className="h-4 w-4" />
                  </label>

                  <Select
                    value={selectedWilayaId}
                    onValueChange={setSelectedWilayaId}
                    disabled={!pricingData?.data?.wilayas || loadingPricing}
                  >
                    <SelectTrigger className="text-right">
                      <SelectValue
                        placeholder={
                          loadingPricing
                            ? "جاري التحميل..."
                            : !pricingData?.data?.wilayas
                            ? "لا توجد بيانات"
                            : "اختر الولاية"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {(pricingData?.data?.wilayas || []).map((wilaya) => (
                        <SelectItem
                          key={wilaya.id}
                          value={wilaya.id.toString()}
                        >
                          <div className="flex justify-between items-center w-full">
                            <span>{wilaya.name}</span>
                            <span className="text-sm text-muted-foreground ml-2">
                              {wilaya.delivery_fee === 0
                                ? "مجاني"
                                : formatPrice(wilaya.delivery_fee)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Show warning if no wilaya is selected */}
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
                    <span className="price-color">
                      {selectedWilayaId
                        ? formatPrice(totalWithDelivery)
                        : formatPrice(subtotal)}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {selectedWilayaId && !isProcessing ? (
                    <Link to="/checkout" className="block">
                      <Button
                        className="w-full transition-all duration-200"
                        size="lg"
                      >
                        إتمام الطلب
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      className={`w-full transition-all duration-200 ${
                        !selectedWilayaId 
                          ? 'opacity-50 cursor-not-allowed bg-gray-400 hover:bg-gray-400' 
                          : ''
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
                    <Button variant="outline" className="w-full">
                      متابعة التسوق
                    </Button>
                  </Link>
                </div>

                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• إمكانية الإرجاع خلال 14 يوم</p>
                  <p>• دفع آمن ومضمون</p>
                  <p>
                    • {pricingData?.data?.items_count || items.length} منتج في
                    السلة
                  </p>
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
