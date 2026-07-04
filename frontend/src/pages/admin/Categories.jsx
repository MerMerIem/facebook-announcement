import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Plus,
    Edit,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Search,
    Tag,
    Package,
    ArrowUp,
    ArrowDown,
    ArrowUpDown,
    Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/contexts/RestContext';
import ConfirmationDialog from '@/components/ConfirmationDialog';

export default function Categories() {
    const { api } = useApi();

    const [categories, setCategories] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [pagination, setPagination] = useState({ totalPages: 1, totalItems: 0 });
    const [deleteConfirmation, setDeleteConfirmation] = useState({
        isOpen: false,
        category: null,
        isLoading: false,
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [sortBy, setSortBy] = useState('id');
    const [sortOrder, setSortOrder] = useState('asc');

    const fetchData = async (page = 1, search = '') => {
        setIsLoading(true);
        try {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: itemsPerPage.toString(),
                sortBy,
                sortOrder,
            });
            if (search.trim()) queryParams.append('search', search);

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
                toast.error('فشل في تحميل الفئات');
                setCategories([]);
                setPagination({ totalPages: 1, totalItems: 0 });
            }
        } catch (err) {
            console.error(err);
            toast.error('حدث خطأ غير متوقع');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
        return () => clearTimeout(t);
    }, [searchTerm]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchTerm, sortBy, sortOrder, itemsPerPage]);

    useEffect(() => {
        fetchData(currentPage, debouncedSearchTerm);
    }, [currentPage, itemsPerPage, debouncedSearchTerm, sortBy, sortOrder]);

    const handlePageChange = page => {
        if (page < 1 || page > (pagination?.totalPages || 1)) return;
        setCurrentPage(page);
    };

    const toggleSort = column => {
        if (sortBy === column) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('asc');
        }
    };

    const SortIcon = ({ column }) => {
        if (sortBy !== column) return <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />;
        return sortOrder === 'asc'
            ? <ArrowUp className="w-3.5 h-3.5 text-primary" />
            : <ArrowDown className="w-3.5 h-3.5 text-primary" />;
    };

    const handleAdd = async () => {
        if (!newCategoryName.trim()) return;
        try {
            const [data, _, responseCode, error] = await api.post('/category/add', { name: newCategoryName });
            if (!error && responseCode === 201) {
                setNewCategoryName('');
                setIsAddOpen(false);
                fetchData(currentPage);
                toast.success('تم إضافة الفئة بنجاح');
            } else {
                throw new Error(error || 'Failed to add category');
            }
        } catch (error) {
            toast.error('فشل في إضافة الفئة');
        }
    };

    const handleEdit = async category => {
        if (!newCategoryName.trim()) return;
        try {
            const [data, _, responseCode, error] = await api.post(
                `/category/modify/${category.id}`,
                { name: newCategoryName }
            );
            if (!error && responseCode === 200) {
                setEditingCategory(null);
                setNewCategoryName('');
                fetchData(currentPage);
                toast.success('تم تحديث الفئة بنجاح');
            } else {
                throw new Error(error || 'Failed to update category');
            }
        } catch (error) {
            toast.error('فشل في تحديث الفئة');
        }
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
                toast.success('تم حذف الفئة بنجاح');
            } else {
                throw new Error(error || 'Failed to delete category');
            }
        } catch (error) {
            toast.error('فشل في حذف الفئة');
        } finally {
            setDeleteConfirmation({ isOpen: false, category: null, isLoading: false });
        }
    };

    const totalSubcategories = categories.reduce((sum, cat) => sum + (cat.subcategory_count || 0), 0);
    const totalProducts = categories.reduce((sum, cat) => sum + (cat.product_count || 0), 0);

    return (
        <div className="space-y-5" dir="rtl">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Layers className="w-7 h-7 text-primary" />
                <div>
                    <h1 className="text-2xl font-bold">إدارة الفئات الرئيسية</h1>
                    <p className="text-muted-foreground text-sm">إدارة فئات المنتجات وتصنيفاتها</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <Card className="border-border p-4 rounded-none">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100">
                            <Layers className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">إجمالي الفئات</p>
                            <p className="text-2xl font-bold">{pagination.totalItems || 0}</p>
                        </div>
                    </div>
                </Card>
                <Card className="border-border p-4 rounded-none">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100">
                            <Tag className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">الفئات الفرعية</p>
                            <p className="text-2xl font-bold">{totalSubcategories}</p>
                        </div>
                    </div>
                </Card>
                <Card className="border-border p-4 rounded-none">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100">
                            <Package className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">إجمالي المنتجات</p>
                            <p className="text-2xl font-bold">{totalProducts}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
                    <Input
                        placeholder="البحث في الفئات..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="pr-10 text-right rounded-none border-border"
                        dir="rtl"
                    />
                </div>

                {/* Sort By */}
                <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    className="h-9 px-3 text-sm border border-border bg-background text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary rounded-none"
                >
                    <option value="id">ترتيب: رقم</option>
                    <option value="name">ترتيب: الاسم</option>
                    <option value="product_count">ترتيب: المنتجات</option>
                    <option value="subcategory_count">ترتيب: الفئات الفرعية</option>
                </select>

                {/* Sort Order */}
                <button
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="h-9 px-3 border border-border bg-background text-foreground text-sm flex items-center gap-1.5 hover:bg-muted transition-colors rounded-none"
                >
                    {sortOrder === 'asc' ? (
                        <><ArrowUp className="w-4 h-4" /> تصاعدي</>
                    ) : (
                        <><ArrowDown className="w-4 h-4" /> تنازلي</>
                    )}
                </button>

                {/* Items per page */}
                <select
                    value={itemsPerPage}
                    onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    className="h-9 px-3 text-sm border border-border bg-background text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary rounded-none"
                >
                    <option value={10}>10 / صفحة</option>
                    <option value={20}>20 / صفحة</option>
                    <option value={30}>30 / صفحة</option>
                    <option value={50}>50 / صفحة</option>
                </select>

                {/* Add Button */}
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2 rounded-none h-9" size="sm">
                            <Plus className="w-4 h-4" />
                            إضافة فئة
                        </Button>
                    </DialogTrigger>
                    <DialogContent dir="rtl" className="admin-app rounded-none">
                        <DialogHeader className="pt-5">
                            <DialogTitle className="text-right">إضافة فئة جديدة</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="text-right">
                                <Label htmlFor="name" className="text-right block">اسم الفئة</Label>
                                <Input
                                    id="name"
                                    value={newCategoryName}
                                    onChange={e => setNewCategoryName(e.target.value)}
                                    placeholder="أدخل اسم الفئة"
                                    className="text-right rounded-none"
                                    dir="rtl"
                                    onKeyDown={e => e.key === 'Enter' && handleAdd()}
                                />
                            </div>
                            <Button onClick={handleAdd} className="w-full rounded-none">إضافة</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Table */}
            <Card className="border-border rounded-none px-8">
                <CardHeader className="pb-3 px-6 pt-4">
                    <CardTitle className="text-base font-semibold">
                        قائمة الفئات
                        <span className="text-muted-foreground font-normal ml-2 text-sm">
                            ({pagination.totalItems || 0} فئة)
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-48">
                            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table className="min-w-full">
                                <TableHeader>
                                    <TableRow className="border-border">
                                        <TableHead className="text-right w-16">
                                            <button onClick={() => toggleSort('id')} className="flex items-center gap-1 hover:text-foreground transition-colors">
                                                # <SortIcon column="id" />
                                            </button>
                                        </TableHead>
                                        <TableHead className="text-right">
                                            <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-foreground transition-colors">
                                                اسم الفئة <SortIcon column="name" />
                                            </button>
                                        </TableHead>
                                        <TableHead className="text-right">
                                            <button onClick={() => toggleSort('subcategory_count')} className="flex items-center gap-1 hover:text-foreground transition-colors">
                                                الفئات الفرعية <SortIcon column="subcategory_count" />
                                            </button>
                                        </TableHead>
                                        <TableHead className="text-right">
                                            <button onClick={() => toggleSort('product_count')} className="flex items-center gap-1 hover:text-foreground transition-colors">
                                                المنتجات <SortIcon column="product_count" />
                                            </button>
                                        </TableHead>
                                        <TableHead className="text-right w-28">الإجراءات</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {categories.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                                {searchTerm ? 'لا توجد فئات تطابق البحث' : 'لا توجد فئات'}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        categories.map(category => (
                                            <TableRow key={category.id} className="border-border hover:bg-muted/50">
                                                <TableCell className="text-muted-foreground text-sm">{category.id}</TableCell>
                                                <TableCell className="font-medium">{category.name}</TableCell>
                                                <TableCell>
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                                        <Tag className="w-3 h-3" />
                                                        {category.subcategory_count || 0}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                                                        <Package className="w-3 h-3" />
                                                        {category.product_count || 0}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-1.5">
                                                        <Dialog
                                                            open={editingCategory?.id === category.id}
                                                            onOpenChange={open => {
                                                                if (!open) { setEditingCategory(null); setNewCategoryName(''); }
                                                            }}
                                                        >
                                                            <DialogTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="rounded-none border-border h-7 w-7 p-0"
                                                                    onClick={() => { setEditingCategory(category); setNewCategoryName(category.name); }}
                                                                >
                                                                    <Edit className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent dir="rtl" className="admin-app rounded-none">
                                                                <DialogHeader className="pt-5">
                                                                    <DialogTitle className="text-right">تعديل الفئة</DialogTitle>
                                                                </DialogHeader>
                                                                <div className="space-y-4">
                                                                    <div className="text-right">
                                                                        <Label htmlFor="edit-name" className="text-right block">اسم الفئة</Label>
                                                                        <Input
                                                                            id="edit-name"
                                                                            value={newCategoryName}
                                                                            onChange={e => setNewCategoryName(e.target.value)}
                                                                            className="text-right rounded-none"
                                                                            dir="rtl"
                                                                            onKeyDown={e => e.key === 'Enter' && handleEdit(category)}
                                                                        />
                                                                    </div>
                                                                    <Button onClick={() => handleEdit(category)} className="w-full rounded-none">تحديث</Button>
                                                                </div>
                                                            </DialogContent>
                                                        </Dialog>

                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            className="rounded-none h-7 w-7 p-0"
                                                            onClick={() => setDeleteConfirmation({ isOpen: true, category, isLoading: false })}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between gap-4 p-4 border-t border-border">
                            <p className="text-sm text-muted-foreground">
                                صفحة {currentPage} من {pagination.totalPages} • المجموع: {pagination.totalItems || 0}
                            </p>
                            <div className="flex gap-1">
                                <Button variant="outline" size="sm" onClick={() => handlePageChange(1)} disabled={currentPage === 1} className="rounded-none h-8 px-3">الأولى</Button>
                                <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="rounded-none h-8 w-8 p-0">
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                                <span className="px-3 py-1 bg-muted text-sm flex items-center">{currentPage}/{pagination.totalPages}</span>
                                <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === pagination.totalPages} className="rounded-none h-8 w-8 p-0">
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.totalPages)} disabled={currentPage === pagination.totalPages} className="rounded-none h-8 px-3">الأخيرة</Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <ConfirmationDialog
                isOpen={deleteConfirmation.isOpen}
                onClose={() => setDeleteConfirmation({ isOpen: false, category: null, isLoading: false })}
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
