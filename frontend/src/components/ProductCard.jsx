import { Card, CardContent } from 'frontend/src/components/ui/card';
import { Button } from 'frontend/src/components/ui/button';
import { ShoppingCart, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ProductCard({ product }) {
    const navigate = useNavigate();

    const handleBuyNow = () => {
        navigate(`/product/${product.id}`);
    };

    const isPack = product.category?.name === 'Packs';
    const hasDiscount = Boolean(product.discount_threshold);

    return (
        <Card className="group relative overflow-hidden bg-gradient-card border-0 shadow-card hover:shadow-elegant transition-all duration-500 hover:-translate-y-2">
            {/* Pack ribbon tag - top-left overlay */}
            {isPack && (
                <div
                    className="absolute top-0 left-4 z-10 flex w-12 flex-col items-center bg-[#E05318] pt-3 pb-5 text-white shadow-sm"
                    style={{
                        clipPath:
                            'polygon(0 0, 100% 0, 100% 100%, 50% calc(100% - 8px), 0 100%)',
                    }}
                >
                    <Package className="h-5 w-5 mb-1" strokeWidth={2.25} />
                    <span className="text-[11px] font-bold leading-tight text-center">
                        حزمة
                    </span>
                    <span className="text-[10px] font-normal opacity-90">
                        (Pack)
                    </span>
                </div>
            )}

            <div className="aspect-square overflow-hidden">
                <img
                    src={product.main_image_url}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
            </div>

            <CardContent className="p-6">
                {/* Discount threshold badge */}
                {hasDiscount && (
                    <div className="mb-3 inline-flex flex-col items-center bg-primary text-primary-foreground text-center px-3 py-1.5 rounded-md">
                        <p className="text-[11px] leading-tight">
                            خصم عند شراء أكثر من
                        </p>
                        <p className="text-sm font-bold leading-tight">
                            {product.discount_threshold} قطعة
                        </p>
                    </div>
                )}

                <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors duration-300">
                    {product.name}
                </h3>
                <p className="text-muted-foreground mb-4 line-clamp-2">
                    {product.description}
                </p>
                <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold bg-primary bg-clip-text text-transparent">
                        د.ج {product.current_price ?? product.price}
                    </span>
                    <Button
                        variant="buynow"
                        size="lg"
                        onClick={handleBuyNow}
                        className={
                            'bg-gradient-to-br from-primary to-primary/60 text-white'
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
