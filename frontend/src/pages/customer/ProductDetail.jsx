import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowRight,
  ShoppingCart,
  Minus,
  Plus,
  Timer,
  Truck,
  Shield,
  CheckCircle,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/customer/layout/Header";
import ProductCard from "@/components/customer/shop/ProductCard";
import { useCart } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";
import { useApi } from "@/contexts/RestContext";

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const { addItem, getItemQuantity } = useCart();
  const [added, setAdded] = useState(false);

  const { api } = useApi();

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;

      setIsLoading(true);
      try {
        const [productData, response, responseCode, error] = await api.get(
          `/product/get/${id}`
        );

        if (responseCode === 200 && productData) {
          setProduct(productData);
          console.log("Product data received:", productData); // Debug log
        } else {
          console.error("Failed to fetch product:", error);
          toast({
            title: "خطأ",
            description: error || "فشل في تحميل المنتج",
            variant: "destructive",
          });
          setProduct(null);
        }
      } catch (err) {
        console.error("Error fetching product:", err);
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

  const hasDiscount =
    product.has_discount && new Date(product.has_discount) > new Date();
  const originalPrice = parseFloat(product.price || "0");
  const discountPrice = parseFloat(product.discount_price || "0");
  const currentPrice =
    hasDiscount && discountPrice > 0 ? discountPrice : originalPrice;
  const cartQuantity = getItemQuantity(product.id);

  const formatPrice = (price) => {
    return new Intl.NumberFormat("ar-DZ", {
      style: "currency",
      currency: "DZD",
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
    const hours = Math.floor(
      (timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );

    if (days > 0) return `${days} يوم متبقي`;
    return `${hours} ساعة متبقية`;
  };

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addItem(product);
    }

    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const timeRemaining = getTimeRemaining();

  // Get related products from the API response
  const relatedProducts = product.related_products || [];
  console.log("Related products:", relatedProducts); // Debug log

  return (
    <div dir="rtl" className="min-h-screen bg-shop-bg text-right">
      <Header />

      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary">
            الرئيسية
          </Link>
          <span>/</span>
          <Link to="/shop" className="hover:text-primary">
            المتجر
          </Link>
          <span>/</span>
          <Link
            to={`/shop?category=${product.category?.id}`}
            className="hover:text-primary"
          >
            {product.category?.name}
          </Link>
          <span>/</span>
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-8 mb-12">
          {/* Product Info - Left side */}
          <div className="flex-1 space-y-6">
            {/* Title and Badges */}
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {product.name}
              </h1>
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
                    <Badge key={index} variant="secondary">
                      {typeof tag === "string" ? tag : tag.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="max-w-2xl">
              <div
                className="prose max-w-none text-muted-foreground"
                dangerouslySetInnerHTML={{
                  __html: product.description,
                }}
              />
            </div>

            {/* Quantity and Add to Cart */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
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
                  <span className="px-4 py-2 min-w-[60px] text-center">
                    {quantity}
                  </span>
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

              <div className="relative flex items-center gap-2">
                <Button onClick={handleAddToCart} size="lg">
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  إضافة للسلة
                </Button>

                {added && (
                  <CheckCircle className="text-green-700 h-6 w-6 animate-pulse " />
                )}
              </div>
            </div>
          </div>

          {/* Product Images and Price - Right side */}
          <div className="lg:w-96 space-y-4">
            <div className="aspect-square bg-white rounded-lg overflow-hidden border">
              <img
                src={
                  product.images?.[selectedImageIndex]?.url ||
                  product.main_image_url ||
                  "/placeholder.svg"
                }
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
                      selectedImageIndex === index
                        ? "border-primary"
                        : "border-border"
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

            {/* Price */}
            <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
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
                    خصم{" "}
                    {Math.round(
                      ((originalPrice - currentPrice) / originalPrice) * 100
                    )}
                    %
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
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-primary">منتجات مشابهة</h2>
              <Link to="/shop">
                <Button variant="outline">
                  عرض المزيد
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;
