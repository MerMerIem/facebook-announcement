import { Link } from 'react-router-dom';
import { CheckCircle, ArrowRight, Package, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const OrderSuccess = () => {
    return (
        <div className="min-h-screen bg-shop-bg" dir="rtl">
            <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
                <div className="max-w-2xl mx-auto">
                    <Card className="text-center rounded-none shadow-none border border-gray-200 bg-white">
                        <CardHeader className="pb-6 px-6 sm:px-10 pt-8 sm:pt-10">
                            <CardTitle className="text-xl sm:text-2xl text-success">
                                تم إرسال طلبك بنجاح!
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="space-y-6 sm:space-y-8 px-6 sm:px-10 pb-8 sm:pb-10">
                            <p className="text-muted-foreground text-sm sm:text-base">
                                شكراً لك على ثقتك بمتجرنا. تم استلام طلبك وسيتم
                                الاتصال بك قريباً لتأكيد التفاصيل وترتيب موعد
                                التوصيل.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
                                <div className="space-y-2 p-5 sm:p-6 bg-gray-50 border rounded-none">
                                    <Package className="h-6 w-6 sm:h-8 sm:w-8 text-primary mx-auto" />
                                    <h3 className="font-semibold text-sm sm:text-base">
                                        تأكيد الطلب
                                    </h3>
                                    <p className="text-xs sm:text-sm text-muted-foreground">
                                        سيتم الاتصال بك خلال 24 ساعة
                                    </p>
                                </div>

                                <div className="space-y-2 p-5 sm:p-6 bg-gray-50 border rounded-none">
                                    <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-primary mx-auto" />
                                    <h3 className="font-semibold text-sm sm:text-base">
                                        التوصيل
                                    </h3>
                                    <p className="text-xs sm:text-sm text-muted-foreground">
                                        2-5 أيام عمل حسب الولاية
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Link to="/shop">
                                    <Button
                                        size="lg"
                                        className="w-full rounded-none py-4"
                                    >
                                        متابعة التسوق
                                        <ArrowRight className="h-5 w-5 mr-2" />
                                    </Button>
                                </Link>

                                <Link to="/">
                                    <Button
                                        variant="ghost"
                                        size="lg"
                                        className="w-full rounded-none py-4 my-5 shadow-none"
                                    >
                                        العودة للرئيسية
                                    </Button>
                                </Link>
                            </div>

                            <div className="text-xs sm:text-sm text-muted-foreground space-y-1 border-t pt-5">
                                <p>
                                    إذا كان لديك أي استفسار، يمكنك التواصل معنا:
                                </p>
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
