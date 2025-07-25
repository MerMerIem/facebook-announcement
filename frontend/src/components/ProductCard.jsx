import { Card, CardContent } from "frontend/src/components/ui/card";
import { Button } from "frontend/src/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function ProductCard({ product }) {
  const navigate = useNavigate();

  const handleBuyNow = () => {
    navigate(`/product/${product.id}`);
  };

  return (
    <Card className="group overflow-hidden bg-gradient-card border-0 shadow-card hover:shadow-elegant transition-all duration-500 hover:-translate-y-2">
      <div className="aspect-square overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
      </div>
      <CardContent className="p-6">
        <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors duration-300">
          {product.name}
        </h3>
        <p className="text-muted-foreground mb-4 line-clamp-2">
          {product.description}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold bg-primary bg-clip-text text-transparent">
            د.ج {product.price}
          </span>
          <Button
            variant="buynow"
            size="lg"
            onClick={handleBuyNow}
            className={
              "bg-gradient-to-br from-primary to-primary/60 text-white"
            }
          >
            <ShoppingCart className="w-4 h-4 transition-transform duration-300 group-hover/btn:scale-110" />
            اشتري الان
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
