/* eslint-disable react/prop-types */
import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';

export default function SalesProductCard({ product, stripHtmlToText }) {
    // Check if the string contains Arabic characters
    const isArabic = text => /[\u0600-\u06FF]/.test(text);

    const isTitleArabic = isArabic(product.name || '');
    const cleanDescription = stripHtmlToText(product.description || '');
    const isDescArabic = isArabic(cleanDescription);

    return (
        <Link
            to={`/product/${product.id}`}
            className="flex flex-col border border-border bg-card overflow-hidden transition-all duration-300 hover:-translate-y-1 h-full"
        >
            {/* Top Bar: Required Pieces (Left 1/4) + Image (Right 3/4) */}
            <div className="flex h-48 sm:h-52 bg-white border-b border-border shrink-0">
                {/* Left Side: Required Quantity (1/4 Width) */}
                <div
                    className="w-2/9 flex flex-col items-center justify-center bg-primary h-30 text-secondary-foreground text-center p-2 border-r border-border shrink-0"
                    style={{
                        borderBottomRightRadius: '36px',
                        cornerBottomRightShape: 'bevel',
                    }}
                >
                    {product.discount_threshold ? (
                        <>
                            <p className="text-xs leading-tight">
                                خصم عند شراء أكثر من
                            </p>
                            <p className="text-xl  sm:text-2xl font-bold my-0.5">
                                {product.discount_threshold}
                            </p>
                            <p className="text-xs leading-tight">قطعة</p>
                        </>
                    ) : null}
                </div>
                {/* Right Side: Product Image (3/4 Width) */}
                <div className="w-3/4 flex items-center justify-center bg-white p-3 overflow-hidden">
                    {product.main_image_url ? (
                        <img
                            src={product.main_image_url}
                            alt={product.name}
                            className="w-full h-full object-contain"
                        />
                    ) : (
                        <Package className="h-10 w-10 text-muted-foreground" />
                    )}
                </div>
            </div>

            {/* Middle Section: Title & Description */}
            <div className="pb-8 pt-4 px-4 flex-1 flex flex-col  h-32 sm:h-36 overflow-hidden">
                <h3
                    dir={isTitleArabic ? 'rtl' : 'ltr'}
                    className={`text-sm sm:text-base font-semibold mb-1 leading-snug text-foreground line-clamp-2 ${
                        isTitleArabic ? 'text-right' : 'text-left'
                    }`}
                >
                    {product.name}
                </h3>
                <p
                    dir={isDescArabic ? 'rtl' : 'ltr'}
                    className={`text-xs text-muted-foreground leading-relaxed line-clamp-2  ${
                        isDescArabic ? 'text-right' : 'text-left'
                    }`}
                >
                    {cleanDescription}
                </p>
            </div>

            {/* Bottom Section: Price Bar */}
            <div className="flex items-stretch border-t bg-primary border-border mt-auto shrink-0">
                <div className="flex-1 flex items-center justify-center px-3 py-2.5">
                    <span className="text-base sm:text-lg font-bold text-primary-foreground">
                        {product.price} د.ج
                    </span>
                </div>{' '}
                <div className="flex-1 flex items-center justify-center px-3 py-2.5 border-primary-foreground/20">
                    <span className="text-xs sm:text-sm text-primary-foreground text-center">
                        السعر لكل قطعة
                    </span>
                </div>
            </div>
        </Link>
    );
}
