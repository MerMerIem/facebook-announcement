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
import { toast } from "sonner"; // Replaced useToast with sonner

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

      {/* Hero Section */}
      <section className="relative py-12 sm:py-16 lg:py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-primary mb-4 sm:mb-6 text-shadow">
              متجر الأدوات المتخصص
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-6 sm:mb-8">
              أحدث الأدوات الكهربائية وأدوات البناء بأفضل الأسعار
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/shop">
                <Button
                  size="lg"
                  className="gradient-primary text-white border-0 hover:opacity-90 text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 w-full sm:w-auto"
                >
                  تسوق الآن
                  <ArrowRight className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 px-4">
        <div className="container mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12 text-primary">
            لماذا تختار متجرنا؟
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="hover-lift gradient-card border-0">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-primary to-primary-glow rounded-full flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-primary">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Preview */}
      <section className="py-12 sm:py-16 px-4 bg-white">
        <div className="container mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12 text-primary">
            فئات المنتجات
          </h2>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {[1, 2, 3].map((item) => (
                <Card key={item} className="overflow-hidden animate-pulse p-0">
                  <div className="aspect-video bg-gray-200"></div>
                  <CardContent className="p-6 text-center p-0">
                    <div className="h-6 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : categories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {categories.slice(0, 6).map((category) => (
                <Link
                  key={category.id}
                  to={`/shop?category=${encodeURIComponent(category.name)}`}
                >
                  <Card className="hover-lift cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-lg p-0 border-gray-200">
                    <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center relative">
                      <div className="text-6xl font-bold text-primary/30">
                        {category.name.charAt(0)}
                      </div>
                      {category.subcategory_count > 0 && (
                        <div className="absolute top-2 right-2 bg-primary text-white text-xs px-2 py-1 rounded-full">
                          {category.subcategory_count} : فئة فرعية
                        </div>
                      )}
                    </div>
                    <CardContent className="p-6 text-center">
                      <h3 className="text-xl font-semibold text-primary mb-2">
                        {category.name}
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        {getCategoryDescription(category)}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">لا توجد فئات متاحة حالياً</p>
            </div>
          )}

          {categories.length > 6 && (
            <div className="text-center mt-8">
              <Link to="/shop">
                <Button variant="outline" size="lg">
                  عرض جميع الفئات
                  <ArrowRight className="mr-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 px-4 bg-primary">
        <div className="container mx-auto text-center">
          <div className="max-w-2xl mx-auto text-white">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">ابدأ التسوق الآن</h2>
            <p className="text-lg sm:text-xl mb-6 sm:mb-8 opacity-90">
              اكتشف أفضل العروض والمنتجات الجديدة
            </p>
            <Link to="/shop">
              <Button size="lg" variant="outline" className="text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 w-full sm:w-auto">
                تصفح المتجر
                <ArrowRight className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;