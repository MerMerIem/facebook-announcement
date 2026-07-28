/* eslint-disable react/prop-types */
import { Link } from 'react-router-dom';
import { Package, ShoppingCart } from 'lucide-react';

/**
 * PackProductCard
 * ----------------
 * A flat, shadow-free, square-corner card for bundle ("Pack") products.
 *
 * Layout: ribbon tag -> image -> title/description -> price + CTA,
 * all in a single row (stacked on mobile). No cut corners, no dashed
 * perforation lines — just clean flat blocks separated by hairline borders.
 */
export default function PackProductCard({ product }) {
    const { id, name, description, price, main_image_url } = product;

    const isArabic = /[\u0600-\u06FF]/.test(name || '');

    return (
        <Link
            to={`/product/${id}`}
            className="group flex flex-col overflow-hidden border border-border bg-card transition-colors duration-300 hover:bg-card/95 sm:flex-row sm:items-stretch"
        >
            <div className="relative flex flex-col sm:flex-row items-center bg-white overflow-hidden">
                {/* Image Container with Ribbon Overlay */}
                <div className="relative flex h-48 w-full sm:h-44 sm:w-70 shrink-0 items-center justify-center bg-white p-4">
                    {/* Ticket Ribbon Tag */}
                    <div
                        className="absolute top-0 left-4 z-10 flex w-12 flex-col items-center bg-primary pt-3 pb-5 text-white shadow-sm"
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

                    {/* Image */}
                    {main_image_url ? (
                        <img
                            src={main_image_url}
                            alt={name}
                            className="h-full w-full object-contain transition-transform duration-300 ml-10 group-hover:scale-[1.03]"
                        />
                    ) : (
                        <Package
                            className="h-10 w-10 text-muted-foreground"
                            strokeWidth={1.5}
                        />
                    )}
                </div>

                {/* Rest of your card content (Details, price, action button, etc.) */}
            </div>

            {/* Title + description */}
            <div
                dir={isArabic ? 'rtl' : 'ltr'}
                className="flex min-w-0 flex-1 flex-col justify-start p-4 sm:p-5 text-start"
            >
                <h3 className="mb-1 text-base font-semibold text-foreground sm:text-lg line-clamp-1">
                    {name}
                </h3>
                <p className="text-xs text-muted-foreground sm:text-sm line-clamp-2 leading-relaxed">
                    {stripHtmlToText(description)}
                </p>
            </div>

            {/* Price + CTA */}
            <div className="flex flex-shrink-0 flex-row items-center justify-between gap-3 border-t border-border p-4 sm:flex-col sm:justify-center sm:gap-3 sm:border-t-0 sm:border-s sm:p-5">
                <div className="text-center">
                    <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                        السعر
                    </p>
                    <p className="whitespace-nowrap text-lg font-bold text-primary sm:text-xl">
                        {price}{' '}
                        <span className="text-sm font-semibold">د.ج</span>
                    </p>
                </div>

                <span className="inline-flex items-center gap-1.5 whitespace-nowrap bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                    <ShoppingCart className="h-4 w-4" strokeWidth={2.25} />
                    عرض الحزمة
                </span>
            </div>
        </Link>
    );
}

function stripHtmlToText(html) {
    if (!html) return '';
    if (typeof window === 'undefined') return html;
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
}
