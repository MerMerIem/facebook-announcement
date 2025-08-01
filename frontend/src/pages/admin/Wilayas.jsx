import { useState } from "react";
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
import { Edit, Search, ChevronLeft, ChevronRight, MapPin, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const mockWilayas = [
  { id: 1, name: "أدرار", delivery_fee: "3500.00" },
  { id: 2, name: "الشلف", delivery_fee: "0.00" },
  { id: 3, name: "الأغواط", delivery_fee: "0.00" },
  { id: 4, name: "أم البواقي", delivery_fee: "0.00" },
  { id: 5, name: "باتنة", delivery_fee: "0.00" },
  { id: 6, name: "بجاية", delivery_fee: "0.00" },
  { id: 7, name: "بسكرة", delivery_fee: "0.00" },
  { id: 8, name: "بشار", delivery_fee: "0.00" },
  { id: 9, name: "البليدة", delivery_fee: "0.00" },
  { id: 10, name: "البويرة", delivery_fee: "0.00" },
  { id: 16, name: "الجزائر", delivery_fee: "500.00" },
  { id: 17, name: "الجلفة", delivery_fee: "0.00" },
  { id: 18, name: "جيجل", delivery_fee: "0.00" },
  { id: 19, name: "سطيف", delivery_fee: "0.00" },
  { id: 20, name: "سعيدة", delivery_fee: "0.00" },
  { id: 21, name: "سكيكدة", delivery_fee: "0.00" },
  { id: 22, name: "سيدي بلعباس", delivery_fee: "0.00" },
  { id: 23, name: "عنابة", delivery_fee: "0.00" },
  { id: 24, name: "قالمة", delivery_fee: "0.00" },
  { id: 25, name: "قسنطينة", delivery_fee: "0.00" },
  { id: 31, name: "وهران", delivery_fee: "0.00" },
];

export default function Wilayas() {
  const [wilayas, setWilayas] = useState(mockWilayas);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingWilaya, setEditingWilaya] = useState(null);
  const [deliveryFee, setDeliveryFee] = useState("");
  const { toast } = useToast();

  const itemsPerPage = 10;
  const filteredWilayas = wilayas.filter(wilaya =>
    wilaya.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const totalPages = Math.ceil(filteredWilayas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedWilayas = filteredWilayas.slice(startIndex, startIndex + itemsPerPage);

  const handleEdit = (wilaya) => {
    if (!deliveryFee.trim()) return;
    
    setWilayas(wilayas.map(w => 
      w.id === wilaya.id 
        ? { ...w, delivery_fee: deliveryFee }
        : w
    ));
    setEditingWilaya(null);
    setDeliveryFee("");
    toast({ title: "تم تحديث رسوم التوصيل بنجاح" });
  };

  const formatPrice = (price) => {
    const num = parseFloat(price);
    return num === 0 ? "مجاني" : `${num.toFixed(0)} د.ج`;
  };

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
                <p className="text-2xl font-bold">{wilayas.length}</p>
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
          <div className="flex justify-between items-center">
            <CardTitle>قائمة الولايات ورسوم التوصيل</CardTitle>
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="البحث في الولايات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
          </div>
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
              {paginatedWilayas.map((wilaya) => (
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
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              عرض {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredWilayas.length)} من {filteredWilayas.length}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <span className="px-3 py-1 bg-muted rounded">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}