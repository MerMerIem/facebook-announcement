import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Minus, Plus, CheckCircle } from "lucide-react";

export function OrderForm({ product, isOpen, onClose }) {
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });

  const { toast } = useToast();

  const updateQuantity = (delta) => {
    setQuantity(Math.max(1, quantity + delta));
  };

  const updateCustomerInfo = (field, value) => {
    setCustomerInfo((prev) => ({ ...prev, [field]: value }));
  };

  const calculateTotal = () => {
    return product ? (product.price * quantity).toFixed(2) : "0.00";
  };

  const handleSubmit = async () => {
    if (!product) return;

    if (
      !customerInfo.name ||
      !customerInfo.email ||
      !customerInfo.phone ||
      !customerInfo.address
    ) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    setIsSubmitting(false);
    setIsConfirmed(true);

    toast({
      title: "Order Confirmed!",
      description: `Your order for ${quantity} ${product.name}(s) has been confirmed.`,
    });
  };

  const handleClose = () => {
    setIsConfirmed(false);
    setQuantity(1);
    setCustomerInfo({
      name: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
    });
    onClose();
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-0 shadow-elegant" dir="rtl">
        <DialogHeader dir="rtl" className="text-right">
          <DialogTitle className="text-2xl bg-primary bg-clip-text text-transparent text-right" dir="rtl">
            {isConfirmed ? "تم تأكيد الطلب!" : "أكمِل طلبك"}
          </DialogTitle>
          <DialogDescription className="text-right" dir="rtl">
            {isConfirmed
              ? "شكرًا لشرائك. سنقوم بمعالجة طلبك قريبًا."
              : "املأ بياناتك لإكمال عملية الشراء."}
          </DialogDescription>
        </DialogHeader>

        {isConfirmed ? (
          <div className="text-center py-8" dir="rtl">
            <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">تم إرسال الطلب بنجاح!</h3>
            <p className="text-muted-foreground mb-4">
              طلب رقم: #{Math.random().toString(36).substr(2, 9).toUpperCase()}
            </p>
            <div className="bg-accent/50 rounded-lg p-4 mb-6">
              <p className="font-medium">{product.name}</p>
              <p className="text-sm text-muted-foreground">الكمية: {quantity}</p>
              <p className="text-lg font-bold text-primary">الإجمالي: {calculateTotal()} د.ج</p>
            </div>
            <Button onClick={handleClose} className="w-full" size="lg">
              مواصلة التسوق  
            </Button>
          </div>
        ) : (
          <div className="space-y-6" dir="rtl">
            {/* Product Summary */}
            <div className="bg-accent/10 rounded-lg p-4">
              <div className="flex items-center gap-4 flex-row-reverse">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <div className="flex-1 text-right">
                  <h3 className="font-semibold">{product.name}</h3>
                  <p className="text-sm text-muted-foreground">{product.price} د.ج لكل قطعة</p>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Quantity Selector */}
              <div className="flex items-center justify-between">
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

              <Separator className="my-4" />

              <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-primary">{calculateTotal()} د.ج</span>
                <span className="font-medium">الإجمالي:</span>
              </div>
            </div>

            {/* Customer Info */}
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

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address" className="text-right block">عنوان الشحن *</Label>
                <Textarea
                  id="address"
                  value={customerInfo.address}
                  onChange={(e) => updateCustomerInfo("address", e.target.value)}
                  placeholder="أدخل عنوان الشحن الكامل الخاص بك"
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

            {/* Submit */}
            <Button
              type="button"
              variant="default"
              size="lg"
              className="w-full"
              disabled={isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting
                ? "جاري معالجة الطلب..."
                : `تأكيد الطلب - ${calculateTotal()} د.ج`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}