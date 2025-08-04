import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin, User, Mail, Phone, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import Header from '@/components/customer/layout/Header';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { useApi } from '@/contexts/RestContext'; // Add this import

const Checkout = () => {
  const { items, total, clearCart, pricingData, loadingPricing } = useCart();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { api } = useApi(); // Add this line
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    wilayaId: 0,
    notes: ''
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get wilayas from pricing data
  const wilayas = pricingData?.data?.wilayas || [];
  
  // Get selected wilaya from pricing data
  const selectedWilaya = wilayas.find(w => w.id === formData.wilayaId);
  
  // Get delivery option for selected wilaya from pricing data
  const selectedDeliveryOption = pricingData?.data?.delivery_options?.find(
    option => option.wilaya_id === formData.wilayaId
  );
  
  // Use server-calculated values when available
  const subtotal = pricingData?.data?.subtotal || total;
  const deliveryFee = selectedDeliveryOption?.delivery_fee || 0;
  const finalTotal = selectedDeliveryOption?.total_with_delivery || (subtotal + deliveryFee);
  const totalSavings = pricingData?.data?.total_savings || 0;

  const formatPrice = (price) => {
    // Handle undefined, null, or non-numeric values
    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice)) {
      console.warn('Invalid price value:', price);
      return '0 د.ج';
    }
    
    return new Intl.NumberFormat('ar-DZ', {
      style: 'currency',
      currency: 'DZD',
      minimumFractionDigits: 0,
    }).format(numericPrice);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'الاسم الكامل مطلوب';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'البريد الإلكتروني مطلوب';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'صيغة البريد الإلكتروني غير صحيحة';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'رقم الهاتف مطلوب';
    } else if (!/^[0-9+\s-]+$/.test(formData.phone)) {
      newErrors.phone = 'رقم الهاتف غير صحيح';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'العنوان مطلوب';
    }

    if (formData.wilayaId === 0) {
      newErrors.wilayaId = 'يجب اختيار الولاية';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
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
      const selectedWilayaName = wilayas.find(w => w.id === formData.wilayaId)?.name || '';
      
      // Prepare the order data to match the backend API structure
      const orderData = {
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        wilaya: selectedWilayaName,
        address: formData.address,
        notes: formData.notes || null,
        items: items.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity
        }))
      };

      console.log('Sending order data:', orderData);

      // Make the API call to create the order
      const [orderResponse, response, responseCode, error] = await api.post(
        "/order/add", // Adjust this endpoint path as needed
        orderData
      );

      if (responseCode === 201 && orderResponse?.success) {
        // Clear cart after successful order
        clearCart();
        
        toast({
          title: "تم إرسال الطلب بنجاح!",
          description: `رقم الطلب: ${orderResponse.orderId}. سيتم الاتصال بك قريباً لتأكيد الطلب`,
        });
        
        // Navigate to success page with order details
        navigate('/order-success', { 
          state: { 
            orderId: orderResponse.orderId,
            totalPrice: orderResponse.totalPrice,
            subtotal: orderResponse.subtotal,
            deliveryFee: orderResponse.deliveryFee
          }
        });
      } else {
        console.error("Order creation error:", error);
        toast({
          title: "خطأ في إرسال الطلب",
          description: error || "حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Network error:", error);
      toast({
        title: "خطأ في الاتصال",
        description: "تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getItemPrice = (item) => {
    // Use server pricing data if available
    if (pricingData?.data?.pricing_details) {
      const serverItem = pricingData.data.pricing_details.find(
        detail => detail.product_id === item.product.id
      );
      if (serverItem) {
        return serverItem.unit_price;
      }
    }

    // Fallback to client-side calculation
    const hasDiscount = item.product.has_discount;
    const discountPrice = parseFloat(item.product.discount_price || '0');
    const originalPrice = parseFloat(item.product.price || '0');
    return hasDiscount && discountPrice > 0 ? discountPrice : originalPrice;
  };

  if (items.length === 0) {
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

  return (
    <div className="min-h-screen bg-shop-bg">
      <Header />
      
      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary">الرئيسية</Link>
          <span>/</span>
          <Link to="/cart" className="hover:text-primary">السلة</Link>
          <span>/</span>
          <span className="text-foreground">إتمام الطلب</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">معلومات التوصيل</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <User className="h-5 w-5" />
                      المعلومات الشخصية
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">الاسم الكامل *</Label>
                        <Input
                          id="fullName"
                          value={formData.fullName}
                          onChange={(e) => handleInputChange('fullName', e.target.value)}
                          placeholder="أدخل اسمك الكامل"
                          className={errors.fullName ? 'border-destructive' : ''}
                        />
                        {errors.fullName && (
                          <p className="text-sm text-destructive">{errors.fullName}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">رقم الهاتف *</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          placeholder="05XXXXXXXX"
                          className={errors.phone ? 'border-destructive' : ''}
                        />
                        {errors.phone && (
                          <p className="text-sm text-destructive">{errors.phone}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">البريد الإلكتروني *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="example@email.com"
                        className={errors.email ? 'border-destructive' : ''}
                      />
                      {errors.email && (
                        <p className="text-sm text-destructive">{errors.email}</p>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Delivery Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      معلومات التوصيل
                    </h3>

                    <div className="space-y-2">
                      <Label htmlFor="wilaya">الولاية *</Label>
                      <Select 
                        value={formData.wilayaId.toString()} 
                        onValueChange={(value) => handleInputChange('wilayaId', parseInt(value))}
                        disabled={loadingPricing || wilayas.length === 0}
                      >
                        <SelectTrigger className={errors.wilayaId ? 'border-destructive' : ''}>
                          <SelectValue placeholder={
                            loadingPricing ? "جاري التحميل..." : 
                            wilayas.length === 0 ? "لا توجد ولايات متاحة" : 
                            "اختر الولاية"
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          {wilayas.map((wilaya) => (
                            <SelectItem key={wilaya.id} value={wilaya.id.toString()}>
                              <div className="flex justify-between items-center w-full">
                                <span>{wilaya.name}</span>
                                <span className="text-sm text-muted-foreground mr-2">
                                  {wilaya.delivery_fee === 0 ? 'مجاني' : formatPrice(wilaya.delivery_fee)}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.wilayaId && (
                        <p className="text-sm text-destructive">{errors.wilayaId}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">العنوان التفصيلي *</Label>
                      <Textarea
                        id="address"
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        placeholder="أدخل عنوانك بالتفصيل (الشارع، الحي، رقم المنزل...)"
                        rows={3}
                        className={errors.address ? 'border-destructive' : ''}
                      />
                      {errors.address && (
                        <p className="text-sm text-destructive">{errors.address}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">ملاحظات إضافية</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
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
                <CardTitle>ملخص الطلب</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Wilaya Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    اختر الولاية للتوصيل
                  </label>
                  
                  <Select 
                    value={formData.wilayaId.toString()} 
                    onValueChange={(value) => handleInputChange('wilayaId', parseInt(value))}
                    disabled={!pricingData?.data?.wilayas || loadingPricing}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        loadingPricing ? "جاري التحميل..." : 
                        !pricingData?.data?.wilayas ? "لا توجد بيانات" : 
                        "اختر الولاية"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {pricingData?.data?.wilayas?.map((wilaya) => (
                        <SelectItem key={wilaya.id} value={wilaya.id.toString()}>
                          <div className="flex justify-between items-center w-full">
                            <span>{wilaya.name}</span>
                            <span className="text-sm text-muted-foreground mr-2">
                              {wilaya.delivery_fee === 0 ? 'مجاني' : formatPrice(wilaya.delivery_fee)}
                            </span>
                          </div>
                        </SelectItem>
                      )) || []}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {loadingPricing && (
                  <div className="text-center py-4 text-muted-foreground">
                    جاري حساب الأسعار...
                  </div>
                )}

                {/* Cart Items - Use server pricing data when available */}
                <div className="space-y-3">
                  {pricingData?.data?.pricing_details ? (
                    // Use server-side pricing details
                    pricingData.data.pricing_details.map((serverItem) => {
                      // Find the corresponding cart item for image
                      const cartItem = items.find(item => item.product.id === serverItem.product_id);
                      
                      return (
                        <div key={serverItem.product_id} className="flex gap-3">
                          <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                            {cartItem?.product?.main_image_url ? (
                              <img
                                src={cartItem.product.main_image_url}
                                alt={serverItem.product_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xs">
                                صورة
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-sm line-clamp-2">
                              {serverItem.product_name}
                            </h4>
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-sm text-muted-foreground">
                                الكمية: {serverItem.quantity}
                              </span>
                              <div className="text-right">
                                <span className="font-medium">
                                  {formatPrice(serverItem.item_total)}
                                </span>
                                {serverItem.used_discount && (
                                  <div className="text-xs text-muted-foreground line-through">
                                    {formatPrice(serverItem.original_price * serverItem.quantity)}
                                  </div>
                                )}
                              </div>
                            </div>
                            {serverItem.special_pricing && (
                              <div className="text-xs text-green-600 mt-1">
                                تسعير خاص متاح
                              </div>
                            )}
                            {serverItem.savings > 0 && (
                              <div className="text-xs text-green-600 mt-1">
                                وفرت: {formatPrice(serverItem.savings)}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    // Fallback to original cart items display
                    items.map((item) => {
                      const itemPrice = getItemPrice(item);
                      
                      return (
                        <div key={item.product.id} className="flex gap-3">
                          <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                            <img
                              src={item.product.main_image_url || '/placeholder.svg'}
                              alt={item.product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-sm line-clamp-2">
                              {item.product.name}
                            </h4>
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-sm text-muted-foreground">
                                الكمية: {item.quantity}
                              </span>
                              <span className="font-medium">
                                {formatPrice(itemPrice * item.quantity)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
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
                      {formData.wilayaId ? (
                        deliveryFee === 0 ? (
                          <span className="text-success">مجاني</span>
                        ) : (
                          formatPrice(deliveryFee)
                        )
                      ) : (
                        <span className="text-muted-foreground">اختر الولاية</span>
                      )}
                    </span>
                  </div>
                  
                  {formData.wilayaId > 0 && selectedDeliveryOption && (
                    <div className="text-sm text-muted-foreground">
                      التوصيل إلى: {selectedDeliveryOption.wilaya_name}
                    </div>
                  )}
                  
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>المجموع الكلي:</span>
                    <span className="price-color">
                      {formData.wilayaId ? formatPrice(finalTotal) : formatPrice(subtotal)}
                    </span>
                  </div>
                </div>

                <Button 
                  onClick={handleSubmit}
                  className="w-full" 
                  size="lg"
                  disabled={isSubmitting || items.length === 0 || loadingPricing || !formData.wilayaId}
                >
                  {isSubmitting ? 'جاري إرسال الطلب...' : 
                   loadingPricing ? 'جاري حساب الأسعار...' : 
                   !formData.wilayaId ? 'اختر الولاية أولاً' :
                   'تأكيد الطلب'}
                </Button>

                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• سيتم الاتصال بك لتأكيد الطلب</p>
                  <p>• الدفع عند الاستلام</p>
                  <p>• إمكانية الإرجاع خلال 14 يوم</p>
                  <p>• {pricingData?.data?.items_count || items.length} منتج في السلة</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;