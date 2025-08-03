import { Link } from 'react-router-dom';
import { ShoppingBag, Truck, Shield, Headphones, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Header from '@/components/customer/layout/Header';

const Index = () => {
  const features = [
    {
      icon: ShoppingBag,
      title: 'تشكيلة واسعة',
      description: 'آلاف المنتجات من أفضل الماركات العالمية'
    },
    {
      icon: Truck,
      title: 'توصيل سريع',
      description: 'توصيل لجميع أنحاء الجزائر في أسرع وقت'
    },
    {
      icon: Shield,
      title: 'ضمان الجودة',
      description: 'جميع منتجاتنا أصلية ومضمونة الجودة'
    },
    {
      icon: Headphones,
      title: 'دعم العملاء',
      description: 'فريق دعم متاح 24/7 لمساعدتك'
    }
  ];

  return (
    <div className="min-h-screen bg-shop-bg">
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-primary mb-6 text-shadow">
              متجر الأدوات المتخصص
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8">
              أحدث الأدوات الكهربائية وأدوات البناء بأفضل الأسعار
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/shop">
                <Button size="lg" className="gradient-primary text-white border-0 hover:opacity-90 text-lg px-8 py-4">
                  تسوق الآن
                  <ArrowLeft className="mr-2 h-5 w-5" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="text-lg px-8 py-4">
                تصفح الفئات
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-primary">
            لماذا تختار متجرنا؟
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="hover-lift gradient-card border-0">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-primary to-primary-glow rounded-full flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-primary">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Preview */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-primary">
            فئات المنتجات
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Link to="/shop?category=1">
              <Card className="hover-lift cursor-pointer overflow-hidden">
                <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center">
                  <ShoppingBag className="h-16 w-16 text-primary" />
                </div>
                <CardContent className="p-6 text-center">
                  <h3 className="text-xl font-semibold text-primary">
                    الأدوات الكهربائية
                  </h3>
                  <p className="text-muted-foreground mt-2">
                    مثاقب، مناشير، وأدوات كهربائية متطورة
                  </p>
                </CardContent>
              </Card>
            </Link>
            
            <Link to="/shop?category=2">
              <Card className="hover-lift cursor-pointer overflow-hidden">
                <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center">
                  <Shield className="h-16 w-16 text-primary" />
                </div>
                <CardContent className="p-6 text-center">
                  <h3 className="text-xl font-semibold text-primary">
                    أدوات البناء
                  </h3>
                  <p className="text-muted-foreground mt-2">
                    أدوات احترافية لجميع أعمال البناء والتشييد
                  </p>
                </CardContent>
              </Card>
            </Link>
            
            <Link to="/shop?category=3">
              <Card className="hover-lift cursor-pointer overflow-hidden">
                <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center">
                  <Truck className="h-16 w-16 text-primary" />
                </div>
                <CardContent className="p-6 text-center">
                  <h3 className="text-xl font-semibold text-primary">
                    قطع الغيار
                  </h3>
                  <p className="text-muted-foreground mt-2">
                    قطع غيار أصلية لجميع أنواع الأدوات
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-primary to-primary-glow">
        <div className="container mx-auto text-center">
          <div className="max-w-2xl mx-auto text-white">
            <h2 className="text-3xl font-bold mb-4">
              ابدأ التسوق الآن
            </h2>
            <p className="text-xl mb-8 opacity-90">
              اكتشف أفضل العروض والمنتجات الجديدة
            </p>
            <Link to="/shop">
              <Button size="lg" variant="secondary" className="text-lg px-8 py-4">
                تصفح المتجر
                <ArrowLeft className="mr-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;