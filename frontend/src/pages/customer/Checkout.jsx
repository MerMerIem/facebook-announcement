import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  MapPin,
  User,
  Mail,
  Phone,
  Home,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import Header from "@/components/customer/layout/Header";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { useApi } from "@/contexts/RestContext";

// Utility function to decode checkout data with better error handling
const decodeCheckoutData = (encodedData) => {
  try {
    // First, decode the base64
    const decodedString = atob(encodedData);
    // Then decode the URI component
    const unescapedString = decodeURIComponent(decodedString);

    console.log(JSON.parse(unescapedString));
    // Finally parse the JSON
    return JSON.parse(unescapedString);
  } catch (error) {
    console.error("Error decoding checkout data:", error);
    console.error("Encoded data:", encodedData);
    return null;
  }
};

const Checkout = () => {
  const { items, total, clearCart, pricingData, loadingPricing } = useCart();
  const navigate = useNavigate();
  const { api } = useApi();
  const [searchParams] = useSearchParams();

  // Get encoded data from URL
  const encodedData = searchParams.get("data");
  const urlCheckoutData = encodedData ? decodeCheckoutData(encodedData) : null;

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    wilayaId: 0,
    notes: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine data source and prepare checkout data
  const isUsingUrlData = !!urlCheckoutData;
  const checkoutItems = isUsingUrlData ? urlCheckoutData.items : items;

  // Get pricing data - prioritize URL data
  const checkoutPricing = isUsingUrlData
    ? urlCheckoutData.pricing
    : {
        subtotal: pricingData?.subtotal || total,
        deliveryFee: 0,
        totalWithDelivery: pricingData?.subtotal || total,
        totalSavings: pricingData?.total_savings || 0,
      };

  const urlWilaya = urlCheckoutData?.wilaya;
  const wilayas = pricingData?.wilayas || [];

  // Get selected wilaya info
  const selectedWilaya =
    urlWilaya || wilayas.find((w) => w.id === formData.wilayaId);

  // Calculate delivery info
  const deliveryFee = isUsingUrlData
    ? checkoutPricing.deliveryFee
    : selectedWilaya
    ? selectedWilaya.delivery_fee || 0
    : 0;

  const subtotal = checkoutPricing.subtotal;
  const finalTotal = isUsingUrlData
    ? checkoutPricing.totalWithDelivery
    : subtotal + deliveryFee;
  const totalSavings = checkoutPricing.totalSavings;

  // Set wilaya from URL data on mount
  useEffect(() => {
    if (urlWilaya && formData.wilayaId === 0) {
      setFormData((prev) => ({ ...prev, wilayaId: urlWilaya.id }));
    }
  }, [urlWilaya, formData.wilayaId]);

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

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = "الاسم الكامل مطلوب";
    }

    if (!formData.email.trim()) {
      newErrors.email = "البريد الإلكتروني مطلوب";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "صيغة البريد الإلكتروني غير صحيحة";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "رقم الهاتف مطلوب";
    } else if (!/^[0-9+\s-]+$/.test(formData.phone)) {
      newErrors.phone = "رقم الهاتف غير صحيح";
    }

    if (!formData.address.trim()) {
      newErrors.address = "العنوان مطلوب";
    }

    if (!urlWilaya && formData.wilayaId === 0) {
      newErrors.wilayaId = "يجب اختيار الولاية";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Get the selected wilaya name
      const selectedWilayaName =
        urlWilaya?.name ||
        wilayas.find((w) => w.id === formData.wilayaId)?.name ||
        "";

      // Prepare the order data
      const orderData = {
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        wilaya: selectedWilayaName,
        address: formData.address,
        notes: formData.notes || null,
        items: isUsingUrlData
          ? urlCheckoutData.items.map((item) => ({
              product_id: item.productId,
              parent_product_id: item?.parent_product_id,
              quantity: item.quantity,
            }))
          : items.map((item) => ({
              product_id: item.product.id,
              parent_product_id: item?.parent_product_id,

              quantity: item.quantity,
            })),
        pricing_verification: {
          subtotal: subtotal,
          delivery_fee: deliveryFee,
          total_with_delivery: finalTotal,
          total_savings: totalSavings,
        },
      };

      console.log("Sending order data:", orderData);

      const [orderResponse, response, responseCode, error] = await api.post(
        "/order/add",
        orderData
      );
      console.log("orderResponse",orderResponse)
      console.log("response",response)
      console.log("responseCode",responseCode)
      console.log("error",error)

      if (responseCode === 201 && orderResponse?.success) {
        clearCart();

        toast.success("تم إرسال الطلب بنجاح!", {
          description: `رقم الطلب: ${orderResponse.orderId}. سيتم الاتصال بك قريباً لتأكيد الطلب`,
          duration: 4000,
          style: {
            background: "#22c55e",
            color: "#ffffff",
            direction: "rtl",
            textAlign: "right",
          },
        });

        navigate("/order-success", {
          state: {
            orderId: orderResponse.orderId,
            totalPrice: orderResponse.totalPrice,
            subtotal: orderResponse.subtotal,
            deliveryFee: orderResponse.deliveryFee,
          },
        });
      } else {
        console.error("Order creation error:", error);
        console.log("Order response:", orderResponse);
        console.log("Response code:", responseCode);

        // Extract error message safely - UPDATED LOGIC
        let errorMessage = "حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى";

        // Check different possible error sources
        if (orderResponse && orderResponse.error) {
          // Error returned in orderResponse (from your API wrapper)
          errorMessage = orderResponse.error;
          console.log("Error from orderResponse:", errorMessage);
        } else if (response && response.data && response.data.error) {
          // Error in response.data.error (your backend format)
          errorMessage = response.data.error;
          console.log("Error from response.data.error:", errorMessage);
        } else if (error) {
          if (typeof error === "string") {
            errorMessage = error;
            console.log("Error as string:", errorMessage);
          } else if (error.response?.data?.error) {
            // Standard axios error with your backend format
            errorMessage = error.response.data.error;
            console.log("Error from error.response.data.error:", errorMessage);
          } else if (error.response?.data?.message) {
            // Fallback to message field
            errorMessage = error.response.data.message;
            console.log("Error from error.response.data.message:", errorMessage);
          } else if (error.message) {
            errorMessage = error.message;
            console.log("Error from error.message:", errorMessage);
          }
        }

        console.log("Final errorMessage:", errorMessage);

        toast.error("خطأ في إرسال الطلب", {
          description: errorMessage,
          duration: 4000,
          style: {
            background: "#ef4444",
            color: "#ffffff",
            direction: "rtl",
            textAlign: "right",
          },
        });
      }
    } catch (error) {
      console.error("Network error:", error);

      // Extract error message safely
      let errorMessage =
        "تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى";

      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast.error("خطأ في الاتصال", {
        description: errorMessage,
        duration: 4000,
        style: {
          background: "#ef4444",
          color: "#ffffff",
          direction: "rtl",
          textAlign: "right",
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if we have valid checkout data
  if (!checkoutItems || checkoutItems.length === 0) {
    return (
      <div className="min-h-screen bg-shop-bg">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <h1 className="text-3xl font-bold mb-4">السلة فارغة</h1>
            <p className="text-muted-foreground mb-8">
              لا يمكن إتمام الطلب والسلة فارغة
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

  // Show error if encoded data is invalid
  if (encodedData && !urlCheckoutData) {
    return (
      <div className="min-h-screen bg-shop-bg">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <h1 className="text-3xl font-bold mb-4">بيانات غير صالحة</h1>
            <p className="text-muted-foreground mb-8">
              بيانات الطلب غير صالحة أو منتهية الصلاحية
            </p>
            <Link to="/cart">
              <Button size="lg">
                العودة إلى السلة
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
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary">
            الرئيسية
          </Link>
          <span>/</span>
          <Link to="/cart" className="hover:text-primary">
            السلة
          </Link>
          <span>/</span>
          <span className="text-foreground">إتمام الطلب</span>
        </nav>

        {/* Data Source Info */}
        {isUsingUrlData && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>معلومة:</strong> تم تحميل بيانات الطلب من السلة مع التسعير
              المحدث.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl sm:text-2xl">معلومات التوصيل</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                      <User className="h-4 w-4 sm:h-5 sm:w-5" />
                      المعلومات الشخصية
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">الاسم الكامل *</Label>
                        <Input
                          id="fullName"
                          value={formData.fullName}
                          onChange={(e) =>
                            handleInputChange("fullName", e.target.value)
                          }
                          placeholder="أدخل اسمك الكامل"
                          className={
                            errors.fullName ? "border-destructive" : ""
                          }
                        />
                        {errors.fullName && (
                          <p className="text-sm text-destructive">
                            {errors.fullName}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">رقم الهاتف *</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) =>
                            handleInputChange("phone", e.target.value)
                          }
                          placeholder="05XXXXXXXX"
                          className={errors.phone ? "border-destructive" : ""}
                        />
                        {errors.phone && (
                          <p className="text-sm text-destructive">
                            {errors.phone}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">البريد الإلكتروني *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          handleInputChange("email", e.target.value)
                        }
                        placeholder="example@email.com"
                        className={errors.email ? "border-destructive" : ""}
                      />
                      {errors.email && (
                        <p className="text-sm text-destructive">
                          {errors.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Delivery Information */}
                  <div className="space-y-4">
                    <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                      <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
                      معلومات التوصيل
                    </h3>

                    <div className="space-y-2">
                      <Label htmlFor="wilaya">الولاية *</Label>
                      {urlWilaya ? (
                        <div className="p-3 bg-gray-50 border rounded-md">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">
                              {urlWilaya.name}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {urlWilaya.deliveryFee === 0
                                ? "مجاني"
                                : formatPrice(urlWilaya.deliveryFee)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            تم اختيار الولاية من السلة
                          </p>
                        </div>
                      ) : (
                        <Select
                          value={formData.wilayaId.toString()}
                          onValueChange={(value) =>
                            handleInputChange("wilayaId", parseInt(value))
                          }
                          disabled={loadingPricing || wilayas.length === 0}
                        >
                          <SelectTrigger
                            className={
                              errors.wilayaId ? "border-destructive" : ""
                            }
                          >
                            <SelectValue
                              placeholder={
                                loadingPricing
                                  ? "جاري التحميل..."
                                  : wilayas.length === 0
                                  ? "لا توجد ولايات متاحة"
                                  : "اختر الولاية"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {wilayas.map((wilaya) => (
                              <SelectItem
                                key={wilaya.id}
                                value={wilaya.id.toString()}
                              >
                                <div className="flex justify-between items-center w-full">
                                  <span>{wilaya.name}</span>
                                  <span className="text-sm text-muted-foreground mr-2">
                                    {wilaya.delivery_fee === 0
                                      ? "مجاني"
                                      : formatPrice(wilaya.delivery_fee)}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {errors.wilayaId && (
                        <p className="text-sm text-destructive">
                          {errors.wilayaId}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">العنوان التفصيلي *</Label>
                      <Textarea
                        id="address"
                        value={formData.address}
                        onChange={(e) =>
                          handleInputChange("address", e.target.value)
                        }
                        placeholder="أدخل عنوانك بالتفصيل (الشارع، الحي، رقم المنزل...)"
                        rows={3}
                        className={errors.address ? "border-destructive" : ""}
                      />
                      {errors.address && (
                        <p className="text-sm text-destructive">
                          {errors.address}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">ملاحظات إضافية</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) =>
                          handleInputChange("notes", e.target.value)
                        }
                        placeholder="أي ملاحظات خاصة بالطلب (اختياري)"
                        rows={2}
                      />
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>ملخص الطلب</span>
                  {!isUsingUrlData && loadingPricing && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Loading State for Context Data */}
                {!isUsingUrlData && loadingPricing && (
                  <div className="text-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                    <p className="text-sm text-muted-foreground">
                      جاري حساب الأسعار...
                    </p>
                  </div>
                )}

                {/* Cart Items */}
                <div className="space-y-3">
                  {checkoutItems.map((item, index) => {
                    // Handle different item structures
                    const itemData = isUsingUrlData
                      ? {
                          id: item.productId,
                          name: item.productName,
                          quantity: item.quantity,
                          unitPrice: item.unitPrice,
                          itemTotal: item.itemTotal,
                          originalPrice: item.originalPrice,
                          savings: item.savings,
                          hasDiscount: item.hasDiscount,
                          imageUrl: item.imageUrl,
                          hasMeasureUnit: item.hasMeasureUnit,
                          measureUnit: item.measureUnit,
                          hasVariant: item.hasVariant,
                          variant: item.variant,
                        }
                      : {
                          id: item.product?.id,
                          name:
                            item.product?.name || item.product?.product_name,
                          quantity: item.quantity,
                          unitPrice: item.product?.price,
                          itemTotal: item.product?.price * item.quantity,
                          imageUrl: item.product?.main_image_url,
                          hasMeasureUnit: item.product?.has_measure_unit === 1,
                          measureUnit: item.product?.measure_unit,
                        };

                    return (
                      <div
                        key={`item-${itemData.id}-${index}`}
                        className="flex gap-2 sm:gap-3"
                      >
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {itemData.imageUrl ? (
                            <img
                              src={itemData.imageUrl}
                              alt={itemData.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xs">
                              صورة
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-xs sm:text-sm line-clamp-2">
                            {itemData.name}
                          </h4>
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-1 gap-1">
                            <span className="text-xs sm:text-sm text-muted-foreground">
                              الكمية: {itemData.quantity}
                              {itemData.hasMeasureUnit && itemData.measureUnit
                                ? ` ${itemData.measureUnit}`
                                : ""}
                            </span>
                            <div className="text-right">
                              <span className="font-medium text-sm">
                                {formatPrice(itemData.itemTotal)}
                              </span>
                              {itemData.hasDiscount &&
                                itemData.originalPrice !==
                                  itemData.unitPrice && (
                                  <div className="text-xs text-muted-foreground line-through">
                                    {formatPrice(
                                      itemData.originalPrice * itemData.quantity
                                    )}
                                  </div>
                                )}
                            </div>
                          </div>
                          {itemData.savings > 0 && (
                            <div className="text-xs text-green-600 mt-1">
                              وفرت: {formatPrice(itemData.savings)}
                            </div>
                          )}
                          {itemData.hasVariant && itemData.variant && (
                            <div className="text-xs text-gray-500 mt-1">
                              {Object.entries(
                                itemData.variant.attributes || {}
                              ).map(([key, value]) => (
                                <span key={key} className="mr-2">
                                  {key}: {value}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Separator />

                {/* Pricing Summary */}
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
                      {formData.wilayaId || urlWilaya ? (
                        deliveryFee === 0 ? (
                          <span className="text-green-600">مجاني</span>
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

                  {(selectedWilaya || urlWilaya) && (
                    <div className="text-sm text-muted-foreground">
                      التوصيل إلى: {(selectedWilaya || urlWilaya)?.name}
                    </div>
                  )}

                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>المجموع الكلي:</span>
                    <span className="text-primary">
                      {formatPrice(finalTotal)}
                    </span>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  onClick={handleSubmit}
                  className="w-full"
                  size="lg"
                  disabled={
                    isSubmitting ||
                    !checkoutItems ||
                    checkoutItems.length === 0 ||
                    (!urlWilaya && (loadingPricing || !formData.wilayaId))
                  }
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>جاري إرسال الطلب...</span>
                    </div>
                  ) : !isUsingUrlData && loadingPricing ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>جاري حساب الأسعار...</span>
                    </div>
                  ) : !formData.wilayaId && !urlWilaya ? (
                    "اختر الولاية أولاً"
                  ) : (
                    "تأكيد الطلب"
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
