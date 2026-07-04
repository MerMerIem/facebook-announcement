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
    Edit,
    ChevronLeft,
    ChevronRight,
    MapPin,
    Truck,
    Search,
    ArrowUp,
    ArrowDown,
    ArrowUpDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/contexts/RestContext';

export default function Wilayas() {
    const { api } = useApi();

    const [wilayas, setWilayas] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [editingWilaya, setEditingWilaya] = useState(null);
    const [deliveryFee, setDeliveryFee] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [pagination, setPagination] = useState({ totalPages: 1, totalItems: 0 });
    const [stats, setStats] = useState({
        total_wilayas: 0,
        free_delivery_count: 0,
        paid_delivery_count: 0,
        avg_paid_fee: 0,
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('id');
    const [sortOrder, setSortOrder] = useState('asc');
    const [itemsPerPage, setItemsPerPage] = useState(15);

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
                `/wilaya/get?${queryParams.toString()}`
            );

            if (!error && responseCode === 200 && data) {
                setWilayas(data.wilayas || []);
                setPagination(data.pagination || { totalPages: 1, totalItems: 0 });
                if (data.stats) setStats(data.stats);
            } else {
                toast.error('فشل في تحميل الولايات');
                setWilayas([]);
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

    const handleEdit = async wilaya => {
        if (!deliveryFee.toString().trim()) return;
        try {
            const [data, _, responseCode, error] = await api.post(
                `/wilaya/modify/${wilaya.id}`,
                { delivery_fee: parseFloat(deliveryFee) }
            );
            if (!error && responseCode === 200) {
                setWilayas(wilayas.map(w =>
                    w.id === wilaya.id ? { ...w, delivery_fee: deliveryFee } : w
                ));
                setEditingWilaya(null);
                setDeliveryFee('');
                toast.success('تم تحديث رسوم التوصيل بنجاح');
                // Refresh stats
                fetchData(currentPage, debouncedSearchTerm);
            } else {
                throw new Error(error || 'Failed to update wilaya');
            }
        } catch (error) {
            toast.error('فشل في تحديث رسوم التوصيل');
        }
    };

    const formatPrice = price => {
        const num = parseFloat(price);
        return num === 0 ? 'مجاني' : `${num.toFixed(0)} د.ج`;
    };

    return (
        <div className="space-y-5" dir="rtl">
            {/* Header */}
            <div className="flex items-center gap-3">
                <MapPin className="w-7 h-7 text-primary" />
                <div>
                    <h1 className="text-2xl font-bold">إدارة الولايات</h1>
                    <p className="text-muted-foreground text-sm">إدارة رسوم التوصيل لكل ولاية</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-border p-4 rounded-none">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10">
                            <MapPin className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">إجمالي الولايات</p>
                            <p className="text-2xl font-bold">{stats.total_wilayas || pagination.totalItems || 0}</p>
                        </div>
                    </div>
                </Card>
                <Card className="border-border p-4 rounded-none">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100">
                            <Truck className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">توصيل مجاني</p>
                            <p className="text-2xl font-bold">{stats.free_delivery_count || 0}</p>
                        </div>
                    </div>
                </Card>
                <Card className="border-border p-4 rounded-none">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100">
                            <Truck className="w-5 h-5 text-orange-500" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">برسوم توصيل</p>
                            <p className="text-2xl font-bold">{stats.paid_delivery_count || 0}</p>
                        </div>
                    </div>
                </Card>
                <Card className="border-border p-4 rounded-none">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100">
                            <Truck className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">متوسط الرسوم</p>
                            <p className="text-2xl font-bold">{stats.avg_paid_fee || 0} <span className="text-sm font-normal">د.ج</span></p>
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
                        placeholder="البحث في الولايات..."
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
                    <option value="delivery_fee">ترتيب: رسوم التوصيل</option>
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
                    <option value={15}>15 / صفحة</option>
                    <option value={30}>30 / صفحة</option>
                    <option value={58}>الكل</option>
                </select>
            </div>

            {/* Table */}
            <Card className="border-border rounded-none px-8">
                <CardHeader className="pb-3 px-6 pt-4">
                    <CardTitle className="text-base font-semibold">
                        قائمة الولايات ورسوم التوصيل
                        <span className="text-muted-foreground font-normal ml-2 text-sm">
                            ({pagination.totalItems || 0} ولاية)
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
                                                اسم الولاية <SortIcon column="name" />
                                            </button>
                                        </TableHead>
                                        <TableHead className="text-right">
                                            <button onClick={() => toggleSort('delivery_fee')} className="flex items-center gap-1 hover:text-foreground transition-colors">
                                                رسوم التوصيل <SortIcon column="delivery_fee" />
                                            </button>
                                        </TableHead>
                                        <TableHead className="text-right w-28">الإجراءات</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {wilayas.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                                                {searchTerm ? 'لا توجد ولايات تطابق البحث' : 'لا توجد ولايات'}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        wilayas.map(wilaya => (
                                            <TableRow key={wilaya.id} className="border-border hover:bg-muted/50">
                                                <TableCell className="text-muted-foreground text-sm">{wilaya.id}</TableCell>
                                                <TableCell className="font-medium">{wilaya.name}</TableCell>
                                                <TableCell>
                                                    <span className={`px-2 py-0.5 text-xs font-medium border ${
                                                        parseFloat(wilaya.delivery_fee) === 0
                                                            ? 'bg-green-50 text-green-700 border-green-200'
                                                            : 'bg-orange-50 text-orange-700 border-orange-200'
                                                    }`}>
                                                        {formatPrice(wilaya.delivery_fee)}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <Dialog
                                                        open={editingWilaya?.id === wilaya.id}
                                                        onOpenChange={open => {
                                                            if (!open) { setEditingWilaya(null); setDeliveryFee(''); }
                                                        }}
                                                    >
                                                        <DialogTrigger asChild>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="rounded-none border-border h-7 gap-1.5 px-2 text-xs"
                                                                onClick={() => { setEditingWilaya(wilaya); setDeliveryFee(wilaya.delivery_fee); }}
                                                            >
                                                                <Edit className="w-3 h-3" />
                                                                تعديل
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent dir="rtl" className="admin-app rounded-none">
                                                            <DialogHeader className="pt-5">
                                                                <DialogTitle className="text-right">
                                                                    تعديل رسوم التوصيل - {wilaya.name}
                                                                </DialogTitle>
                                                            </DialogHeader>
                                                            <div className="space-y-4">
                                                                <div className="text-right">
                                                                    <Label htmlFor="delivery-fee">رسوم التوصيل (د.ج)</Label>
                                                                    <Input
                                                                        id="delivery-fee"
                                                                        type="number"
                                                                        min="0"
                                                                        step="0.01"
                                                                        value={deliveryFee}
                                                                        onChange={e => setDeliveryFee(e.target.value)}
                                                                        placeholder="0.00"
                                                                        className="text-right rounded-none"
                                                                        dir="rtl"
                                                                        onKeyDown={e => e.key === 'Enter' && handleEdit(wilaya)}
                                                                    />
                                                                    <p className="text-xs text-muted-foreground mt-1">أدخل 0 للتوصيل المجاني</p>
                                                                </div>
                                                                <Button onClick={() => handleEdit(wilaya)} className="w-full rounded-none">
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
        </div>
    );
}
