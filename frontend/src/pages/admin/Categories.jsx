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
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight, ChevronDown, Search, Tag, Package } from "lucide-react";
import { toast } from "sonner"; // Changed from useToast to sonner
import { useApi } from "@/contexts/RestContext";
import ConfirmationDialog from "@/components/ConfirmationDialog";

export default function Categories() {
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
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchData = async (page = 1, search = "") => {
    setIsLoading(true);

    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
      });

      if (search.trim()) {
        queryParams.append("search", search);
      }

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
        toast.error("خطأ", {
          description: "فشل في تحميل الفئات",
          duration: 4000,
          style: {
            background: "#ef4444",
            color: "#ffffff",
            direction: "rtl",
            textAlign: "right",
          },
        });
        setCategories([]);
        setPagination({ totalPages: 1, totalItems: 0 });
      }
    } catch (err) {
      console.error("Unexpected error fetching categories:", err);
      toast.error("خطأ", {
        description: "حدث خطأ غير متوقع أثناء تحميل الفئات",
        duration: 4000,
        style: {
          background: "#ef4444",
          color: "#ffffff",
          direction: "rtl",
          textAlign: "right",
        },
      });
      setCategories([]);
      setPagination({ totalPages: 1, totalItems: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const searchTimeout = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(searchTimeout);
  }, [searchTerm]);

  useEffect(() => {
    fetchData(currentPage, debouncedSearchTerm);
  }, [currentPage, itemsPerPage, debouncedSearchTerm]);

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
        toast.success("تم إضافة الفئة بنجاح", {
          duration: 3000,
          style: {
            background: "#22c55e",
            color: "#ffffff",
            direction: "rtl",
            textAlign: "right",
          },
        });
      } else {
        throw new Error(error || "Failed to add category");
      }
    } catch (error) {
      console.error("Error adding category:", error);
      toast.error("خطأ", {
        description: "فشل في إضافة الفئة",
        duration: 4000,
        style: {
          background: "#ef4444",
          color: "#ffffff",
          direction: "rtl",
          textAlign: "right",
        },
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
        toast.success("تم تحديث الفئة بنجاح", {
          duration: 3000,
          style: {
            background: "#22c55e",
            color: "#ffffff",
            direction: "rtl",
            textAlign: "right",
          },
        });
      } else {
        throw new Error(error || "Failed to update category");
      }
    } catch (error) {
      console.error("Error updating category:", error);
      toast.error("خطأ", {
        description: "فشل في تحديث الفئة",
        duration: 4000,
        style: {
          background: "#ef4444",
          color: "#ffffff",
          direction: "rtl",
          textAlign: "right",
        },
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
        toast.success("تم حذف الفئة بنجاح", {
          duration: 3000,
          style: {
            background: "#22c55e",
            color: "#ffffff",
            direction: "rtl",
            textAlign: "right",
          },
        });
      } else {
        throw new Error(error || "Failed to delete category");
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("خطأ", {
        description: "فشل في حذف الفئة",
        duration: 4000,
        style: {
          background: "#ef4444",
          color: "#ffffff",
          direction: "rtl",
          textAlign: "right",
        },
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
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">إدارة الفئات الرئيسية</h1>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              إضافة فئة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-right">إضافة فئة جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-right">
                <Label htmlFor="name" className="text-right block">اسم الفئة</Label>
                <Input
                  id="name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="أدخل اسم الفئة"
                  className="text-right"
                  dir="rtl"
                />
              </div>
              <Button onClick={handleAdd} className="w-full">
                إضافة
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative w-full sm:flex-1 sm:max-w-sm">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="البحث في الفئات..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
            }}
            className="pr-10 text-right"
            dir="rtl"
          />
        </div>

        <div className="relative">
          <select
            id="items-per-page"
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="
            appearance-none
            w-full
            px-4 py-2
            pr-10
            bg-white
            border-2 border-gray-200
            rounded-lg
            text-gray-900
            text-sm
            font-medium
            cursor-pointer
            transition-all
            duration-200
            ease-in-out
            hover:border-primary
            hover:shadow-sm
            focus:outline-none
            focus:ring-2
            focus:ring-ring
            focus:ring-opacity-20
            focus:border-ring
            focus:shadow-md
          "
          >
            <option value={10}>10 items</option>
            <option value={20}>20 items</option>
            <option value={30}>30 items</option>
            <option value={40}>40 items</option>
            <option value={50}>50 items</option>
          </select>

          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <ChevronDown
              className="h-5 w-5 text-gray-400 transition-colors duration-200"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>

      {/* Simple Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي الفئات</p>
              <p className="text-xl font-bold">{pagination.totalItems || 0}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-green-100">
              <Tag className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي الفئات الفرعية</p>
              <p className="text-xl font-bold">{categories.reduce((sum, cat) => sum + (cat.subcategory_count || 0), 0)}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-purple-100">
              <Package className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي المنتجات</p>
              <p className="text-xl font-bold">{categories.reduce((sum, cat) => sum + (cat.product_count || 0), 0)}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>قائمة الفئات ({pagination.totalItems || 0})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الرقم</TableHead>
                <TableHead className="text-right">اسم الفئة</TableHead>
                <TableHead className="text-right">عدد الفئات الفرعية</TableHead>
                <TableHead className="text-right">عدد المنتجات</TableHead>
                <TableHead className="text-right">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="text-muted-foreground">
                      {searchTerm ? "لا توجد فئات تطابق البحث" : "لا توجد فئات"}
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
                      <Badge variant="outline">
                        {category.product_count || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
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
                          <DialogContent dir="rtl">
                            <DialogHeader>
                              <DialogTitle className="text-right">تعديل الفئة</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="text-right">
                                <Label htmlFor="edit-name" className="text-right block">اسم الفئة</Label>
                                <Input
                                  id="edit-name"
                                  value={newCategoryName}
                                  onChange={(e) => setNewCategoryName(e.target.value)}
                                  className="text-right"
                                  dir="rtl"
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
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 p-4">
              <p className="text-sm text-muted-foreground text-center sm:text-left">
                عرض {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, pagination.totalItems)} من {pagination.totalItems}
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
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
        dir="rtl"
      />
    </div>
  );
}