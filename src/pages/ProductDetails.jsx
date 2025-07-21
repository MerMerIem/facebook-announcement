import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, ShoppingCart, Minus, Plus, CheckCircle, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { products } from "./Index";

// Wilaya delivery prices (in DA)
const wilayaDeliveryPrices = {
  "الجزائر": 500,
  "وهران": 1000,
  "قسنطينة": 1000,
  "عنابة": 1200,
  "سطيف": 800,
  "سيدي بلعباس": 1000,
  "بسكرة": 1200,
  "تلمسان": 1200,
  "بجاية": 800,
  "تيزي وزو": 700,
  "ورقلة": 1500,
  "باتنة": 1000,
  "جيجل": 1000,
  "تبسة": 1300,
  "بشار": 1800,
  "تيارت": 1000,
  "البليدة": 500,
  "بومرداس": 600,
  "الطارف": 1200,
  "تندوف": 2000,
  "الجلفة": 1200,
  "مستغانم": 1000,
  "المعسكر": 1000,
  "المسيلة": 1000,
  "المدية": 700,
  "غرداية": 1300,
  "قالمة": 1100,
  "الخنشلة": 1200,
  "سوق أهراس": 1200,
  "الأغواط": 1200,
  "أم البواقي": 900,
  "منتوب": 1500,
  "الوادي": 1400,
  "الدراع": 2000,
  "تيميمون": 1800,
  "برج بو عريريج": 900,
  "برج باجي مختار": 2000,
  "عين تيموشنت": 1000,
  "غليزان": 1000,
  "تيسمسيلت": 1100,
  "الشلف": 800,
  "سعيدة": 1200,
  "النعامة": 1600,
  "عين الدفلى": 800,
  "تيبازة": 600,
  "ميلة": 1000,
  "عين البيضاء": 1300,
  "توقرت": 1400,
  "بني عباس": 1800,
  "إن صالح": 1800,
  "إن قزام": 1900,
  "دجانت": 1900
};

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [selectedWilaya, setSelectedWilaya] = useState("");
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    email: "",
    phone: "",
    wilaya: "",
    address: "",
    notes: "",
  });

  const product = products.find((p) => p.id === parseInt(id || ""));

  const updateQuantity = (delta) => {
    setQuantity(Math.max(1, quantity + delta));
  };

  const updateCustomerInfo = (field, value) => {
    setCustomerInfo((prev) => ({ ...prev, [field]: value }));
    if (field === "wilaya") {
      setSelectedWilaya(value);
    }
  };

  const getDeliveryPrice = () => {
    return selectedWilaya ? wilayaDeliveryPrices[selectedWilaya] || 1000 : 0;
  };

  const calculateSubtotal = () => {
    return product ? (product.price * quantity) : 0;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const delivery = getDeliveryPrice();
    return (subtotal + delivery).toFixed(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!product) return;

    if (
      !customerInfo.name ||
      !customerInfo.email ||
      !customerInfo.phone ||
      !customerInfo.wilaya ||
      !customerInfo.address
    ) {
      toast({
        title: "معلومات مفقودة",
        description: "يرجى ملء جميع الحقول المطلوبة بما في ذلك الولاية.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Generate order number
    const generatedOrderNumber = Math.random().toString(36).substr(2, 9).toUpperCase();
    setOrderNumber(generatedOrderNumber);

    // Create order object
    const order = {
      id: Date.now().toString(),
      orderNumber: generatedOrderNumber,
      productId: product.id,
      productName: product.name,
      productPrice: product.price,
      quantity,
      subtotal: calculateSubtotal(),
      wilaya: customerInfo.wilaya,
      deliveryPrice: getDeliveryPrice(),
      total: parseFloat(calculateTotal()),
      customerName: customerInfo.name,
      email: customerInfo.email,
      phone: customerInfo.phone,
      address: customerInfo.address,
      notes: customerInfo.notes,
      timestamp: new Date().toISOString(),
      status: "pending"
    };

    // Save order to localStorage
    try {
      const existingOrders = JSON.parse(localStorage.getItem('orders') || '[]');
      const updatedOrders = [...existingOrders, order];
      localStorage.setItem('orders', JSON.stringify(updatedOrders));
    } catch (error) {
      console.log('localStorage not available, order saved in memory only');
    }

    setIsSubmitting(false);
    setIsConfirmed(true);

    toast({
      title: "تم تأكيد الطلب!",
      description: `تم تأكيد طلبك لـ ${quantity} ${product.name}.`,
    });
  };

  const handleReset = () => {
    setIsConfirmed(false);
    setQuantity(1);
    setOrderNumber("");
    setSelectedWilaya("");
    setCustomerInfo({
      name: "",
      email: "",
      phone: "",
      wilaya: "",
      address: "",
      notes: "",
    });
  };

  if (!product) {
    return (
      <div dir="rtl" className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">المنتج غير موجود</h1>
          <Button onClick={() => navigate("/")} variant="outline">
            <ArrowRight className="w-4 h-4 mr-2" />
            العودة إلى المنتجات 
          </Button>
        </div>
      </div>
    );
  }

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-subtle">
      <header className="bg-gradient-card shadow-card border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/")} className="mb-4">
            <ArrowRight className="w-4 h-4 mr-2" />
            العودة إلى المنتجات
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold bg-primary bg-clip-text text-transparent">
            تفاصيل المنتج
          </h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="aspect-square overflow-hidden rounded-lg bg-gradient-card shadow-card">
              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-square overflow-hidden rounded-lg bg-gradient-card shadow-card"
                >
                  <img
                    src={product.image}
                    alt={`${product.name} ${i + 1}`}
                    className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Product Info & Order Form */}
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-4">{product.name}</h2>
              <div className="flex items-center gap-4 mb-4">
                <span className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  {product.price} د.ج
                </span>
                {product.originalPrice && (
                  <>
                    <span className="text-xl text-muted-foreground line-through">
                      {product.originalPrice} د.ج
                    </span>
                    <Badge variant="destructive" className="text-sm">
                      -{discount}%
                    </Badge>
                  </>
                )}
              </div>
              <p className="text-muted-foreground mb-6">{product.description}</p>
            </div>

            {/* Product Features */}
            <Card className="bg-gradient-card shadow-card border-0">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-foreground mb-4">ميزات المنتج</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• مواد عالية الجودة</li>
                  <li>• بنية متينة</li>
                  <li>• سهل الاستخدام</li>
                  <li>• يأتي مع ضمان</li>
                </ul>
              </CardContent>
            </Card>

            {/* Order Form */}
            <Card className="bg-gradient-card shadow-card border-0">
              <CardContent className="p-6">
                {isConfirmed ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">تم إرسال الطلب بنجاح!</h3>
                    <p className="text-muted-foreground mb-4">
                      طلب رقم: #{orderNumber}
                    </p>
                    <div className="bg-accent/50 rounded-lg p-4 mb-6">
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">الكمية: {quantity}</p>
                      <p className="text-sm text-muted-foreground">الولاية: {customerInfo.wilaya}</p>
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{(calculateSubtotal()).toFixed(2)} د.ج</span>
                          <span>المجموع الفرعي:</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>{getDeliveryPrice()} د.ج</span>
                          <span>رسوم التوصيل:</span>
                        </div>
                        <Separator className="my-2" />
                        <div className="flex justify-between font-bold text-primary">
                          <span>{calculateTotal()} د.ج</span>
                          <span>الإجمالي:</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Button onClick={handleReset} className="w-full" size="lg" variant="outline">
                        طلب جديد
                      </Button>
                      <Button onClick={() => navigate("/")} className="w-full" size="lg">
                        مواصلة التسوق  
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-foreground mb-4">أكمِل طلبك</h3>
                    
                    {/* Product Summary */}
                    <div className="bg-accent/10 rounded-lg p-4">
                      <div className="flex items-center gap-4 flex-row-reverse">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                        <div className="flex-1 text-right">
                          <h4 className="font-semibold">{product.name}</h4>
                          <p className="text-sm text-muted-foreground">{product.price} د.ج لكل قطعة</p>
                        </div>
                      </div>

                      <Separator className="my-4" />

                      {/* Quantity Selector */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => updateQuantity(1)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                          <span className="w-12 text-center font-medium">{quantity}</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => updateQuantity(-1)}
                            disabled={quantity <= 1}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                        </div>
                        <Label className="text-sm font-medium">الكمية:</Label>
                      </div>

                      {/* Wilaya Selector */}
                      <div className="mb-4">
                        <Label className="text-sm font-medium mb-2 block text-right">اختر الولاية لحساب رسوم التوصيل:</Label>
                        <Select value={selectedWilaya} onValueChange={setSelectedWilaya} dir="rtl">
                          <SelectTrigger className="w-full text-right">
                            <SelectValue placeholder="اختر الولاية" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(wilayaDeliveryPrices).map(([wilaya, price]) => (
                              <SelectItem key={wilaya} value={wilaya} className="text-right">
                                <div className="flex justify-between items-center w-full">
                                  <span className="text-sm text-muted-foreground">{price} د.ج</span>
                                  <span>{wilaya}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Delivery Info */}
                      {selectedWilaya && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                          <div className="flex items-center gap-2 text-blue-700 mb-1">
                            <Truck className="w-4 h-4" />
                            <span className="text-sm font-medium">معلومات التوصيل</span>
                          </div>
                          <p className="text-sm text-blue-600">
                            رسوم التوصيل إلى {selectedWilaya}: {getDeliveryPrice()} د.ج
                          </p>
                        </div>
                      )}

                      <Separator className="my-4" />

                      {/* Price Breakdown */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span>{(calculateSubtotal()).toFixed(2)} د.ج</span>
                          <span>المجموع الفرعي ({quantity} قطعة):</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span>{getDeliveryPrice()} د.ج</span>
                          <span>رسوم التوصيل:</span>
                        </div>
                        <Separator className="my-2" />
                        <div className="flex justify-between items-center">
                          <span className="text-xl font-bold text-primary">{calculateTotal()} د.ج</span>
                          <span className="font-medium">الإجمالي:</span>
                        </div>
                      </div>
                    </div>

                    {/* Customer Info Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name" className="text-right block">الاسم الكامل *</Label>
                          <Input
                            id="name"
                            value={customerInfo.name}
                            onChange={(e) => updateCustomerInfo("name", e.target.value)}
                            placeholder="أدخل اسمك الكامل"
                            className="text-right"
                            dir="rtl"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-right block">عنوان البريد الإلكتروني *</Label>
                          <Input
                            id="email"
                            type="email"
                            value={customerInfo.email}
                            onChange={(e) => updateCustomerInfo("email", e.target.value)}
                            placeholder="أدخل بريدك الإلكتروني"
                            className="text-right"
                            dir="rtl"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="phone" className="text-right block">رقم الهاتف *</Label>
                          <Input
                            id="phone"
                            value={customerInfo.phone}
                            onChange={(e) => updateCustomerInfo("phone", e.target.value)}
                            placeholder="أدخل رقم هاتفك"
                            className="text-right"
                            dir="rtl"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="wilaya" className="text-right block">الولاية *</Label>
                          <Select 
                            value={customerInfo.wilaya} 
                            onValueChange={(value) => updateCustomerInfo("wilaya", value)}
                            dir="rtl"
                            required
                          >
                            <SelectTrigger className="w-full text-right">
                              <SelectValue placeholder="اختر الولاية" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(wilayaDeliveryPrices).map(([wilaya, price]) => (
                                <SelectItem key={wilaya} value={wilaya} className="text-right">
                                  <div className="flex justify-between items-center w-full">
                                    <span className="text-sm text-muted-foreground">{price} د.ج</span>
                                    <span>{wilaya}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="address" className="text-right block">عنوان الشحن التفصيلي *</Label>
                          <Textarea
                            id="address"
                            value={customerInfo.address}
                            onChange={(e) => updateCustomerInfo("address", e.target.value)}
                            placeholder="أدخل عنوان الشحن الكامل الخاص بك (البلدية، الحي، رقم المنزل...)"
                            className="text-right"
                            dir="rtl"
                            required
                          />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="notes" className="text-right block">ملاحظات إضافية (اختياري)</Label>
                          <Textarea
                            id="notes"
                            value={customerInfo.notes}
                            onChange={(e) => updateCustomerInfo("notes", e.target.value)}
                            placeholder="أي تعليمات أو ملاحظات خاصة"
                            className="text-right"
                            dir="rtl"
                          />
                        </div>
                      </div>

                      {/* Submit Button */}
                      <Button
                        type="submit"
                        variant="default"
                        size="lg"
                        className="w-full"
                        disabled={isSubmitting || !selectedWilaya}
                      >
                        <ShoppingCart className="w-5 h-5 mr-2" />
                        {isSubmitting
                          ? "جاري معالجة الطلب..."
                          : `تأكيد الطلب - ${calculateTotal()} د.ج`}
                      </Button>

                      {!selectedWilaya && (
                        <p className="text-sm text-muted-foreground text-center">
                          يرجى اختيار الولاية لحساب رسوم التوصيل
                        </p>
                      )}
                    </form>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;