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
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit, Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const mockSubcategories = [
  { id: 1, name: "مناشير كهربائية", category_id: 2, category_name: "الأدوات الكهربائية" },
  { id: 2, name: "مثاقب كهربائية", category_id: 2, category_name: "الأدوات الكهربائية" },
  { id: 7, name: "مفاتيح الربط", category_id: 8, category_name: "الأدوات اليدوية" },
  { id: 8, name: "مفاتيح أنابيب", category_id: 10, category_name: "مستلزمات السباكة" },
];

const mockCategories = [
  { id: 2, name: "الأدوات الكهربائية" },
  { id: 8, name: "الأدوات اليدوية" },
  { id: 9, name: "معدات التثبيت" },
  { id: 10, name: "مستلزمات السباكة" },
];

export default function Subcategories() {
  const [subcategories, setSubcategories] = useState(mockSubcategories);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const [formData, setFormData] = useState({ name: "", category_id: "" });
  const { toast } = useToast();

  const itemsPerPage = 5;
  const filteredSubcategories = subcategories.filter(subcategory =>
    subcategory.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subcategory.category_name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const totalPages = Math.ceil(filteredSubcategories.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSubcategories = filteredSubcategories.slice(startIndex, startIndex + itemsPerPage);

  const handleAdd = () => {
    if (!formData.name.trim() || !formData.category_id) return;
    
    const category = mockCategories.find(c => c.id.toString() === formData.category_id);
    const newSubcategory = {
      id: Math.max(...subcategories.map(s => s.id)) + 1,
      name: formData.name,
      category_id: parseInt(formData.category_id),
      category_name: category?.name || ""
    };
    
    setSubcategories([...subcategories, newSubcategory]);
    setFormData({ name: "", category_id: "" });
    setIsAddOpen(false);
    toast({ title: "تم إضافة الفئة الفرعية بنجاح" });
  };

  const handleEdit = (subcategory) => {
    if (!formData.name.trim() || !formData.category_id) return;
    
    const category = mockCategories.find(c => c.id.toString() === formData.category_id);
    setSubcategories(subcategories.map(s => 
      s.id === subcategory.id 
        ? { ...s, name: formData.name, category_id: parseInt(formData.category_id), category_name: category?.name || "" }
        : s
    ));
    setEditingSubcategory(null);
    setFormData({ name: "", category_id: "" });
    toast({ title: "تم تحديث الفئة الفرعية بنجاح" });
  };

  const handleDelete = (id) => {
    setSubcategories(subcategories.filter(s => s.id !== id));
    toast({ title: "تم حذف الفئة الفرعية بنجاح" });
  };

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
                    {mockCategories.map((category) => (
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
          <div className="flex justify-between items-center">
            <CardTitle>قائمة الفئات الفرعية</CardTitle>
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="البحث في الفئات الفرعية..."
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
                <TableHead className="text-right">اسم الفئة الفرعية</TableHead>
                <TableHead className="text-right">الفئة الرئيسية</TableHead>
                <TableHead className="text-right">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedSubcategories.map((subcategory) => (
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
                                  {mockCategories.map((category) => (
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
                        onClick={() => handleDelete(subcategory.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              عرض {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredSubcategories.length)} من {filteredSubcategories.length}
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