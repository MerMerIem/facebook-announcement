/* eslint-disable react/prop-types */
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Search,
    Eye,
    Trash2,
    Package,
    Filter,
    ChevronDown,
    MoreHorizontal,
    X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/contexts/RestContext';
import ConfirmationDialog from '@/components/ConfirmationDialog';

// Status constants to ensure consistency
const ORDER_STATUS = {
    PENDING: 'في الانتظار',
    CONFIRMED: 'مؤكد',
    DELIVERED: 'تم التسليم',
    CANCELLED: 'ملغى',
};

export default function Orders() {
    const { api } = useApi();
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [orderToDelete, setOrderToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [ordersList, setOrdersList] = useState([]);
    const [pagination, setPagination] = useState({
        totalPages: 1,
        totalItems: 0,
    });

    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [debouncedStatusFilter, setDebouncedStatusFilter] = useState('');

    useEffect(() => {
        const searchTimeout = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500);

        return () => clearTimeout(searchTimeout);
    }, [searchTerm]);

    useEffect(() => {
        const statusTimeout = setTimeout(() => {
            setDebouncedStatusFilter(statusFilter);
        }, 300);

        return () => clearTimeout(statusTimeout);
    }, [statusFilter]);

    const fetchData = async (page = 1, status = '', search = '') => {
        setIsLoading(true);

        try {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: itemsPerPage.toString(),
            });

            if (status) {
                queryParams.append('status', status);
            }

            if (search) {
                queryParams.append('search', search);
            }

            const [data, _, responseCode, error] = await api.get(
                `/order/getAll?${queryParams.toString()}`
            );

            if (!error && responseCode === 200 && data) {
                setOrdersList(data.orders || []);
                setPagination(
                    data.pagination || { totalPages: 1, totalItems: 0 }
                );
            } else {
                console.error(
                    'Error fetching orders:',
                    error || 'No data returned'
                );
                toast.error('فشل في تحميل الطلبات', {
                    description: 'حدث خطأ أثناء محاولة تحميل الطلبات',
                    duration: 4000,
                    style: {
                        background: '#ef4444',
                        color: '#ffffff',
                        direction: 'rtl',
                        textAlign: 'right',
                    },
                });
                setOrdersList([]);
                setPagination({ totalPages: 1, totalItems: 0 });
            }
        } catch (err) {
            console.error('Unexpected error fetching orders:', err);
            toast.error('حدث خطأ غير متوقع', {
                description: 'فشل في تحميل الطلبات بسبب خطأ غير متوقع',
                duration: 4000,
                style: {
                    background: '#ef4444',
                    color: '#ffffff',
                    direction: 'rtl',
                    textAlign: 'right',
                },
            });
            setOrdersList([]);
            setPagination({ totalPages: 1, totalItems: 0 });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData(currentPage, debouncedStatusFilter, debouncedSearchTerm);
    }, [currentPage, debouncedStatusFilter, debouncedSearchTerm, itemsPerPage]);

    const handlePageChange = page => {
        if (page < 1 || page > (pagination?.totalPages || 1)) return;
        setCurrentPage(page);
    };

    const handleStatusFilterChange = status => {
        setStatusFilter(status === 'all' ? '' : status);
        setCurrentPage(1);
    };

    const handleSearchChange = e => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const getStatusBadge = status => {
        switch (status) {
            case ORDER_STATUS.PENDING:
                return (
                    <Badge variant="secondary">{ORDER_STATUS.PENDING}</Badge>
                );
            case ORDER_STATUS.CONFIRMED:
                return (
                    <Badge variant="success">{ORDER_STATUS.CONFIRMED}</Badge>
                );
            case ORDER_STATUS.DELIVERED:
                return (
                    <Badge variant="success">{ORDER_STATUS.DELIVERED}</Badge>
                );
            case ORDER_STATUS.CANCELLED:
                return (
                    <Badge variant="destructive">
                        {ORDER_STATUS.CANCELLED}
                    </Badge>
                );
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const updateOrderStatus = async (orderId, newStatus) => {
        try {
            const [data, _, responseCode, error] = await api.patch(
                `/order/${orderId}/status`,
                { status: newStatus }
            );

            if (!error && responseCode === 200) {
                setOrdersList(
                    ordersList.map(order =>
                        order.id === orderId
                            ? { ...order, status: newStatus }
                            : order
                    )
                );
                toast.success('تم تحديث حالة الطلب', {
                    description: 'تم تحديث حالة الطلب بنجاح',
                    duration: 3000,
                    style: {
                        background: '#22c55e',
                        color: '#ffffff',
                        direction: 'rtl',
                        textAlign: 'right',
                    },
                });
            } else {
                throw new Error(error || 'Failed to update status');
            }
        } catch (error) {
            console.error('Error updating order status:', error);
            toast.error('فشل في تحديث الحالة', {
                description: 'حدث خطأ أثناء محاولة تحديث حالة الطلب',
                duration: 4000,
                style: {
                    background: '#ef4444',
                    color: '#ffffff',
                    direction: 'rtl',
                    textAlign: 'right',
                },
            });
        }
    };

    const handleDeleteClick = orderId => {
        setOrderToDelete(orderId);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!orderToDelete) return;

        setIsDeleting(true);
        try {
            const [data, _, responseCode, error] = await api.delete(
                `/order/${orderToDelete}`
            );

            if (!error && responseCode === 200) {
                fetchData(currentPage, statusFilter, searchTerm);
                toast.success('تم حذف الطلب', {
                    description: 'تم حذف الطلب بنجاح',
                    duration: 3000,
                    style: {
                        background: '#22c55e',
                        color: '#ffffff',
                        direction: 'rtl',
                        textAlign: 'right',
                    },
                });
            } else {
                throw new Error(error || 'Failed to delete order');
            }
        } catch (error) {
            console.error('Error deleting order:', error);
            toast.error('فشل في حذف الطلب', {
                description: 'حدث خطأ أثناء محاولة حذف الطلب',
                duration: 4000,
                style: {
                    background: '#ef4444',
                    color: '#ffffff',
                    direction: 'rtl',
                    textAlign: 'right',
                },
            });
        } finally {
            setIsDeleting(false);
            setIsDeleteDialogOpen(false);
            setOrderToDelete(null);
        }
    };

    const showOrderDetails = async order => {
        try {
            const [data, _, responseCode, error] = await api.get(
                `/order/get/${order.id}`
            );

            if (!error && responseCode === 200 && data) {
                setSelectedOrder(data.order || order);
            } else {
                setSelectedOrder(order);
            }
            setIsDetailsOpen(true);
        } catch (error) {
            console.error('Error fetching order details:', error);
            setSelectedOrder(order);
            setIsDetailsOpen(true);
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">
                            إدارة الطلبات
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            متابعة ومعالجة طلبات العملاء
                        </p>
                    </div>
                </div>
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-muted-foreground">
                            جاري تحميل الطلبات...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">
                        إدارة الطلبات
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        متابعة ومعالجة طلبات العملاء
                    </p>
                </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="البحث بالاسم، البريد الإلكتروني، الهاتف، أو رقم الطلب..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                setCurrentPage(1);
                                fetchData(1, statusFilter, searchTerm);
                            }
                        }}
                        className="pr-10 bg-white!"
                    />
                </div>

                <div className="relative">
                    <select
                        id="items-per-page"
                        value={itemsPerPage}
                        onChange={e => {
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

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select
                        value={statusFilter || 'all'}
                        onValueChange={handleStatusFilterChange}
                        dir="rtl"
                        className="bg-white!"
                    >
                        <SelectTrigger className="w-48 text-right bg-white!">
                            <SelectValue placeholder="تصفية حسب الحالة" />
                        </SelectTrigger>
                        <SelectContent side="bottom" align="end">
                            <SelectItem value="all">جميع الحالات</SelectItem>
                            <SelectItem value={ORDER_STATUS.PENDING}>
                                {ORDER_STATUS.PENDING}
                            </SelectItem>
                            <SelectItem value={ORDER_STATUS.CONFIRMED}>
                                {ORDER_STATUS.CONFIRMED}
                            </SelectItem>
                            <SelectItem value={ORDER_STATUS.DELIVERED}>
                                {ORDER_STATUS.DELIVERED}
                            </SelectItem>
                            <SelectItem value={ORDER_STATUS.CANCELLED}>
                                {ORDER_STATUS.CANCELLED}
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {(statusFilter || searchTerm) && (
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t">
                    <span className="text-sm text-muted-foreground">
                        الفلاتر النشطة:
                    </span>
                    {statusFilter && (
                        <Badge variant="secondary" className="gap-1">
                            حالة: {statusFilter}
                            <button
                                onClick={() => handleStatusFilterChange('')}
                                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                            >
                                ×
                            </button>
                        </Badge>
                    )}
                    {searchTerm && (
                        <Badge variant="secondary" className="gap-1">
                            بحث: {searchTerm}
                            <button
                                onClick={() => setSearchTerm('')}
                                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                            >
                                ×
                            </button>
                        </Badge>
                    )}
                </div>
            )}

            <Card className={'p-0 border-border'}>
                <CardContent className="p-0 m-0">
                    <div className="overflow-x-auto">
                        <Table className="min-w-[1000px]">
                            <TableHeader className={'p-0'}>
                                <TableRow className="text-right hover:bg-white">
                                    <TableHead className="text-right font-medium"></TableHead>
                                    <TableHead className="text-right font-medium">
                                        رقم الطلب
                                    </TableHead>
                                    <TableHead className="text-right font-medium">
                                        العميل
                                    </TableHead>
                                    <TableHead className="text-right font-medium">
                                        الولاية
                                    </TableHead>
                                    <TableHead className="text-right font-medium">
                                        الهاتف
                                    </TableHead>
                                    <TableHead className="text-right font-medium">
                                        العناصر
                                    </TableHead>
                                    <TableHead className="text-right font-medium">
                                        المجموع
                                    </TableHead>
                                    <TableHead className="text-right font-medium w-32">
                                        الحالة
                                    </TableHead>
                                    <TableHead className="text-right font-medium">
                                        التاريخ
                                    </TableHead>
                                    <TableHead className="text-right font-medium">
                                        الإجراءات
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {ordersList.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={10}
                                            className="text-center py-8"
                                        >
                                            <div className="text-muted-foreground">
                                                {searchTerm || statusFilter
                                                    ? 'لا توجد طلبات تطابق الفلاتر المحددة'
                                                    : 'لا توجد طلبات'}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    ordersList.map(order => (
                                        <TableRow
                                            key={`${order.id}-${order.created_at}`}
                                            className="hover:bg-white"
                                        >
                                            <TableCell className="font-mono text-sm"></TableCell>
                                            <TableCell className="font-mono text-sm">
                                                #{order.id}
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-right">
                                                    <div className="font-medium text-sm">
                                                        {order.full_name}
                                                    </div>
                                                    <div className="text-xs text-gray-500 truncate max-w-32">
                                                        {order.email}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {order.wilaya}
                                            </TableCell>
                                            <TableCell className="text-sm font-mono">
                                                {order.phone}
                                            </TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium bg-gray-100 rounded-full">
                                                    {order.item_count}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="font-semibold text-sm">
                                                    {order.total_price} دج
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    شحن: {order.delivery_fee} دج
                                                </div>
                                            </TableCell>
                                            <TableCell className="w-32">
                                                {getStatusBadge(order.status)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="text-sm">
                                                    {new Date(
                                                        order.created_at
                                                    ).toLocaleDateString(
                                                        'ar-DZ',
                                                        {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric',
                                                        }
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {new Date(
                                                        order.created_at
                                                    ).toLocaleTimeString(
                                                        'ar-DZ',
                                                        {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        }
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {/* View details at the beginning */}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                            showOrderDetails(
                                                                order
                                                            )
                                                        }
                                                        className="h-8 w-8 p-0 cursor-pointer text-sky-600 hover:text-sky-700 hover:bg-sky-50"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>

                                                    {/* Dots dropdown for the remaining actions */}
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger
                                                            asChild
                                                        >
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 w-8 p-0 cursor-pointer text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                                            >
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent
                                                            align="end"
                                                            className="w-44 text-right"
                                                            dir="rtl"
                                                        >
                                                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-b border-gray-100 mb-1">
                                                                تغيير حالة الطلب
                                                            </div>
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    updateOrderStatus(
                                                                        order.id,
                                                                        ORDER_STATUS.PENDING
                                                                    )
                                                                }
                                                                className={
                                                                    order.status ===
                                                                    ORDER_STATUS.PENDING
                                                                        ? 'bg-accent/50 font-medium text-right cursor-pointer'
                                                                        : 'text-right cursor-pointer'
                                                                }
                                                            >
                                                                {
                                                                    ORDER_STATUS.PENDING
                                                                }
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    updateOrderStatus(
                                                                        order.id,
                                                                        ORDER_STATUS.CONFIRMED
                                                                    )
                                                                }
                                                                className={
                                                                    order.status ===
                                                                    ORDER_STATUS.CONFIRMED
                                                                        ? 'bg-accent/50 font-medium text-right cursor-pointer'
                                                                        : 'text-right cursor-pointer'
                                                                }
                                                            >
                                                                {
                                                                    ORDER_STATUS.CONFIRMED
                                                                }
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    updateOrderStatus(
                                                                        order.id,
                                                                        ORDER_STATUS.DELIVERED
                                                                    )
                                                                }
                                                                className={
                                                                    order.status ===
                                                                    ORDER_STATUS.DELIVERED
                                                                        ? 'bg-accent/50 font-medium text-right cursor-pointer'
                                                                        : 'text-right cursor-pointer'
                                                                }
                                                            >
                                                                {
                                                                    ORDER_STATUS.DELIVERED
                                                                }
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    updateOrderStatus(
                                                                        order.id,
                                                                        ORDER_STATUS.CANCELLED
                                                                    )
                                                                }
                                                                className={
                                                                    order.status ===
                                                                    ORDER_STATUS.CANCELLED
                                                                        ? 'bg-accent/50 font-medium text-right cursor-pointer'
                                                                        : 'text-right cursor-pointer'
                                                                }
                                                            >
                                                                {
                                                                    ORDER_STATUS.CANCELLED
                                                                }
                                                            </DropdownMenuItem>

                                                            <DropdownMenuSeparator />

                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    handleDeleteClick(
                                                                        order.id
                                                                    )
                                                                }
                                                                className="text-red-600 focus:text-red-700 focus:bg-red-50 text-right cursor-pointer"
                                                            >
                                                                <Trash2 className="ml-2 h-4 w-4 inline" />
                                                                حذف الطلب
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {pagination.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-10">
                    <div className="text-sm text-muted-foreground">
                        صفحة {currentPage} من {pagination.totalPages}
                        {pagination && (
                            <span className="mr-2">
                                {' '}
                                • المجموع: {pagination.total} طلب
                            </span>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 justify-center">
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
                            السابق
                        </Button>
                        <span className="text-sm">
                            {currentPage} / {pagination.totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === pagination.totalPages}
                        >
                            التالي
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                handlePageChange(pagination.totalPages)
                            }
                            disabled={currentPage === pagination.totalPages}
                        >
                            الأخيرة
                        </Button>
                    </div>
                </div>
            )}

            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent
                    className="w-full max-w-4xl! max-h-[85vh] overflow-y-auto p-0 font-admin admin-app border-border"
                    dir="rtl"
                >
                    {selectedOrder && (
                        <>
                            {/* Header bar */}
                            <DialogHeader className="bg-blue-600 px-6 py-4 flex flex-row items-center justify-between space-y-0 sticky top-0 z-10">
                                <DialogTitle className="text-lg font-medium text-white order-2">
                                    تفاصيل الطلب{' '}
                                    <span className="font-bold">
                                        #{selectedOrder.id}
                                    </span>
                                </DialogTitle>
                                <button
                                    onClick={() => setIsDetailsOpen(false)}
                                    className="order-1 text-white/90 hover:text-white transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </DialogHeader>

                            <div className="p-6">
                                <div className="grid md:grid-cols-2 gap-4 mb-6">
                                    {/* Customer info */}
                                    <div className="bg-blue-50/60 rounded-xl p-5">
                                        <h3 className="text-sm font-bold text-gray-900 mb-3 text-right">
                                            معلومات العميل
                                        </h3>
                                        <div className="space-y-2.5 text-sm">
                                            <InfoRow
                                                label="الاسم"
                                                value={selectedOrder.full_name}
                                            />
                                            <InfoRow
                                                label="البريد الإلكتروني"
                                                value={selectedOrder.email}
                                            />
                                            <InfoRow
                                                label="الهاتف"
                                                value={selectedOrder.phone}
                                            />
                                            <InfoRow
                                                label="الولاية"
                                                value={selectedOrder.wilaya}
                                            />
                                            <InfoRow
                                                label="العنوان"
                                                value={selectedOrder.address}
                                            />
                                            <InfoRow
                                                label="التسليم"
                                                value={
                                                    selectedOrder.delivery_location
                                                }
                                            />
                                        </div>
                                    </div>

                                    {/* Order info */}
                                    <div className="bg-blue-50/60 rounded-xl p-5">
                                        <h3 className="text-sm font-bold text-gray-900 mb-3 text-right">
                                            معلومات الطلب
                                        </h3>
                                        <div className="space-y-2.5 text-sm">
                                            <InfoRow
                                                label="التاريخ"
                                                value={new Date(
                                                    selectedOrder.created_at
                                                ).toLocaleDateString('fr')}
                                            />
                                            <InfoRow
                                                label="الحالة"
                                                value={getStatusBadge(
                                                    selectedOrder.status
                                                )}
                                                isNode
                                            />
                                            <InfoRow
                                                label="طريقة الدفع"
                                                value="عند التسليم"
                                            />
                                            <InfoRow
                                                label="المجموع"
                                                value={`${selectedOrder.total_price} دج`}
                                                bold
                                            />
                                            {selectedOrder.notes && (
                                                <InfoRow
                                                    label="ملاحظات"
                                                    value={selectedOrder.notes}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Products */}
                                {selectedOrder.items &&
                                    selectedOrder.items.length > 0 && (
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-900 mb-4 text-right">
                                                المنتجات (
                                                {selectedOrder.items.length})
                                            </h3>
                                            <div className="space-y-3">
                                                {selectedOrder.items.map(
                                                    item => (
                                                        <div
                                                            key={item.id}
                                                            className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl bg-white"
                                                        >
                                                            {/* Price block (left) */}
                                                            <div className="flex-shrink-0 w-28">
                                                                <div className="text-base font-bold text-gray-900">
                                                                    {(
                                                                        item.quantity *
                                                                        parseFloat(
                                                                            item.unit_price
                                                                        )
                                                                    ).toFixed(
                                                                        2
                                                                    )}{' '}
                                                                    دج
                                                                </div>
                                                                <div className="text-xs text-gray-500 mt-0.5">
                                                                    {item.uses_custom_quantity &&
                                                                    item.measure_unit
                                                                        ? `${item.quantity} ${item.measure_unit}`
                                                                        : `× ${item.quantity}`}
                                                                </div>
                                                            </div>

                                                            {/* Info (middle, right-aligned text) */}
                                                            <div className="flex-1 min-w-0 text-right">
                                                                <h4 className="font-semibold text-gray-900 truncate">
                                                                    {item.display_name ||
                                                                        item.product_name}
                                                                </h4>
                                                                <div className="text-sm text-gray-500 truncate mt-0.5">
                                                                    {item.product_description
                                                                        .replace(
                                                                            /<[^>]*>/g,
                                                                            ''
                                                                        )
                                                                        .slice(
                                                                            0,
                                                                            60
                                                                        )}
                                                                    ...
                                                                </div>
                                                                <div className="text-xs text-gray-400 mt-1">
                                                                    {
                                                                        item.unit_price
                                                                    }{' '}
                                                                    دج /{' '}
                                                                    {item.uses_custom_quantity &&
                                                                    item.measure_unit
                                                                        ? item.measure_unit
                                                                        : 'وحدة'}
                                                                </div>
                                                            </div>

                                                            {/* Image (right) */}
                                                            {item.product_image ? (
                                                                <img
                                                                    src={
                                                                        item.product_image
                                                                    }
                                                                    alt={
                                                                        item.product_name
                                                                    }
                                                                    className="w-16 h-16 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                                                                />
                                                            ) : (
                                                                <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center flex-shrink-0">
                                                                    <Package className="h-6 w-6 text-gray-400" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                )}
                                            </div>

                                            {/* Final total */}
                                            <div className="mt-4 flex justify-between items-center bg-blue-50/60 rounded-xl px-5 py-4">
                                                <span className="text-sm font-bold text-gray-900">
                                                    الإجمالي النهائي:
                                                </span>
                                                <span className="text-lg font-bold text-blue-700">
                                                    {selectedOrder.total_price}{' '}
                                                    دج
                                                </span>
                                            </div>
                                        </div>
                                    )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            <ConfirmationDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={confirmDelete}
                isLoading={isDeleting}
                title="تأكيد حذف الطلب"
                message="هل أنت متأكد أنك تريد حذف هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء."
                confirmText="حذف الطلب"
                cancelText="إلغاء"
            />
        </div>
    );
}
// Small helper component for label/value rows
function InfoRow({ label, value, bold, isNode }) {
    return (
        <div className="flex justify-between items-center">
            <span
                className={bold ? 'font-bold text-gray-900' : 'text-gray-700'}
            >
                {isNode ? value : value || '—'}
            </span>
            <span className="text-gray-400">{label}</span>
        </div>
    );
}
