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
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useApi } from "@/contexts/RestContext";
import ConfirmationDialog from "@/components/ConfirmationDialog";

export default function Subcategories() {
  const { toast } = useToast();
  const { api } = useApi();
  
  const [subcategories, setSubcategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const [formData, setFormData] = useState({ name: "", category_id: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    totalPages: 1,
    totalItems: 0,
  });
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    subcategory: null,
    isLoading: false
  });

  const itemsPerPage = 10;

  const fetchData = async (page = 1) => {
    setIsLoading(true);

    try {
      const subcatsQuery = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
      });

      const [subcatsData, _, subcatsCode, subcatsError] = await api.get(
        `/subcategory/getAll?${subcatsQuery.toString()}`
      );

      const [catsData, __, catsCode, catsError] = await api.get('/category/getAll');

      if (!subcatsError && subcatsCode === 200 && subcatsData && 
          !catsError && catsCode === 200 && catsData) {
        setSubcategories(subcatsData.subcategories || []);
        setCategories(catsData.categories || []);
        setPagination(subcatsData.pagination || { totalPages: 1, totalItems: 0 });
      } else {
        throw new Error(subcatsError || catsError || "Failed to fetch data");
      }

    } catch (err) {
      console.error("Error fetching data:", err);
      toast({
        title: "خطأ",
        description: "فشل في تحميل البيانات",
        variant: "destructive",
      });
      setSubcategories([]);
      setCategories([]);
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

  const handleAdd = async () => {
    if (!formData.name.trim() || !formData.category_id) return;
    
    try {
      const [data, _, responseCode, error] = await api.post('/subcategory/add', {
        name: formData.name,
        categoryId: parseInt(formData.category_id)
      });

      if (!error && responseCode === 201) {
        setFormData({ name: "", category_id: "" });
        setIsAddOpen(false);
        fetchData(currentPage);
        toast({ title: "تم إضافة الفئة الفرعية بنجاح" });
      } else {
        throw new Error(error || "Failed to add subcategory");
      }
    } catch (error) {
      console.error("Error adding subcategory:", error);
      toast({
        title: "خطأ",
        description: "فشل في إضافة الفئة الفرعية",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async (subcategory) => {
    if (!formData.name.trim() || !formData.category_id) return;
    
    try {
      const [data, _, responseCode, error] = await api.post(`/subcategory/modify/${subcategory.id}`, {
        name: formData.name,
        category_id: parseInt(formData.category_id)
      });

      if (!error && responseCode === 200) {
        setEditingSubcategory(null);
        setFormData({ name: "", category_id: "" });
        fetchData(currentPage);
        toast({ title: "تم تحديث الفئة الفرعية بنجاح" });
      } else {
        throw new Error(error || "Failed to update subcategory");
      }
    } catch (error) {
      console.error("Error updating subcategory:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحديث الفئة الفرعية",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClick = (subcategory) => {
    setDeleteConfirmation({ 
      isOpen: true, 
      subcategory, 
      isLoading: false 
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmation.subcategory) return;
    
    setDeleteConfirmation(prev => ({ ...prev, isLoading: true }));
    
    try {
      const [data, _, responseCode, error] = await api.delete(
        `/subcategory/delete/${deleteConfirmation.subcategory.id}`
      );

      if (!error && responseCode === 200) {
        fetchData(currentPage);
        toast({ title: "تم حذف الفئة الفرعية بنجاح" });
      } else {
        throw new Error(error || "Failed to delete subcategory");
      }
    } catch (error) {
      console.error("Error deleting subcategory:", error);
      toast({
        title: "خطأ",
        description: "فشل في حذف الفئة الفرعية",
        variant: "destructive",
      });
    } finally {
      setDeleteConfirmation({ 
        isOpen: false, 
        subcategory: null, 
        isLoading: false 
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">إدارة الفئات الفرعية</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">جاري تحميل الفئات الفرعية...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">إدارة الفئات الفرعية</h1>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              إضافة فئة فرعية
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة فئة فرعية جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">اسم الفئة الفرعية</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="أدخل اسم الفئة الفرعية"
                />
              </div>
              <div>
                <Label htmlFor="category">الفئة الرئيسية</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الفئة الرئيسية" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAdd} className="w-full">
                إضافة
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>قائمة الفئات الفرعية ({pagination.total || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الرقم</TableHead>
                <TableHead className="text-right">اسم الفئة الفرعية</TableHead>
                <TableHead className="text-right">الفئة الرئيسية</TableHead>
                <TableHead className="text-right">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subcategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <div className="text-muted-foreground">
                      لا توجد فئات فرعية
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                subcategories.map((subcategory) => (
                  <TableRow key={subcategory.id}>
                    <TableCell>{subcategory.id}</TableCell>
                    <TableCell className="font-medium">{subcategory.name}</TableCell>
                    <TableCell>{subcategory.category_name}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog open={editingSubcategory?.id === subcategory.id} onOpenChange={(open) => {
                          if (!open) {
                            setEditingSubcategory(null);
                            setFormData({ name: "", category_id: "" });
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingSubcategory(subcategory);
                                setFormData({ 
                                  name: subcategory.name, 
                                  category_id: subcategory.category_id.toString() 
                                });
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>تعديل الفئة الفرعية</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="edit-name">اسم الفئة الفرعية</Label>
                                <Input
                                  id="edit-name"
                                  value={formData.name}
                                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit-category">الفئة الرئيسية</Label>
                                <Select
                                  value={formData.category_id}
                                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {categories.map((category) => (
                                      <SelectItem key={category.id} value={category.id.toString()}>
                                        {category.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button onClick={() => handleEdit(subcategory)} className="w-full">
                                تحديث
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteClick(subcategory)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
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
                    • المجموع: {pagination.total} فئة فرعية
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

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ 
          isOpen: false, 
          subcategory: null, 
          isLoading: false 
        })}
        onConfirm={handleDeleteConfirm}
        title="تأكيد حذف الفئة الفرعية"
        message={`هل أنت متأكد من أنك تريد حذف الفئة الفرعية "${deleteConfirmation.subcategory?.name}"؟`}
        isLoading={deleteConfirmation.isLoading}
        confirmText="حذف"
        cancelText="إلغاء"
      />
    </div>
  );
}