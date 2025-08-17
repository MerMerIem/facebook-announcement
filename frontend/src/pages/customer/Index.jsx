import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ShoppingBag,
  Truck,
  Shield,
  Headphones,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/customer/layout/Header";
import { useApi } from "@/contexts/RestContext";
import { toast } from "sonner";

const Index = () => {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { api } = useApi();

  // Static features data
  const features = [
    {
      icon: ShoppingBag,
      title: "تشكيلة واسعة",
      description: "آلاف المنتجات من أفضل الماركات العالمية",
    },
    {
      icon: Truck,
      title: "توصيل سريع",
      description: "توصيل لجميع أنحاء الجزائر في أسرع وقت",
    },
    {
      icon: Shield,
      title: "ضمان الجودة",
      description: "جميع منتجاتنا أصلية ومضمونة الجودة",
    },
    {
      icon: Headphones,
      title: "دعم العملاء",
      description: "فريق دعم متاح 24/7 لمساعدتك",
    },
  ];

  // Generate description based on subcategories or general fallback
  const getCategoryDescription = (category) => {
    const { subcategory_count, subcategories } = category;

    if (subcategory_count > 0 && subcategories.length > 0) {
      // Show first 2-3 subcategories if available
      const subcategoryNames = subcategories
        .slice(0, 3)
        .map((sub) => sub.name)
        .join("، ");
      return subcategory_count > subcategories.length
        ? `${subcategoryNames} والمزيد`
        : subcategoryNames;
    }

    // Generic fallback description
    return "تصفح مجموعة متنوعة من المنتجات عالية الجودة";
  };

  // Fetch categories from API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoading(true);
        const [data, response, responseCode, error] = await api.get(
          "/category/getAll"
        );

        if (responseCode === 200 && data) {
          setCategories(data.categories || []);
        } else {
          toast.error("خطأ في تحميل الفئات", {
            description: error || "فشل في تحميل فئات المنتجات",
            duration: 4000,
            style: {
              direction: "rtl",
              textAlign: "right",
            },
          });
        }
      } catch (err) {
        console.error("Error fetching categories:", err);
        toast.error("خطأ في الاتصال", {
          description: "تعذر الاتصال بالخادم",
          duration: 4000,
          style: {
            direction: "rtl",
            textAlign: "right",
          },
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, [api]);

  return (
    <div className="min-h-screen bg-shop-bg">
      <div dir="ltr">
        <Header />
      </div>

      {/* Hero Section - Mobile Optimized */}
      <section className="relative py-8 sm:py-12 md:py-16 lg:py-20 px-3 sm:px-4">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-primary mb-3 sm:mb-4 md:mb-6 text-shadow leading-tight">
              متجر الأدوات المتخصص
            </h1>
            <p className="text-base xs:text-lg sm:text-xl md:text-2xl text-muted-foreground mb-4 sm:mb-6 md:mb-8 leading-relaxed px-2">
              أحدث الأدوات الكهربائية وأدوات البناء بأفضل الأسعار
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0">
              <Link to="/shop" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="gradient-primary text-white border-0 hover:opacity-90 text-sm xs:text-base sm:text-lg px-4 xs:px-6 sm:px-8 py-3 sm:py-4 w-full sm:w-auto min-h-[48px] font-medium"
                >
                  تسوق الآن
                  <ArrowRight className="mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Mobile Optimized */}
      <section className="py-8 sm:py-12 md:py-16 px-3 sm:px-4">
        <div className="container mx-auto">
          <h2 className="text-xl xs:text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8 md:mb-12 text-primary leading-tight">
            لماذا تختار متجرنا؟
          </h2>
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="hover-lift gradient-card border-0 h-full">
                <CardContent className="p-4 sm:p-6 text-center h-full flex flex-col">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-primary to-primary-glow rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 flex-shrink-0">
                    <feature.icon className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                  </div>
                  <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-2 text-primary leading-tight">
                    {feature.title}
                  </h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed flex-grow">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Preview - Mobile Optimized */}
      <section className="py-8 sm:py-12 md:py-16 px-3 sm:px-4 bg-white">
        <div className="container mx-auto">
          <h2 className="text-xl xs:text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8 md:mb-12 text-primary leading-tight">
            فئات المنتجات
          </h2>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <Card key={item} className="overflow-hidden animate-pulse">
                  <div className="aspect-video bg-gray-200"></div>
                  <CardContent className="p-4 sm:p-6 text-center">
                    <div className="h-5 sm:h-6 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 sm:h-4 bg-gray-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : categories.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto">
              {categories.slice(0, 6).map((category) => (
                <Link
                  key={category.id}
                  to={`/shop?category=${encodeURIComponent(category.name)}`}
                  className="block"
                >
                  <Card className="hover-lift cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-lg border-gray-200 h-full">
                    <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center relative">
                      <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-primary/30">
                        {category.name.charAt(0)}
                      </div>
                      {category.subcategory_count > 0 && (
                        <div className="absolute top-2 right-2 bg-primary text-white text-xs px-2 py-1 rounded-full">
                          {category.subcategory_count} : فئة فرعية
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4 sm:p-6 text-center flex-grow flex flex-col">
                      <h3 className="text-lg sm:text-xl font-semibold text-primary mb-2 leading-tight">
                        {category.name}
                      </h3>
                      <p className="text-sm sm:text-base text-muted-foreground leading-relaxed flex-grow">
                        {getCategoryDescription(category)}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 sm:py-8">
              <p className="text-sm sm:text-base text-muted-foreground">لا توجد فئات متاحة حالياً</p>
            </div>
          )}

          {categories.length > 6 && (
            <div className="text-center mt-6 sm:mt-8">
              <Link to="/shop">
                <Button 
                  variant="outline" 
                  size="lg"
                  className="text-sm sm:text-base px-4 sm:px-6 py-3 min-h-[44px]"
                >
                  عرض جميع الفئات
                  <ArrowRight className="mr-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section - Fixed Button Contrast */}
      <section className="py-8 sm:py-12 md:py-16 px-3 sm:px-4 bg-primary">
        <div className="container mx-auto text-center">
          <div className="max-w-2xl mx-auto text-white">
            <h2 className="text-xl xs:text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 leading-tight">
              ابدأ التسوق الآن
            </h2>
            <p className="text-base xs:text-lg sm:text-xl mb-4 sm:mb-6 md:mb-8 opacity-90 leading-relaxed px-2">
              اكتشف أفضل العروض والمنتجات الجديدة
            </p>
            <Link to="/shop" className="inline-block w-full sm:w-auto">
              <Button 
                size="lg" 
                className="bg-white text-primary hover:bg-gray-100 hover:text-primary border-2 border-white font-semibold text-sm xs:text-base sm:text-lg px-4 xs:px-6 sm:px-8 py-3 sm:py-4 w-full sm:w-auto min-h-[48px] transition-all duration-200"
              >
                تصفح المتجر
                <ArrowRight className="mr-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;