import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Plus,
    Edit,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Tag,
    Search,
    Package,
    ArrowUp,
    ArrowDown,
    ArrowUpDown,
    Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/contexts/RestContext';
import ConfirmationDialog from '@/components/ConfirmationDialog';

export default function Subcategories() {
    const { api } = useApi();

    const [subcategories, setSubcategories] = useState([]);
    const [categories, setCategories] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingSubcategory, setEditingSubcategory] = useState(null);
    const [formData, setFormData] = useState({ name: '', category_id: '' });
    const [isLoading, setIsLoading] = useState(true);
    const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });
    const [deleteConfirmation, setDeleteConfirmation] = useState({
        isOpen: false,
        subcategory: null,
        isLoading: false,
    });
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('id');
    const [sortOrder, setSortOrder] = useState('asc');

    const fetchData = async (page = 1, search = '') => {
        setIsLoading(true);
        try {
            const subcatsQuery = new URLSearchParams({
                page: page.toString(),
                limit: itemsPerPage.toString(),
                sortBy,
                sortOrder,
            });
            if (search.trim()) subcatsQuery.append('search', search);

            const [subcatsData, _, subcatsCode, subcatsError] = await api.get(
                `/subcategory/getAll?${subcatsQuery.toString()}`
            );
            const [catsData, __, catsCode, catsError] = await api.get('/category/getAll?limit=200');

            if (!subcatsError && subcatsCode === 200 && subcatsData && !catsError && catsCode === 200 && catsData) {
                setSubcategories(subcatsData.subcategories || []);
                setCategories(catsData.categories || []);
                setPagination(subcatsData.pagination || { totalPages: 1, total: 0 });
            } else {
                throw new Error(subcatsError || catsError || 'Failed to fetch data');
            }
        } catch (err) {
            console.error(err);
            toast.error('فشل في تحميل البيانات');
            setSubcategories([]);
            setCategories([]);
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
        if (!formData.name.trim() || !formData.category_id) return;
        try {
            const [data, _, responseCode, error] = await api.post('/subcategory/add', {
                name: formData.name,
                categoryId: parseInt(formData.category_id),
            });
            if (!error && responseCode === 201) {
                setFormData({ name: '', category_id: '' });
                setIsAddOpen(false);
                fetchData(currentPage);
                toast.success('تم إضافة الفئة الفرعية بنجاح');
            } else {
                throw new Error(error || 'Failed to add subcategory');
            }
        } catch (error) {
            toast.error('فشل في إضافة الفئة الفرعية');
        }
    };

    const handleEdit = async subcategory => {
        if (!formData.name.trim() || !formData.category_id) return;
        try {
            const [data, _, responseCode, error] = await api.post(
                `/subcategory/modify/${subcategory.id}`,
                { name: formData.name, category_id: parseInt(formData.category_id) }
            );
            if (!error && responseCode === 200) {
                setEditingSubcategory(null);
                setFormData({ name: '', category_id: '' });
                fetchData(currentPage);
                toast.success('تم تحديث الفئة الفرعية بنجاح');
            } else {
                throw new Error(error || 'Failed to update subcategory');
            }
        } catch (error) {
            toast.error('فشل في تحديث الفئة الفرعية');
        }
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
                toast.success('تم حذف الفئة الفرعية بنجاح');
            } else {
                throw new Error(error || 'Failed to delete subcategory');
            }
        } catch (error) {
            toast.error('فشل في حذف الفئة الفرعية');
        } finally {
            setDeleteConfirmation({ isOpen: false, subcategory: null, isLoading: false });
        }
    };

    const totalProducts = subcategories.reduce((sum, sub) => sum + (sub.product_count || 0), 0);
    const uniqueCategories = new Set(subcategories.map(sub => sub.category_id)).size;

    return (
        <div className="space-y-5" dir="rtl">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Tag className="w-7 h-7 text-primary" />
                <div>
                    <h1 className="text-2xl font-bold">إدارة الفئات الفرعية</h1>
                    <p className="text-muted-foreground text-sm">إدارة الفئات الفرعية ومنتجاتها</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <Card className="border-border p-4 rounded-none">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100">
                            <Tag className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">الفئات الفرعية</p>
                            <p className="text-2xl font-bold">{pagination.total || 0}</p>
                        </div>
                    </div>
                </Card>
                <Card className="border-border p-4 rounded-none">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100">
                            <Layers className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">الفئات الرئيسية</p>
                            <p className="text-2xl font-bold">{uniqueCategories}</p>
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
                        placeholder="البحث في الفئات الفرعية..."
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
                    <option value="category_name">ترتيب: الفئة الرئيسية</option>
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
                            إضافة فئة فرعية
                        </Button>
                    </DialogTrigger>
                    <DialogContent dir="rtl" className="admin-app rounded-none">
                        <DialogHeader className="pt-5">
                            <DialogTitle className="text-right">إضافة فئة فرعية جديدة</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="text-right">
                                <Label htmlFor="name">اسم الفئة الفرعية</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="أدخل اسم الفئة الفرعية"
                                    className="text-right rounded-none"
                                    dir="rtl"
                                />
                            </div>
                            <div className="text-right">
                                <Label htmlFor="category">الفئة الرئيسية</Label>
                                <Select
                                    value={formData.category_id}
                                    onValueChange={value => setFormData({ ...formData, category_id: value })}
                                >
                                    <SelectTrigger className="rounded-none">
                                        <SelectValue placeholder="اختر الفئة الرئيسية" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-none">
                                        {categories.map(category => (
                                            <SelectItem key={category.id} value={category.id.toString()}>
                                                {category.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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
                        قائمة الفئات الفرعية
                        <span className="text-muted-foreground font-normal ml-2 text-sm">
                            ({pagination.total || 0} فئة فرعية)
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
                                                اسم الفئة الفرعية <SortIcon column="name" />
                                            </button>
                                        </TableHead>
                                        <TableHead className="text-right">
                                            <button onClick={() => toggleSort('category_name')} className="flex items-center gap-1 hover:text-foreground transition-colors">
                                                الفئة الرئيسية <SortIcon column="category_name" />
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
                                    {subcategories.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                                {searchTerm ? 'لا توجد فئات فرعية تطابق البحث' : 'لا توجد فئات فرعية'}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        subcategories.map(subcategory => (
                                            <TableRow key={subcategory.id} className="border-border hover:bg-muted/50">
                                                <TableCell className="text-muted-foreground text-sm">{subcategory.id}</TableCell>
                                                <TableCell className="font-medium">{subcategory.name}</TableCell>
                                                <TableCell>
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                                        <Layers className="w-3 h-3" />
                                                        {subcategory.category_name}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                                                        <Package className="w-3 h-3" />
                                                        {subcategory.product_count || 0}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-1.5">
                                                        <Dialog
                                                            open={editingSubcategory?.id === subcategory.id}
                                                            onOpenChange={open => {
                                                                if (!open) { setEditingSubcategory(null); setFormData({ name: '', category_id: '' }); }
                                                            }}
                                                        >
                                                            <DialogTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="rounded-none border-border h-7 w-7 p-0"
                                                                    onClick={() => {
                                                                        setEditingSubcategory(subcategory);
                                                                        setFormData({ name: subcategory.name, category_id: subcategory.category_id.toString() });
                                                                    }}
                                                                >
                                                                    <Edit className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent dir="rtl" className="admin-app rounded-none">
                                                                <DialogHeader className="pt-5">
                                                                    <DialogTitle className="text-right">تعديل الفئة الفرعية</DialogTitle>
                                                                </DialogHeader>
                                                                <div className="space-y-4">
                                                                    <div className="text-right">
                                                                        <Label htmlFor="edit-name">اسم الفئة الفرعية</Label>
                                                                        <Input
                                                                            id="edit-name"
                                                                            value={formData.name}
                                                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                                            className="text-right rounded-none"
                                                                            dir="rtl"
                                                                        />
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <Label htmlFor="edit-category">الفئة الرئيسية</Label>
                                                                        <Select
                                                                            value={formData.category_id}
                                                                            onValueChange={value => setFormData({ ...formData, category_id: value })}
                                                                        >
                                                                            <SelectTrigger className="rounded-none">
                                                                                <SelectValue />
                                                                            </SelectTrigger>
                                                                            <SelectContent className="rounded-none">
                                                                                {categories.map(category => (
                                                                                    <SelectItem key={category.id} value={category.id.toString()}>
                                                                                        {category.name}
                                                                                    </SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                    <Button onClick={() => handleEdit(subcategory)} className="w-full rounded-none">تحديث</Button>
                                                                </div>
                                                            </DialogContent>
                                                        </Dialog>

                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            className="rounded-none h-7 w-7 p-0"
                                                            onClick={() => setDeleteConfirmation({ isOpen: true, subcategory, isLoading: false })}
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
                                صفحة {currentPage} من {pagination.totalPages} • المجموع: {pagination.total || 0}
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
                onClose={() => setDeleteConfirmation({ isOpen: false, subcategory: null, isLoading: false })}
                onConfirm={handleDeleteConfirm}
                title="تأكيد حذف الفئة الفرعية"
                message={`هل أنت متأكد من أنك تريد حذف الفئة الفرعية "${deleteConfirmation.subcategory?.name}"؟`}
                isLoading={deleteConfirmation.isLoading}
                confirmText="حذف"
                cancelText="إلغاء"
                dir="rtl"
            />
        </div>
    );
}
