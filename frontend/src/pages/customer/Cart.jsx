import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import Header from '@/components/customer/layout/Header';
import { useCart } from '@/contexts/CartContext';

const Cart = () => {
  const { items, total, updateQuantity, removeItem, clearCart } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ar-DZ', {
      style: 'currency',
      currency: 'DZD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleQuantityChange = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeItem(productId);
    } else {
      updateQuantity(productId, newQuantity);
    }
  };

  const getItemPrice = (item) => {
    const hasDiscount = item.product.has_discount && new Date(item.product.has_discount) > new Date();
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
    <div className="min-h-screen bg-shop-bg">
      <Header />
      
      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary">الرئيسية</Link>
          <span>/</span>
          <span className="text-foreground">السلة</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">سلة التسوق ({items.length} منتج)</h1>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearCart}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 ml-2" />
                مسح الكل
              </Button>
            </div>

            <div className="space-y-4">
              {items.map((item) => {
                const itemPrice = getItemPrice(item);
                const itemTotal = itemPrice * item.quantity;
                const hasDiscount = item.product.has_discount && new Date(item.product.has_discount) > new Date();
                const originalPrice = parseFloat(item.product.price || '0');

                return (
                  <Card key={item.product.id} className="overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={item.product.main_image_url || '/placeholder.svg'}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="flex-1 space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <Link 
                                to={`/product/${item.product.id}`}
                                className="text-lg font-semibold hover:text-primary transition-colors"
                              >
                                {item.product.name}
                              </Link>
                              <p className="text-sm text-muted-foreground">
                                {item.product.category.name} - {item.product.subcategory.name}
                              </p>
                            </div>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(item.product.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-bold price-color">
                                  {formatPrice(itemPrice)}
                                </span>
                                {hasDiscount && originalPrice !== itemPrice && (
                                  <span className="text-sm line-through original-price-color">
                                    {formatPrice(originalPrice)}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                المجموع: {formatPrice(itemTotal)}
                              </div>
                            </div>

                            <div className="flex items-center border rounded-lg">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleQuantityChange(item.product.id, item.quantity - 1)}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="px-4 py-2 min-w-[60px] text-center">
                                {item.quantity}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleQuantityChange(item.product.id, item.quantity + 1)}
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
          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle>ملخص الطلب</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>المجموع الفرعي:</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>الشحن:</span>
                    <span className="text-success">مجاني</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>المجموع الكلي:</span>
                    <span className="price-color">{formatPrice(total)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Link to="/checkout" className="block">
                    <Button 
                      className="w-full" 
                      size="lg"
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'جاري المعالجة...' : 'إتمام الطلب'}
                    </Button>
                  </Link>
                  
                  <Link to="/shop" className="block">
                    <Button variant="outline" className="w-full">
                      متابعة التسوق
                    </Button>
                  </Link>
                </div>

                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• توصيل مجاني لجميع أنحاء الجزائر</p>
                  <p>• إمكانية الإرجاع خلال 14 يوم</p>
                  <p>• دفع آمن ومضمون</p>
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