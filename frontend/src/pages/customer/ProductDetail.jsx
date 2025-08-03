import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowRight, ShoppingCart, Heart, Share2, Minus, Plus, Timer, Truck, Shield, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/customer/layout/Header';
import ProductCard from '@/components/customer/shop/ProductCard';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';

// Mock data
const mockProducts = [
  {
    id: 1,
    name: "منشار كهربائي",
    description: "منشار كهربائي قوي بقدرة عالية مناسب لجميع أعمال النشر والقطع. يتميز بمحرك قوي وتصميم مريح للاستخدام لفترات طويلة. مزود بشفرة عالية الجودة تضمن قطعاً دقيقاً وسريعاً. مثالي للاستخدام في ورش النجارة والمشاريع المنزلية.",
    price: "25000.00",
    discount_price: "10000.00",
    discount_start: "2025-08-01T00:00:00.000Z",
    discount_end: "2025-08-15T00:00:00.000Z",
    category: { id: 2, name: "الأدوات الكهربائية" },
    subcategory: { id: 1, name: "مناشير كهربائية" },
    images: [
      { id: 1, url: "/placeholder.svg", is_main: 1 },
      { id: 2, url: "/placeholder.svg", is_main: 0 },
      { id: 3, url: "/placeholder.svg", is_main: 0 }
    ],
    tags: [
      { id: 1, name: "أدوات احترافية" },
      { id: 2, name: "ضمان سنتين" }
    ],
    main_image_url: "/placeholder.svg",
    has_discount: "2025-08-15T00:00:00.000Z",
    total_images: 3,
    total_tags: 2
  },
  {
    id: 14,
    name: "مثقاب لاسلكي 18 فولت 10",
    description: "مثقاب قوي وفعال ببطارية ليثيوم أيون 18 فولت، مثالي للمشاريع المنزلية.",
    price: "15000.00",
    discount_price: "0.00",
    discount_start: null,
    discount_end: null,
    category: { id: 2, name: "الأدوات الكهربائية" },
    subcategory: { id: 2, name: "مثاقب كهربائية" },
    images: [{ id: 12, url: "https://res.cloudinary.com/dj8va2cd0/image/upload/v1753784102/oyavzv8povmoad7uxvem.png", is_main: 1 }],
    tags: [{ id: 1, name: "مستلزمات السباكة" }],
    main_image_url: "https://res.cloudinary.com/dj8va2cd0/image/upload/v1753784102/oyavzv8povmoad7uxvem.png",
    has_discount: null,
    total_images: 1,
    total_tags: 1
  },
  {
    id: 15,
    name: "مثقاب لاسلكي 18 فولت 12",
    description: "مثقاب قوي وفعال ببطارية ليثيوم أيون 18 فولت، مثالي للمشاريع المنزلية.",
    price: "18000.00",
    discount_price: "0.00",
    discount_start: null,
    discount_end: null,
    category: { id: 2, name: "الأدوات الكهربائية" },
    subcategory: { id: 2, name: "مثاقب كهربائية" },
    images: [{ id: 13, url: "https://res.cloudinary.com/dj8va2cd0/image/upload/v1753784693/ikcpff4ttbrpmhswsgnu.png", is_main: 1 }],
    tags: [{ id: 1, name: "مستلزمات السباكة" }],
    main_image_url: "https://res.cloudinary.com/dj8va2cd0/image/upload/v1753784693/ikcpff4ttbrpmhswsgnu.png",
    has_discount: null,
    total_images: 1,
    total_tags: 1
  }
];

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const { addItem, getItemQuantity } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    // Find product by ID
    const foundProduct = mockProducts.find(p => p.id === parseInt(id || '0'));
    setProduct(foundProduct || null);
  }, [id]);

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

  const hasDiscount = product.has_discount && new Date(product.has_discount) > new Date();
  const originalPrice = parseFloat(product.price || '0');
  const discountPrice = parseFloat(product.discount_price || '0');
  const currentPrice = hasDiscount && discountPrice > 0 ? discountPrice : originalPrice;
  const cartQuantity = getItemQuantity(product.id);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ar-DZ', {
      style: 'currency',
      currency: 'DZD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getTimeRemaining = () => {
    if (!product.has_discount) return null;
    
    const now = new Date();
    const endDate = new Date(product.has_discount);
    const timeDiff = endDate.getTime() - now.getTime();
    
    if (timeDiff <= 0) return null;
    
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days} يوم متبقي`;
    return `${hours} ساعة متبقية`;
  };

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addItem(product);
    }
    toast({
      title: "تم إضافة المنتج",
      description: `تم إضافة ${quantity} من ${product.name} إلى السلة`,
    });
  };

  const timeRemaining = getTimeRemaining();
  const recommendedProducts = mockProducts.filter(p => 
    p.id !== product.id && 
    (p.category.id === product.category.id || p.subcategory.id === product.subcategory.id)
  ).slice(0, 4);

  return (
    <div className="min-h-screen bg-shop-bg">
      <Header />
      
      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary">الرئيسية</Link>
          <span>/</span>
          <Link to="/shop" className="hover:text-primary">المتجر</Link>
          <span>/</span>
          <Link to={`/shop?category=${product.category.id}`} className="hover:text-primary">
            {product.category.name}
          </Link>
          <span>/</span>
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="aspect-square bg-white rounded-lg overflow-hidden border">
              <img
                src={product.images[selectedImageIndex]?.url || product.main_image_url || '/placeholder.svg'}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Thumbnail Images */}
            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {product.images.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 border-2 rounded-lg overflow-hidden ${
                      selectedImageIndex === index ? 'border-primary' : 'border-border'
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

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">{product.name}</h1>
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="outline">{product.category.name}</Badge>
                <Badge variant="outline">{product.subcategory.name}</Badge>
              </div>
              
              {/* Tags */}
              {product.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {product.tags.map((tag) => (
                    <Badge key={tag.id} variant="secondary">{tag.name}</Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Price */}
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <span className="text-3xl font-bold price-color">
                  {formatPrice(currentPrice)}
                </span>
                {hasDiscount && originalPrice !== currentPrice && (
                  <span className="text-xl line-through original-price-color">
                    {formatPrice(originalPrice)}
                  </span>
                )}
                {hasDiscount && (
                  <Badge className="gradient-discount text-white">
                    خصم {Math.round(((originalPrice - currentPrice) / originalPrice) * 100)}%
                  </Badge>
                )}
              </div>
              
              {/* Discount Timer */}
              {hasDiscount && timeRemaining && (
                <div className="flex items-center gap-2 text-discount font-medium">
                  <Timer className="h-4 w-4" />
                  <span>ينتهي العرض خلال: {timeRemaining}</span>
                </div>
              )}
            </div>

            {/* Quantity and Add to Cart */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="font-medium">الكمية:</span>
                <div className="flex items-center border rounded-lg">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="px-4 py-2 min-w-[60px] text-center">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {cartQuantity > 0 && (
                  <span className="text-sm text-muted-foreground">
                    ({cartQuantity} في السلة)
                  </span>
                )}
              </div>

              <div className="flex gap-3">
                <Button onClick={handleAddToCart} className="flex-1" size="lg">
                  <ShoppingCart className="h-5 w-5 ml-2" />
                  إضافة للسلة
                </Button>
                <Button variant="outline" size="lg">
                  <Heart className="h-5 w-5" />
                </Button>
                <Button variant="outline" size="lg">
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Product Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Truck className="h-4 w-4 text-primary" />
                <span>توصيل مجاني</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-primary" />
                <span>ضمان أصلي</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <RotateCcw className="h-4 w-4 text-primary" />
                <span>إرجاع مجاني</span>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Tabs */}
        <Card className="mb-12">
          <Tabs defaultValue="description" className="w-full">
            <TabsList className="grid grid-cols-1 sm:grid-cols-3 w-full">
              <TabsTrigger value="description">الوصف</TabsTrigger>
              <TabsTrigger value="specifications">المواصفات</TabsTrigger>
              <TabsTrigger value="shipping">الشحن والإرجاع</TabsTrigger>
            </TabsList>
            
            <TabsContent value="description" className="p-6">
              <h3 className="text-lg font-semibold mb-4">وصف المنتج</h3>
              <p className="text-muted-foreground leading-relaxed">
                {product.description}
              </p>
            </TabsContent>
            
            <TabsContent value="specifications" className="p-6">
              <h3 className="text-lg font-semibold mb-4">المواصفات التقنية</h3>
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b">
                  <span className="font-medium">الفئة:</span>
                  <span>{product.category.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="font-medium">الفئة الفرعية:</span>
                  <span>{product.subcategory.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="font-medium">رقم المنتج:</span>
                  <span>#{product.id}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="font-medium">عدد الصور:</span>
                  <span>{product.total_images}</span>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="shipping" className="p-6">
              <h3 className="text-lg font-semibold mb-4">الشحن والإرجاع</h3>
              <div className="space-y-4 text-muted-foreground">
                <div>
                  <h4 className="font-medium text-foreground">الشحن:</h4>
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    <li>توصيل لجميع أنحاء الجزائر</li>
                    <li>شحن مجاني للطلبات أكثر من 10,000 دج</li>
                    <li>التوصيل خلال 2-5 أيام عمل</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-foreground">الإرجاع:</h4>
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    <li>إمكانية الإرجاع خلال 14 يوم</li>
                    <li>المنتج يجب أن يكون في حالته الأصلية</li>
                    <li>استرداد كامل للمبلغ المدفوع</li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Recommended Products */}
        {recommendedProducts.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-primary">منتجات مشابهة</h2>
              <Link to="/shop">
                <Button variant="outline">
                  عرض المزيد
                  <ArrowRight className="h-4 w-4 mr-2" />
                </Button>
              </Link>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recommendedProducts.map((recommendedProduct) => (
                <ProductCard key={recommendedProduct.id} product={recommendedProduct} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;