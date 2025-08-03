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

// Mock wilayas data
const mockWilayas = [
  { id: 1, name: "أدرار", delivery_fee: "3500.00" },
  { id: 2, name: "الشلف", delivery_fee: "0.00" },
  { id: 3, name: "الأغواط", delivery_fee: "0.00" },
  { id: 4, name: "أم البواقي", delivery_fee: "0.00" },
  { id: 5, name: "باتنة", delivery_fee: "0.00" },
  { id: 6, name: "بجاية", delivery_fee: "0.00" },
  { id: 7, name: "بسكرة", delivery_fee: "0.00" },
  { id: 8, name: "بشار", delivery_fee: "0.00" },
  { id: 9, name: "البليدة", delivery_fee: "0.00" },
  { id: 10, name: "البويرة", delivery_fee: "0.00" },
  { id: 11, name: "تمنراست", delivery_fee: "0.00" },
  { id: 12, name: "تبسة", delivery_fee: "0.00" },
  { id: 13, name: "تلمسان", delivery_fee: "0.00" },
  { id: 14, name: "تيارت", delivery_fee: "0.00" },
  { id: 15, name: "تيزي وزو", delivery_fee: "500.00" },
  { id: 16, name: "الجزائر", delivery_fee: "300.00" },
];

const Checkout = () => {
  const { items, total, clearCart } = useCart();
  const navigate = useNavigate();
  const { toast } = useToast();
  
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

  const selectedWilaya = mockWilayas.find(w => w.id === formData.wilayaId);
  const deliveryFee = parseFloat(selectedWilaya?.delivery_fee || '0');
  const finalTotal = total + deliveryFee;

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ar-DZ', {
      style: 'currency',
      currency: 'DZD',
      minimumFractionDigits: 0,
    }).format(price);
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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Clear cart after successful order
      clearCart();
      
      toast({
        title: "تم إرسال الطلب بنجاح!",
        description: "سيتم الاتصال بك قريباً لتأكيد الطلب",
      });
      
      navigate('/order-success');
    } catch (error) {
      toast({
        title: "خطأ في إرسال الطلب",
        description: "حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
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
                          placeholder="0123456789"
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
                      >
                        <SelectTrigger className={errors.wilayaId ? 'border-destructive' : ''}>
                          <SelectValue placeholder="اختر الولاية" />
                        </SelectTrigger>
                        <SelectContent>
                          {mockWilayas.map((wilaya) => (
                            <SelectItem key={wilaya.id} value={wilaya.id.toString()}>
                              {wilaya.name}
                              {parseFloat(wilaya.delivery_fee) > 0 && (
                                <span className="text-muted-foreground mr-2">
                                  ({formatPrice(parseFloat(wilaya.delivery_fee))})
                                </span>
                              )}
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
                {/* Cart Items */}
                <div className="space-y-3">
                  {items.map((item) => {
                    const hasDiscount = item.product.has_discount && new Date(item.product.has_discount) > new Date();
                    const discountPrice = parseFloat(item.product.discount_price || '0');
                    const originalPrice = parseFloat(item.product.price || '0');
                    const itemPrice = hasDiscount && discountPrice > 0 ? discountPrice : originalPrice;
                    
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
                  })}
                </div>

                <Separator />

                {/* Pricing */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>المجموع الفرعي:</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>رسوم التوصيل:</span>
                    <span>
                      {deliveryFee === 0 ? (
                        <span className="text-success">مجاني</span>
                      ) : (
                        formatPrice(deliveryFee)
                      )}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>المجموع الكلي:</span>
                    <span className="price-color">{formatPrice(finalTotal)}</span>
                  </div>
                </div>

                <Button 
                  onClick={handleSubmit}
                  className="w-full" 
                  size="lg"
                  disabled={isSubmitting || items.length === 0}
                >
                  {isSubmitting ? 'جاري إرسال الطلب...' : 'تأكيد الطلب'}
                </Button>

                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• سيتم الاتصال بك لتأكيد الطلب</p>
                  <p>• الدفع عند الاستلام</p>
                  <p>• إمكانية الإرجاع خلال 14 يوم</p>
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