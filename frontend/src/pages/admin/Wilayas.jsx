import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Edit, ChevronLeft, ChevronRight, MapPin, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useApi } from "@/contexts/RestContext";

export default function Wilayas() {
  const { toast } = useToast();
  const { api } = useApi();
  
  const [wilayas, setWilayas] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingWilaya, setEditingWilaya] = useState(null);
  const [deliveryFee, setDeliveryFee] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    totalPages: 1,
    totalItems: 0,
  });

  const itemsPerPage = 10;

  const fetchData = async (page = 1) => {
    setIsLoading(true);

    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
      });

      const [data, _, responseCode, error] = await api.get(
        `/wilaya/get?${queryParams.toString()}`
      );

      if (!error && responseCode === 200 && data) {
        setWilayas(data.wilayas || []);
        setPagination(data.pagination || { totalPages: 1, totalItems: 0 });
      } else {
        console.error("Error fetching wilayas:", error || "No data returned");
        toast({
          title: "خطأ",
          description: "فشل في تحميل الولايات",
          variant: "destructive",
        });
        setWilayas([]);
        setPagination({ totalPages: 1, totalItems: 0 });
      }
    } catch (err) {
      console.error("Unexpected error fetching wilayas:", err);
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع أثناء تحميل الولايات",
        variant: "destructive",
      });
      setWilayas([]);
      setPagination({ totalPages: 1, totalItems: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(currentPage);
  }, [currentPage]);

  const handlePageChange = (page) => {
    if (page < 1 || page > (pagination?.totalPages || 1)) return;
    setCurrentPage(page);
  };

  const handleEdit = async (wilaya) => {
    if (!deliveryFee.trim()) return;
    
    try {
      const [data, _, responseCode, error] = await api.post(`/wilaya/modify/${wilaya.id}`, {
        delivery_fee: parseFloat(deliveryFee)
      });

      if (!error && responseCode === 200) {
        setWilayas(wilayas.map(w => 
          w.id === wilaya.id 
            ? { ...w, delivery_fee: deliveryFee }
            : w
        ));
        setEditingWilaya(null);
        setDeliveryFee("");
        toast({ title: "تم تحديث رسوم التوصيل بنجاح" });
      } else {
        throw new Error(error || "Failed to update wilaya");
      }
    } catch (error) {
      console.error("Error updating wilaya:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحديث رسوم التوصيل",
        variant: "destructive",
      });
    }
  };

  const formatPrice = (price) => {
    const num = parseFloat(price);
    return num === 0 ? "مجاني" : `${num.toFixed(0)} د.ج`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <MapPin className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">إدارة الولايات</h1>
            <p className="text-muted-foreground">إدارة رسوم التوصيل لكل ولاية</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">جاري تحميل الولايات...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <MapPin className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">إدارة الولايات</h1>
          <p className="text-muted-foreground">إدارة رسوم التوصيل لكل ولاية</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MapPin className="w-6 h-6 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الولايات</p>
                <p className="text-2xl font-bold">{pagination.totalItems || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-success">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Truck className="w-6 h-6 text-success" />
              <div>
                <p className="text-sm text-muted-foreground">توصيل مجاني</p>
                <p className="text-2xl font-bold">
                  {wilayas.filter(w => parseFloat(w.delivery_fee) === 0).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-warning">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Truck className="w-6 h-6 text-warning" />
              <div>
                <p className="text-sm text-muted-foreground">برسوم توصيل</p>
                <p className="text-2xl font-bold">
                  {wilayas.filter(w => parseFloat(w.delivery_fee) > 0).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>قائمة الولايات ورسوم التوصيل ({pagination.totalItems || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الرقم</TableHead>
                <TableHead className="text-right">اسم الولاية</TableHead>
                <TableHead className="text-right">رسوم التوصيل</TableHead>
                <TableHead className="text-right">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wilayas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <div className="text-muted-foreground">
                      لا توجد ولايات
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                wilayas.map((wilaya) => (
                  <TableRow key={wilaya.id}>
                    <TableCell>{wilaya.id}</TableCell>
                    <TableCell className="font-medium">{wilaya.name}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-md text-sm font-medium ${
                        parseFloat(wilaya.delivery_fee) === 0 
                          ? "bg-success/10 text-success" 
                          : "bg-warning/10 text-warning"
                      }`}>
                        {formatPrice(wilaya.delivery_fee)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Dialog open={editingWilaya?.id === wilaya.id} onOpenChange={(open) => {
                        if (!open) {
                          setEditingWilaya(null);
                          setDeliveryFee("");
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingWilaya(wilaya);
                              setDeliveryFee(wilaya.delivery_fee);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                            تعديل الرسوم
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>تعديل رسوم التوصيل - {wilaya.name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="delivery-fee">رسوم التوصيل (د.ج)</Label>
                              <Input
                                id="delivery-fee"
                                type="number"
                                min="0"
                                step="0.01"
                                value={deliveryFee}
                                onChange={(e) => setDeliveryFee(e.target.value)}
                                placeholder="0.00"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                أدخل 0 للتوصيل المجاني
                              </p>
                            </div>
                            <Button onClick={() => handleEdit(wilaya)} className="w-full">
                              تحديث الرسوم
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                صفحة {currentPage} من {pagination.totalPages}
                {pagination && (
                  <span className="mr-2">
                    • المجموع: {pagination.totalItems} ولاية
                  </span>
                )}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                >
                  الأولى
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <span className="px-3 py-1 bg-muted rounded">
                  {currentPage} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === pagination.totalPages}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.totalPages)}
                  disabled={currentPage === pagination.totalPages}
                >
                  الأخيرة
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}