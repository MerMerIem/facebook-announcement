import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ShoppingCart } from "lucide-react";
import { OrderForm } from "@/components/OrderForm";
import { products } from "./Index";

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);

  const product = products.find((p) => p.id === parseInt(id || ""));

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

          {/* Product Info */}
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

            {/* Order Button */}
            <Card className="bg-gradient-card shadow-card border-0">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-foreground mb-4">
                هل أنت مستعد للطلب؟ 
                </h3>
                <p className="text-muted-foreground mb-4">
                انقر على الزر أدناه لإتمام طلبك من خلال عملية الدفع السهلة الخاصة بنا.
                </p>
                <Button 
                  onClick={() => setIsOrderFormOpen(true)}
                  className="w-full" 
                  variant="default" 
                  size="lg"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  اطلب الآن
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Order Form Dialog */}
      <OrderForm 
        product={product}
        isOpen={isOrderFormOpen}
        onClose={() => setIsOrderFormOpen(false)}
      />
    </div>
  );
};

export default ProductDetails;