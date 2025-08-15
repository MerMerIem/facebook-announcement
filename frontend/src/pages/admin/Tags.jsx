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
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight, ChevronDown, Tag, Search } from "lucide-react";
import { toast } from "sonner"; // Changed to sonner
import { useApi } from "@/contexts/RestContext";
import ConfirmationDialog from "@/components/ConfirmationDialog";

export default function Tags() {
  const { api } = useApi();
  
  const [tags, setTags] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [tagName, setTagName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    totalPages: 1,
    totalItems: 0,
  });
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    tag: null,
    isLoading: false
  });
  const [itemsPerPage, setItemsPerPage] = useState(8);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Fetch data function with query parameters (page, limit, search)
  const fetchData = async (page = 1, search = "") => {
    setIsLoading(true);

    try {
      // Build query parameters
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
      });

      // Use the debounced search term for server-side search
      if (search) {
        queryParams.append("search", search);
      }

      const [data, _, responseCode, error] = await api.get(
        `/tag/getAll?${queryParams.toString()}`
      );

      if (!error && responseCode === 200 && data) {
        setTags(data.tags || []);
        setPagination(data.pagination || { totalPages: 1, totalItems: 0 });
      } else {
        console.error("Error fetching tags:", error || "No data returned");
        toast.error("خطأ", {
          description: "فشل في تحميل العلامات",
          duration: 4000,
          style: {
            background: "#ef4444",
            color: "#ffffff",
            direction: "rtl",
            textAlign: "right",
          },
        });
        setTags([]);
        setPagination({ totalPages: 1, totalItems: 0 });
      }
    } catch (err) {
      console.error("Unexpected error fetching tags:", err);
      toast.error("خطأ", {
        description: "حدث خطأ غير متوقع أثناء تحميل العلامات", 
        duration: 4000,
        style: {
          background: "#ef4444",
          color: "#ffffff",
          direction: "rtl",
          textAlign: "right",
        },
      });
      setTags([]);
      setPagination({ totalPages: 1, totalItems: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  // Main useEffect hook to fetch data
  useEffect(() => {
    const searchTimeout = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(searchTimeout);
  }, [searchTerm]);

  useEffect(() => {
    fetchData(currentPage, debouncedSearchTerm);
  }, [currentPage, itemsPerPage, debouncedSearchTerm]);

  // Handle page change
  const handlePageChange = (page) => {
    if (page < 1 || page > (pagination?.totalPages || 1)) return;
    setCurrentPage(page);
  };

  const handleAdd = async () => {
    if (!tagName.trim()) return;
    
    try {
      const [data, _, responseCode, error] = await api.post('/tag/add', {
        name: tagName
      });

      if (!error && responseCode === 201) {
        // Refresh data after successful creation
        await fetchData(currentPage);
        setTagName("");
        setIsAddOpen(false);
        toast.success("تم إضافة العلامة بنجاح", {
          duration: 3000,
          style: {
            background: "#22c55e",
            color: "#ffffff",
            direction: "rtl",
            textAlign: "right",
          },
        });
      } else {
        throw new Error(error || "Failed to create tag");
      }
    } catch (error) {
      console.error("Error creating tag:", error);
      toast.error("خطأ", {
        description: "فشل في إضافة العلامة",
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

  const handleEdit = async (tag) => {
    console.log("tag",tag)
    if (!tagName.trim()) return;
    
    try {
      const [data, _, responseCode, error] = await api.post(`/tag/modify/${tag.id}`, {
        name: tagName
      });

      if (!error && responseCode === 200) {
        // Update local state
        setTags(tags.map(t => 
          t.id === tag.id 
            ? { ...t, name: tagName }
            : t
        ));
        setEditingTag(null);
        setTagName("");
        toast.success("تم تحديث العلامة بنجاح", {
          duration: 3000,
          style: {
            background: "#22c55e",
            color: "#ffffff", 
            direction: "rtl",
            textAlign: "right",
          },
        });
      } else {
        throw new Error(error || "Failed to update tag");
      }
    } catch (error) {
      console.error("Error updating tag:", error);
      toast.error("خطأ", {
        description: "فشل في تحديث العلامة",
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

  const handleDelete = async () => {
    if (!deleteConfirmation.tag) return;
    
    setDeleteConfirmation(prev => ({ ...prev, isLoading: true }));
    
    try {
      const [data, _, responseCode, error] = await api.delete(`/tag/delete/${deleteConfirmation.tag.id}`);

      if (!error && responseCode === 200) {
        await fetchData(currentPage);
        toast.success("تم حذف العلامة بنجاح", {
          duration: 3000,
          style: {
            background: "#22c55e",
            color: "#ffffff",
            direction: "rtl", 
            textAlign: "right",
          },
        });
        setDeleteConfirmation({ isOpen: false, tag: null, isLoading: false });
      } else {
        throw new Error(error || "Failed to delete tag");
      }
    } catch (error) {
      console.error("Error deleting tag:", error);
      toast.error("خطأ", {
        description: "فشل في حذف العلامة",
        duration: 4000,
        style: {
          background: "#ef4444",
          color: "#ffffff",
          direction: "rtl",
          textAlign: "right",
        },
      });
      setDeleteConfirmation(prev => ({ ...prev, isLoading: false }));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Tag className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">إدارة العلامات</h1>
              <p className="text-muted-foreground">إدارة علامات المنتجات والتصنيفات</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">جاري تحميل العلامات...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Tag className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">إدارة العلامات</h1>
            <p className="text-muted-foreground">إدارة علامات المنتجات والتصنيفات</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="البحث في العلامات..."
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

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                إضافة علامة جديدة
              </Button>
            </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-right">إضافة علامة جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-right">
                <Label htmlFor="name">اسم العلامة</Label>
                <Input
                  id="name"
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  placeholder="أدخل اسم العلامة"
                />
              </div>
              <Button onClick={handleAdd} className="w-full">
                إضافة
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>قائمة العلامات ({pagination.total || 0})</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الرقم</TableHead>
                <TableHead className="text-right">اسم العلامة</TableHead>
                <TableHead className="text-right">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tags.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8">
                    <div className="text-muted-foreground">
                      {searchTerm ? "لا توجد علامات تطابق البحث" : "لا توجد علامات"}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                tags.map((tag) => (
                  <TableRow key={tag.id}>
                    <TableCell>{tag.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-primary" />
                        <span className="font-medium">{tag.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog open={editingTag?.id === tag.id} onOpenChange={(open) => {
                          if (!open) {
                            setEditingTag(null);
                            setTagName("");
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingTag(tag);
                                setTagName(tag.name);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent dir="rtl">
                            <DialogHeader>
                              <DialogTitle className="text-right">تعديل العلامة</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="text-right">
                                <Label htmlFor="edit-name">اسم العلامة</Label>
                                <Input
                                  id="edit-name"
                                  value={tagName}
                                  onChange={(e) => setTagName(e.target.value)}
                                />
                              </div>
                              <Button onClick={() => handleEdit(tag)} className="w-full">
                                تحديث
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteConfirmation({ isOpen: true, tag, isLoading: false })}
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
                    • المجموع: {pagination.totalItems} علامة
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

      <ConfirmationDialog
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, tag: null, isLoading: false })}
        onConfirm={handleDelete}
        title="تأكيد حذف العلامة"
        message={`هل أنت متأكد من أنك تريد حذف العلامة "${deleteConfirmation.tag?.name}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        isLoading={deleteConfirmation.isLoading}
      />
    </div>
  );
}