import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useApi } from "@/contexts/RestContext";
import ConfirmationDialog from "@/components/ConfirmationDialog";

export default function Categories() {
  const { toast } = useToast();
  const { api } = useApi();
  
  const [categories, setCategories] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    totalPages: 1,
    totalItems: 0,
  });
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    category: null,
    isLoading: false
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
        `/category/getAll?${queryParams.toString()}`
      );

      if (!error && responseCode === 200 && data) {
        setCategories(data.categories || []);
        setPagination({
          totalPages: data.pagination?.totalPages || 1,
          totalItems: data.pagination?.total || 0,
        });
      } else {
        console.error("Error fetching categories:", error || "No data returned");
        toast({
          title: "خطأ",
          description: "فشل في تحميل الفئات",
          variant: "destructive",
        });
        setCategories([]);
        setPagination({ totalPages: 1, totalItems: 0 });
      }
    } catch (err) {
      console.error("Unexpected error fetching categories:", err);
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع أثناء تحميل الفئات",
        variant: "destructive",
      });
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
    if (!newCategoryName.trim()) return;
    
    try {
      const [data, _, responseCode, error] = await api.post("/category/add", {
        name: newCategoryName
      });

      if (!error && responseCode === 201) {
        setNewCategoryName("");
        setIsAddOpen(false);
        fetchData(currentPage);
        toast({ title: "تم إضافة الفئة بنجاح" });
      } else {
        throw new Error(error || "Failed to add category");
      }
    } catch (error) {
      console.error("Error adding category:", error);
      toast({
        title: "خطأ",
        description: "فشل في إضافة الفئة",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async (category) => {
    if (!newCategoryName.trim()) return;
    
    try {
      const [data, _, responseCode, error] = await api.post(`/category/modify/${category.id}`, {
        name: newCategoryName
      });

      if (!error && responseCode === 200) {
        setEditingCategory(null);
        setNewCategoryName("");
        fetchData(currentPage);
        toast({ title: "تم تحديث الفئة بنجاح" });
      } else {
        throw new Error(error || "Failed to update category");
      }
    } catch (error) {
      console.error("Error updating category:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحديث الفئة",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClick = (category) => {
    setDeleteConfirmation({ 
      isOpen: true, 
      category, 
      isLoading: false 
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmation.category) return;
    
    setDeleteConfirmation(prev => ({ ...prev, isLoading: true }));
    
    try {
      const [data, _, responseCode, error] = await api.delete(
        `/category/delete/${deleteConfirmation.category.id}`
      );

      if (!error && responseCode === 200) {
        fetchData(currentPage);
        toast({ title: "تم حذف الفئة بنجاح" });
      } else {
        throw new Error(error || "Failed to delete category");
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      toast({
        title: "خطأ",
        description: "فشل في حذف الفئة",
        variant: "destructive",
      });
    } finally {
      setDeleteConfirmation({ 
        isOpen: false, 
        category: null, 
        isLoading: false 
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">إدارة الفئات الرئيسية</h1>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">جاري تحميل الفئات...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">إدارة الفئات الرئيسية</h1>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              إضافة فئة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة فئة جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">اسم الفئة</Label>
                <Input
                  id="name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="أدخل اسم الفئة"
                />
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
          <CardTitle>قائمة الفئات ({pagination.totalItems || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الرقم</TableHead>
                <TableHead className="text-right">اسم الفئة</TableHead>
                <TableHead className="text-right">عدد الفئات الفرعية</TableHead>
                <TableHead className="text-right">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <div className="text-muted-foreground">
                      لا توجد فئات
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>{category.id}</TableCell>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {category.subcategory_count}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog open={editingCategory?.id === category.id} onOpenChange={(open) => {
                          if (!open) {
                            setEditingCategory(null);
                            setNewCategoryName("");
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingCategory(category);
                                setNewCategoryName(category.name);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>تعديل الفئة</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="edit-name">اسم الفئة</Label>
                                <Input
                                  id="edit-name"
                                  value={newCategoryName}
                                  onChange={(e) => setNewCategoryName(e.target.value)}
                                />
                              </div>
                              <Button onClick={() => handleEdit(category)} className="w-full">
                                تحديث
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteClick(category)}
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
                عرض {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, pagination.totalItems)} من {pagination.totalItems}
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
          category: null, 
          isLoading: false 
        })}
        onConfirm={handleDeleteConfirm}
        title="تأكيد حذف الفئة"
        message={`هل أنت متأكد من أنك تريد حذف الفئة "${deleteConfirmation.category?.name}"؟`}
        isLoading={deleteConfirmation.isLoading}
        confirmText="حذف"
        cancelText="إلغاء"
      />
    </div>
  );
}