import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    ShoppingBag,
    Truck,
    Shield,
    Headphones,
    ChevronRight,
    CheckCircle2,
    Package,
    Mail,
    ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Header from '@/components/customer/layout/Header';
import { useApi } from '@/contexts/RestContext';
import { toast } from 'sonner';
import HeroImage from '@/assets/hero.webp';
const Index = () => {
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { api } = useApi();

    const features = [
        {
            icon: Headphones,
            title: 'دعم العملاء',
            description: 'فريق دعم متاح 24/7 لمساعدتك',
        },
        {
            icon: Shield,
            title: 'ضمان الجودة',
            description: 'جميع منتجاتنا أصلية ومضمونة الجودة',
        },
        {
            icon: Truck,
            title: 'توصيل سريع',
            description: 'توصيل لجميع أنحاء الجزائر في أسرع وقت',
        },
        {
            icon: ShoppingBag,
            title: 'تشكيلة واسعة',
            description: 'آلاف المنتجات من أفضل الماركات العالمية',
        },
    ];

    const whyUs = [
        {
            title: 'رضا العملاء',
            description: 'آلاف العملاء راضون عن خدماتنا ومنتجاتنا',
        },
        {
            title: 'خبرة موثوقة',
            description: 'سنوات من الخبرة في مجال مواد البناء والأدوات',
        },
        {
            title: 'منتجات أصلية',
            description: 'نوفر فقط منتجات أصلية من أفضل الماركات',
        },
        {
            title: 'أسعار تنافسية',
            description: 'أفضل الأسعار في السوق مع ضمان الجودة',
        },
    ];

    const categoryIcons = [
        ShoppingBag,
        Truck,
        Package,
        Shield,
        Headphones,
        ShoppingBag,
    ];

    const getCategoryDescription = category => {
        const { subcategory_count, subcategories } = category;

        if (subcategory_count > 0 && subcategories.length > 0) {
            const subcategoryNames = subcategories
                .slice(0, 3)
                .map(sub => sub.name)
                .join('، ');
            return subcategory_count > subcategories.length
                ? `${subcategoryNames} والمزيد`
                : subcategoryNames;
        }

        return 'تصفح مجموعة متنوعة من المنتجات عالية الجودة';
    };

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                setIsLoading(true);
                const [data, response, responseCode, error] =
                    await api.get('/category/getAll');

                if (responseCode === 200 && data) {
                    setCategories(data.categories || []);
                } else {
                    toast.error('خطأ في تحميل الفئات', {
                        description: error || 'فشل في تحميل فئات المنتجات',
                        duration: 4000,
                        style: {
                            direction: 'rtl',
                            textAlign: 'right',
                        },
                    });
                }
            } catch (err) {
                console.error('Error fetching categories:', err);
                toast.error('خطأ في الاتصال', {
                    description: 'تعذر الاتصال بالخادم',
                    duration: 4000,
                    style: {
                        direction: 'rtl',
                        textAlign: 'right',
                    },
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchCategories();
    }, [api]);

    return (
        <div className="min-h-screen bg-background">
            {/* Hero Section - background image, text overlaid on the right */}
            <section
                className="relative bg-cover bg-center min-h-[400px] w-full"
                style={{ backgroundImage: `url(${HeroImage})` }}
            >
                {/* Gradient overlay adjusted to match RTL text flow (darker on the right where the text lives) */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-background/70 to-background/95" />

                <div className="relative container mx-auto px-4 sm:px-6 py-16 sm:py-24 md:py-32">
                    <div className="max-w-xl mr-0 ml-auto text-right">
                        <h1 className="text-3xl xs:text-4xl sm:text-5xl font-bold mb-2 leading-tight text-foreground">
                            متجر الأدوات
                        </h1>
                        <h1 className="text-3xl xs:text-4xl sm:text-5xl font-bold mb-4 sm:mb-6 leading-tight text-primary">
                            المتخصص
                        </h1>
                        <p className="text-base sm:text-lg mb-6 sm:mb-8 leading-relaxed text-muted-foreground">
                            أحدث الأدوات الكهربائية وأدوات البناء بأفضل الأسعار
                            وجودة مضمونة
                        </p>

                        <div className="flex justify-end mb-6 sm:mb-8">
                            <Link to="/shop">
                                <Button
                                    size="lg"
                                    className="bg-primary text-primary-foreground hover:opacity-90 text-sm sm:text-base px-6 sm:px-8 py-3 sm:py-4 min-h-[48px] font-medium border-0 flex items-center gap-2"
                                >
                                    تسوق الآن
                                    <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Strip */}
            <section className="px-3 sm:px-4 mt-0 sm:-mt-20 relative z-10">
                <div className="container mx-auto">
                    <div className="rounded-md p-4 sm:p-6 md:p-8 bg-card border border-border ">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                            {features.map((feature, index) => (
                                <div
                                    key={index}
                                    className="text-center flex flex-col items-center"
                                >
                                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center mb-3 bg-accent/20">
                                        <feature.icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                                    </div>
                                    <h3 className="text-sm sm:text-base font-semibold mb-1 text-foreground">
                                        {feature.title}
                                    </h3>
                                    <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                                        {feature.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Categories */}
            <section className="py-10 sm:py-14 md:py-20 px-3 sm:px-4">
                <div className="container mx-auto">
                    <div className="text-center mb-8 sm:mb-12">
                        <h2 className="text-xl xs:text-2xl sm:text-3xl font-bold inline-block relative pb-3 text-foreground">
                            فئات المنتجات
                            <span className="absolute bottom-0 right-1/2 translate-x-1/2 w-16 h-1 rounded-full bg-primary" />
                        </h2>
                    </div>

                    {isLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto">
                            {[1, 2, 3, 4, 5, 6].map(item => (
                                <Card
                                    key={item}
                                    className="overflow-hidden animate-pulse border-0 bg-card"
                                >
                                    <CardContent className="p-5 sm:p-6">
                                        <div className="h-5 sm:h-6 rounded mb-3 w-1/2 bg-muted" />
                                        <div className="h-3 sm:h-4 rounded bg-muted" />
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : categories.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto">
                            {categories.slice(0, 6).map((category, idx) => {
                                const Icon =
                                    categoryIcons[idx % categoryIcons.length];
                                return (
                                    <Link
                                        key={category.id}
                                        to={`/shop?category=${encodeURIComponent(category.name)}`}
                                        className="block"
                                    >
                                        <Card className="cursor-pointer rounded-md overflow-hidden transition-all duration-300 hover:-translate-y-1 border border-border h-full bg-card">
                                            <CardContent className="p-5 sm:p-6 flex flex-col h-full">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-md flex items-center justify-center flex-shrink-0 bg-accent">
                                                        <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-accent-foreground" />
                                                    </div>
                                                    {category.subcategory_count >
                                                        0 && (
                                                        <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-input text-secondary">
                                                            {
                                                                category.subcategory_count
                                                            }{' '}
                                                            فئات فرعية
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="text-base sm:text-lg font-semibold mb-2 leading-tight text-foreground">
                                                    {category.name}
                                                </h3>
                                                <p className="text-xs sm:text-sm leading-relaxed flex-grow text-muted-foreground">
                                                    {getCategoryDescription(
                                                        category
                                                    )}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-6 sm:py-8">
                            <p className="text-sm sm:text-base text-muted-foreground">
                                لا توجد فئات متاحة حالياً
                            </p>
                        </div>
                    )}

                    {categories.length > 6 && (
                        <div className="text-center mt-8 sm:mt-10">
                            <Link to="/shop">
                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="text-sm sm:text-base px-6 py-3 min-h-[44px] border-border text-foreground bg-card"
                                >
                                    عرض جميع الفئات
                                    <ChevronLeft className="mr-2 h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
            </section>

            {/* Why Us */}
            <section className="px-3 sm:px-4 pb-10 sm:pb-14 md:pb-20">
                <div className="container mx-auto">
                    <div className="rounded-2xl p-6 sm:p-8 md:p-10 bg-card border border-border">
                        <h2 className="text-xl xs:text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-10 text-foreground">
                            لماذا تختارنا؟
                        </h2>
                        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                            {whyUs.map((item, index) => (
                                <div
                                    key={index}
                                    className="flex items-start gap-3 justify-end text-right"
                                >
                                    <div>
                                        <h3 className="text-sm sm:text-base font-semibold mb-1 text-foreground">
                                            {item.title}
                                        </h3>
                                        <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                                            {item.description}
                                        </p>
                                    </div>
                                    <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 mt-0.5 text-primary" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Index;
