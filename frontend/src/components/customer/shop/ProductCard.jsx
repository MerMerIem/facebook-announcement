import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Eye, Heart, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';

const ProductCard = ({ product }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { addItem, getItemQuantity } = useCart();
  const { toast } = useToast();
  const itemQuantity = getItemQuantity(product.id);

  const hasDiscount = product.has_discount && new Date(product.has_discount) > new Date();
  const originalPrice = parseFloat(product.price || '0');
  const discountPrice = parseFloat(product.discount_price || '0');
  const currentPrice = hasDiscount && discountPrice > 0 ? discountPrice : originalPrice;

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product);
    toast({
      title: "تم إضافة المنتج",
      description: `تم إضافة ${product.name} إلى السلة`,
    });
  };

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

  const timeRemaining = getTimeRemaining();

  return (
    <Card 
      className="group hover-lift animate-fade-in relative overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link to={`/product/${product.id}`}>
        <div className="relative aspect-square overflow-hidden">
          <img
            src={product.main_image_url || '/placeholder.svg'}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          
          {/* Discount Badge */}
          {hasDiscount && (
            <Badge 
              className="absolute top-2 right-2 gradient-discount text-white"
            >
              خصم
            </Badge>
          )}

          {/* Quick Actions */}
          <div className={`absolute inset-0 bg-black/20 flex items-center justify-center gap-2 transition-opacity duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}>
            <Button size="sm" variant="secondary" className="rounded-full">
              <Eye className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="secondary" className="rounded-full">
              <Heart className="h-4 w-4" />
            </Button>
          </div>

          {/* Quantity Badge */}
          {itemQuantity > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute top-2 left-2"
            >
              {itemQuantity}
            </Badge>
          )}
        </div>

        <CardContent className="p-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-2">
              {product.name}
            </h3>
            
            <p className="text-sm text-muted-foreground line-clamp-2">
              {product.description}
            </p>

            {/* Category and Subcategory */}
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline" className="text-xs">
                {product.category.name}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {product.subcategory.name}
              </Badge>
            </div>

            {/* Tags */}
            {product.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {product.tags.slice(0, 2).map((tag) => (
                  <Badge key={tag.id} variant="secondary" className="text-xs">
                    {tag.name}
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

            {/* Price */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold price-color">
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
          </div>
        </CardContent>
      </Link>

      {/* Add to Cart Button */}
      <div className="p-4 pt-0">
        <Button 
          onClick={handleAddToCart}
          className="w-full"
          size="sm"
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          إضافة للسلة
        </Button>
      </div>
    </Card>
  );
};

export default ProductCard;