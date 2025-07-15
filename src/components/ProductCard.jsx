import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";

// product: { id, name, price, image, description } 
// onBuyNow: function(product)

export function ProductCard({ product, onBuyNow }) {
  return (
    <Card className={"group cursor-pointer pt-0 overflow-hidden bg-gradient-card border-0 shadow-card hover:shadow-elegant transition-all duration-500 hover:-translate-y-2 bg-white"}>
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
        <p className="text-muted-foreground mb-4 line-clamp-5">
          {product.description}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-primary">
            د.ج {product.price}
          </span>
          <Button 
            variant="default" 
            size="lg"
            onClick={() => onBuyNow(product)}
            className={"bg-gradient-to-br from-primary to-primary/60"}
          >
            <ShoppingCart className="w-4 h-4 transition-transform duration-300 group-hover/btn:scale-110" />
              اشتري الان
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
