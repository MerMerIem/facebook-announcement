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
    Plus,
    Edit,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Tag,
    Search,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Package,
    Hash,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/contexts/RestContext';
import ConfirmationDialog from '@/components/ConfirmationDialog';

export default function Tags() {
    const { api } = useApi();

    const [tags, setTags] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingTag, setEditingTag] = useState(null);
    const [tagName, setTagName] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });
    const [stats, setStats] = useState({ total_tags: 0, total_tagged_products: 0 });
    const [deleteConfirmation, setDeleteConfirmation] = useState({
        isOpen: false,
        tag: null,
        isLoading: false,
    });
    const [itemsPerPage, setItemsPerPage] = useState(8);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
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
            if (search) queryParams.append('search', search);

            const [data, _, responseCode, error] = await api.get(
                `/tag/getAll?${queryParams.toString()}`
            );

            if (!error && responseCode === 200 && data) {
                setTags(data.tags || []);
                setPagination(data.pagination || { totalPages: 1, total: 0 });
                if (data.stats) setStats(data.stats);
            } else {
                toast.error('فشل في تحميل العلامات');
                setTags([]);
                setPagination({ totalPages: 1, total: 0 });
            }
        } catch (err) {
            console.error(err);
            toast.error('حدث خطأ غير متوقع');
            setTags([]);
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

    const toggleSort = (column) => {
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
        if (!tagName.trim()) return;
        try {
            const [data, _, responseCode, error] = await api.post('/tag/add', { name: tagName });
            if (!error && responseCode === 201) {
                await fetchData(currentPage);
                setTagName('');
                setIsAddOpen(false);
                toast.success('تم إضافة العلامة بنجاح');
            } else {
                throw new Error(error || 'Failed to create tag');
            }
        } catch (error) {
            toast.error('فشل في إضافة العلامة');
        }
    };

    const handleEdit = async tag => {
        if (!tagName.trim()) return;
        try {
            const [data, _, responseCode, error] = await api.post(`/tag/modify/${tag.id}`, { name: tagName });
            if (!error && responseCode === 200) {
                setTags(tags.map(t => t.id === tag.id ? { ...t, name: tagName } : t));
                setEditingTag(null);
                setTagName('');
                toast.success('تم تحديث العلامة بنجاح');
            } else {
                throw new Error(error || 'Failed to update tag');
            }
        } catch (error) {
            toast.error('فشل في تحديث العلامة');
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirmation.tag) return;
        setDeleteConfirmation(prev => ({ ...prev, isLoading: true }));
        try {
            const [data, _, responseCode, error] = await api.delete(`/tag/delete/${deleteConfirmation.tag.id}`);
            if (!error && responseCode === 200) {
                await fetchData(currentPage);
                toast.success('تم حذف العلامة بنجاح');
                setDeleteConfirmation({ isOpen: false, tag: null, isLoading: false });
            } else {
                throw new Error(error || 'Failed to delete tag');
            }
        } catch (error) {
            toast.error('فشل في حذف العلامة');
            setDeleteConfirmation(prev => ({ ...prev, isLoading: false }));
        }
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Tag className="w-7 h-7 text-primary" />
                <div>
                    <h1 className="text-2xl font-bold">إدارة العلامات</h1>
                    <p className="text-muted-foreground text-sm">إدارة علامات المنتجات والتصنيفات</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
                <Card className="border-border p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10">
                            <Hash className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">إجمالي العلامات</p>
                            <p className="text-2xl font-bold">{stats.total_tags || pagination.total || 0}</p>
                        </div>
                    </div>
                </Card>
                <Card className="border-border p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100">
                            <Package className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">منتجات موسومة</p>
                            <p className="text-2xl font-bold">{stats.total_tagged_products || 0}</p>
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
                        placeholder="البحث في العلامات..."
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
                    <option value="product_count">ترتيب: عدد المنتجات</option>
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
                    <option value={8}>8 / صفحة</option>
                    <option value={16}>16 / صفحة</option>
                    <option value={24}>24 / صفحة</option>
                    <option value={32}>32 / صفحة</option>
                    <option value={50}>50 / صفحة</option>
                </select>

                {/* Add Button */}
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2 rounded-none h-9" size="sm">
                            <Plus className="w-4 h-4" />
                            إضافة علامة
                        </Button>
                    </DialogTrigger>
                    <DialogContent dir="rtl" className="admin-app border-0 rounded-none">
                        <DialogHeader className="pt-5">
                            <DialogTitle className="text-right">إضافة علامة جديدة</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="text-right">
                                <Label htmlFor="name">اسم العلامة</Label>
                                <Input
                                    id="name"
                                    value={tagName}
                                    onChange={e => setTagName(e.target.value)}
                                    placeholder="أدخل اسم العلامة"
                                    className="rounded-none"
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
                        قائمة العلامات
                        <span className="text-muted-foreground font-normal ml-2 text-sm">
                            ({pagination.total || 0} علامة)
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
                                                اسم العلامة <SortIcon column="name" />
                                            </button>
                                        </TableHead>
                                        <TableHead className="text-right">
                                            <button onClick={() => toggleSort('product_count')} className="flex items-center gap-1 hover:text-foreground transition-colors">
                                                عدد المنتجات <SortIcon column="product_count" />
                                            </button>
                                        </TableHead>
                                        <TableHead className="text-right w-28">الإجراءات</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tags.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                                                {searchTerm ? 'لا توجد علامات تطابق البحث' : 'لا توجد علامات'}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        tags.map(tag => (
                                            <TableRow key={tag.id} className="border-border hover:bg-muted/50">
                                                <TableCell className="text-muted-foreground text-sm">{tag.id}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Tag className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                                        <span className="font-medium">{tag.name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                                                        <Package className="w-3 h-3" />
                                                        {tag.product_count || 0}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-1.5">
                                                        <Dialog
                                                            open={editingTag?.id === tag.id}
                                                            onOpenChange={open => {
                                                                if (!open) { setEditingTag(null); setTagName(''); }
                                                            }}
                                                        >
                                                            <DialogTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="rounded-none border-border h-7 w-7 p-0"
                                                                    onClick={() => { setEditingTag(tag); setTagName(tag.name); }}
                                                                >
                                                                    <Edit className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent dir="rtl" className="admin-app rounded-none">
                                                                <DialogHeader className="pt-5">
                                                                    <DialogTitle className="text-right">تعديل العلامة</DialogTitle>
                                                                </DialogHeader>
                                                                <div className="space-y-4">
                                                                    <div className="text-right">
                                                                        <Label htmlFor="edit-name" className="py-5">اسم العلامة</Label>
                                                                        <Input
                                                                            id="edit-name"
                                                                            value={tagName}
                                                                            onChange={e => setTagName(e.target.value)}
                                                                            className="rounded-none"
                                                                            onKeyDown={e => e.key === 'Enter' && handleEdit(tag)}
                                                                        />
                                                                    </div>
                                                                    <Button onClick={() => handleEdit(tag)} className="w-full rounded-none">تحديث</Button>
                                                                </div>
                                                            </DialogContent>
                                                        </Dialog>

                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            className="rounded-none h-7 w-7 p-0"
                                                            onClick={() => setDeleteConfirmation({ isOpen: true, tag, isLoading: false })}
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
                onClose={() => setDeleteConfirmation({ isOpen: false, tag: null, isLoading: false })}
                onConfirm={handleDelete}
                title="تأكيد حذف العلامة"
                message={`هل أنت متأكد من أنك تريد حذف العلامة "${deleteConfirmation.tag?.name}"؟ لا يمكن التراجع عن هذا الإجراء.`}
                isLoading={deleteConfirmation.isLoading}
            />
        </div>
    );
}
