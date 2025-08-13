import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ShoppingCart, Eye, Timer, Plus, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";

const ProductCard = ({ product }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [specialPricing, setSpecialPricing] = useState(null);
  const [loadingPricing, setLoadingPricing] = useState(false);

  const { addItem, getItemQuantity } = useCart();
  const { toast } = useToast();
  const itemQuantity = getItemQuantity(product.id);

  // Fix discount logic - use the has_discount field from backend
  const hasDiscount =
    product.has_discount === true || product.has_discount === 1;
  const originalPrice = parseFloat(product.price || "0");
  const discountPrice = parseFloat(product.discount_price || "0");
  const currentPrice =
    hasDiscount && discountPrice > 0 ? discountPrice : originalPrice;

  // Fetch special pricing for quantity 2+ when component mounts
  useEffect(() => {
    const fetchSpecialPricing = async () => {
      if (!product.profit || !product.discount_percentage) return;

      setLoadingPricing(true);
      try {
        const API_BASE_URL =
          process.env.REACT_APP_API_URL || "http://localhost:3000/api";

        const response = await fetch(`${API_BASE_URL}/calculate-pricing`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            items: [
              { product_id: product.id, quantity: 1 },
              { product_id: product.id, quantity: 2 },
            ],
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data.pricing_details.length === 2) {
            const singleItem = result.data.pricing_details[0];
            const multipleItems = result.data.pricing_details[1];

            if (multipleItems.special_pricing) {
              setSpecialPricing({
                singlePrice: singleItem.unit_price,
                multiplePrice: multipleItems.unit_price,
                savings: singleItem.unit_price - multipleItems.unit_price,
                savingsPercentage: Math.round(
                  ((singleItem.unit_price - multipleItems.unit_price) /
                    singleItem.unit_price) *
                    100
                ),
              });
            }
          }
        }
      } catch (error) {
        console.error("Error fetching special pricing:", error);
      } finally {
        setLoadingPricing(false);
      }
    };

    fetchSpecialPricing();
  }, [product.id, product.profit, product.discount_percentage]);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product); // This will now trigger the pricing fetch in CartContext
    toast({
      title: "تم إضافة المنتج",
      description: `تم إضافة ${product.name} إلى السلة`,
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("ar-DZ", {
      style: "currency",
      currency: "DZD",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getTimeRemaining = () => {
    if (!hasDiscount || !product.discount_end) return null;

    const now = new Date();
    const endDate = new Date(product.discount_end);
    const timeDiff = endDate.getTime() - now.getTime();

    if (timeDiff <= 0) return null;

    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );

    if (days > 0) return `${days} يوم متبقي`;
    return `${hours} ساعة متبقية`;
  };

  const timeRemaining = getTimeRemaining();

  return (
    <Card
      dir="rtl"
      className="group hover-lift animate-fade-in relative overflow-hidden h-full border-none p-0 flex flex-col"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Section - Fixed aspect ratio */}
      <Link to={`/product/${product.id}`} className="block flex-shrink-0">
        <div className="relative aspect-square overflow-hidden">
          <img
            src={product.main_image_url || "/placeholder.svg"}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />

          {/* Badges Container */}
          <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
            {/* Discount Badge */}
            {hasDiscount && (
              <Badge className="gradient-discount text-white text-xs">خصم</Badge>
            )}

            {/* Special Pricing Badge */}
            {specialPricing && (
              <Badge className="bg-green-500 text-white text-xs">
                <Tag className="h-3 w-3 ml-1" />
                عرض الكمية
              </Badge>
            )}
          </div>

          {/* Quick Actions */}
          <div
            className={`absolute inset-0 bg-black/20 flex items-center justify-center gap-2 transition-opacity duration-300 ${
              isHovered ? "opacity-100" : "opacity-0"
            }`}
          >
            <Button size="sm" variant="secondary" className="rounded-full">
              <Eye className="h-4 w-4" />
            </Button>
          </div>

          {/* Quantity Badge */}
          {itemQuantity > 0 && (
            <Badge variant="destructive" className="absolute top-2 left-2 text-xs z-10">
              {itemQuantity}
            </Badge>
          )}
        </div>
      </Link>

      {/* Content Section - Flexible grow */}
      <div className="flex flex-col flex-grow">
        <Link to={`/product/${product.id}`} className="block flex-grow">
          <CardContent className="p-3 sm:p-4 flex-grow">
            <div className="space-y-2">
              <h3 className="font-semibold text-sm sm:text-base lg:text-lg text-foreground group-hover:text-primary transition-colors line-clamp-2 min-h-[2.5rem] sm:min-h-[3rem]">
                {product.name}
              </h3>

              {/* Category and Subcategory */}
              <div className="flex flex-wrap gap-1">
                {product.category?.name && (
                  <Badge 
                    variant="outline" 
                    className="text-xs max-w-full truncate"
                    title={product.category.name}
                  >
                    {product.category.name.length > 15 
                      ? `${product.category.name.substring(0, 15)}...` 
                      : product.category.name
                    }
                  </Badge>
                )}
                {product.subcategory?.name && (
                  <Badge 
                    variant="outline" 
                    className="text-xs max-w-full truncate"
                    title={product.subcategory.name}
                  >
                    {product.subcategory.name.length > 15 
                      ? `${product.subcategory.name.substring(0, 15)}...` 
                      : product.subcategory.name
                    }
                  </Badge>
                )}
              </div>

              {/* Tags - Fixed to handle array of strings */}
              {product.tags &&
                Array.isArray(product.tags) &&
                product.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {product.tags.slice(0, 2).map((tag, index) => (
                      <Badge
                        key={`tag-${index}`}
                        variant="secondary"
                        className="text-xs"
                      >
                        {typeof tag === "string" ? tag : tag.name}
                      </Badge>
                    ))}
                    {product.tags.length > 2 && (
                      <Badge variant="secondary" className="text-xs">
                        +{product.tags.length - 2}
                      </Badge>
                    )}
                  </div>
                )}

              {/* Discount Timer */}
              {hasDiscount && timeRemaining && (
                <div className="flex items-center gap-1 text-xs text-discount">
                  <Timer className="h-3 w-3" />
                  <span>{timeRemaining}</span>
                </div>
              )}

              {/* Price Section */}
              <div className="space-y-2">
                {/* Regular Price */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base sm:text-lg font-bold price-color">
                        {formatPrice(currentPrice)}
                      </span>
                      {hasDiscount && originalPrice !== currentPrice && (
                        <span className="text-sm line-through original-price-color">
                          {formatPrice(originalPrice)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Special Pricing Offer */}
                {specialPricing && !loadingPricing && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-2 space-y-1">
                    <div className="text-xs font-medium text-green-800 flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      عرض خاص للكمية:
                    </div>
                    <div className="text-xs text-green-700">
                      اشتري 2+ بسعر {formatPrice(specialPricing.multiplePrice)}{" "}
                      للقطعة
                    </div>
                    <div className="text-xs text-green-600 font-medium">
                      وفر {formatPrice(specialPricing.savings)} (
                      {specialPricing.savingsPercentage}%) لكل قطعة إضافية
                    </div>
                  </div>
                )}

                {loadingPricing && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
                    <div className="text-xs text-gray-500 animate-pulse">
                      جاري تحميل عروض الكمية...
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Link>

        {/* Action Buttons - Fixed at bottom */}
        <div className="p-3 sm:p-4 pt-0 space-y-2 mt-auto">
          <Button 
            onClick={handleAddToCart} 
            className="w-full text-xs sm:text-sm" 
            size="sm"
          >
            <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="truncate">
              {itemQuantity > 0 ? `في السلة (${itemQuantity})` : "إضافة للسلة"}
            </span>
          </Button>

          {/* Additional Add Button for Special Pricing */}
          {itemQuantity > 0 && specialPricing && (
            <Button
              onClick={handleAddToCart}
              variant="outline"
              className="w-full border-green-500 text-green-600 hover:bg-green-50 text-xs sm:text-sm"
              size="sm"
            >
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="truncate">أضف المزيد واستفد من العرض</span>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default ProductCard;