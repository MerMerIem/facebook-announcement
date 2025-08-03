import { Link } from 'react-router-dom';
import { CheckCircle, ArrowRight, Package, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/components/customer/layout/Header';

const OrderSuccess = () => {
  return (
    <div className="min-h-screen bg-shop-bg">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="text-center">
            <CardHeader className="pb-4">
              <div className="w-20 h-20 bg-success rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-12 w-12 text-white" />
              </div>
              <CardTitle className="text-2xl text-success">
                تم إرسال طلبك بنجاح!
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">
                شكراً لك على ثقتك بمتجرنا. تم استلام طلبك وسيتم الاتصال بك قريباً لتأكيد التفاصيل وترتيب موعد التوصيل.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                <div className="space-y-2">
                  <Package className="h-8 w-8 text-primary mx-auto" />
                  <h3 className="font-semibold">تأكيد الطلب</h3>
                  <p className="text-sm text-muted-foreground">
                    سيتم الاتصال بك خلال 24 ساعة
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Clock className="h-8 w-8 text-primary mx-auto" />
                  <h3 className="font-semibold">التوصيل</h3>
                  <p className="text-sm text-muted-foreground">
                    2-5 أيام عمل حسب الولاية
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Link to="/shop">
                  <Button size="lg" className="w-full">
                    متابعة التسوق
                    <ArrowRight className="h-5 w-5 mr-2" />
                  </Button>
                </Link>
                
                <Link to="/">
                  <Button variant="outline" size="lg" className="w-full">
                    العودة للرئيسية
                  </Button>
                </Link>
              </div>

              <div className="text-sm text-muted-foreground space-y-1 border-t pt-4">
                <p>إذا كان لديك أي استفسار، يمكنك التواصل معنا:</p>
                <p>الهاتف: 0123456789</p>
                <p>البريد الإلكتروني: info@shop.com</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;