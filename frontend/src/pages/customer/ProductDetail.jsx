import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowRight, ShoppingCart, Minus, Plus, Timer, Truck, Shield, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/customer/layout/Header';
import ProductCard from '@/components/customer/shop/ProductCard';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { useApi } from '@/contexts/RestContext';

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const { addItem, getItemQuantity } = useCart();
  const { toast } = useToast();
  const { api } = useApi();

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      
      setIsLoading(true);
      try {
        const [productData, response, responseCode, error] = await api.get(`/product/get/${id}`);
        
        if (responseCode === 200 && productData) {
          setProduct(productData);
          
          // Fetch recommended products based on category/subcategory
          if (productData.category?.id) {
            fetchRecommendedProducts(productData.category.id, productData.subcategory?.id, productData.id);
          }
        } else {
          console.error('Failed to fetch product:', error);
          toast({
            title: "خطأ",
            description: error || "فشل في تحميل المنتج",
            variant: "destructive",
          });
          setProduct(null);
        }
      } catch (err) {
        console.error('Error fetching product:', err);
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء تحميل المنتج",
          variant: "destructive",
        });
        setProduct(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [id, api, toast]);

  const fetchRecommendedProducts = async (categoryId, subcategoryId, currentProductId) => {
    try {
      // You might need to adjust this endpoint based on your API
      // This could be a general products endpoint with filters, or a specific recommended products endpoint
      const [productsData, response, responseCode, error] = await api.get(`/products?category=${categoryId}&limit=4`);
      
      if (responseCode === 200 && productsData) {
        // Filter out current product and limit to 4
        const filtered = productsData.filter(p => p.id !== currentProductId).slice(0, 4);
        setRecommendedProducts(filtered);
      }
    } catch (err) {
      console.error('Error fetching recommended products:', err);
      // Don't show error toast for recommended products, just log it
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-shop-bg">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">جاري تحميل المنتج...</p>
          </div>
        </div>
      </div>
    );
  }

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
          <Link to={`/shop?category=${product.category?.id}`} className="hover:text-primary">
            {product.category?.name}
          </Link>
          <span>/</span>
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="aspect-square bg-white rounded-lg overflow-hidden border">
              <img
                src={product.images?.[selectedImageIndex]?.url || product.main_image_url || '/placeholder.svg'}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Thumbnail Images */}
            {product.images && product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {product.images.map((image, index) => (
                  <button
                    key={image.id || index}
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
                {product.category?.name && (
                  <Badge variant="outline">{product.category.name}</Badge>
                )}
                {product.subcategory?.name && (
                  <Badge variant="outline">{product.subcategory.name}</Badge>
                )}
              </div>
              
              {/* Tags */}
              {product.tags && product.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {product.tags.map((tag, index) => (
                    <Badge key={tag.id || index} variant="secondary">
                      {typeof tag === 'string' ? tag : tag.name}
                    </Badge>
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
              <div
                  className="prose"
                  dangerouslySetInnerHTML={{
                    __html: product.description,
                  }}
                />
            </TabsContent>
            
            <TabsContent value="specifications" className="p-6">
              <h3 className="text-lg font-semibold mb-4">المواصفات التقنية</h3>
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b">
                  <span className="font-medium">الفئة:</span>
                  <span>{product.category?.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="font-medium">الفئة الفرعية:</span>
                  <span>{product.subcategory?.name}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="font-medium">وسوم:</span>
                  <span>{product.tags?.map(tag => typeof tag === 'string' ? tag : tag.name).join(', ')}</span>
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