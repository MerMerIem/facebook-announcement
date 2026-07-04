import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
    Search,
    Plus,
    Edit2,
    Trash2,
    Package,
    Eye,
    Tag,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Layers,
    Settings,
    MoreHorizontal,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useApi } from '@/contexts/RestContext';
import { useNavigate } from 'react-router-dom';

export default function Products() {
    const navigate = useNavigate();
    const { api } = useApi();
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);
    const [selectedImageUrl, setSelectedImageUrl] = useState(null);
    const [pagination, setPagination] = useState({
        totalPages: 1,
        totalItems: 0,
        hasNextPage: false,
        hasPrevPage: false,
    });
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [sortBy, setSortBy] = useState('id');
    const [sortOrder, setSortOrder] = useState('desc');
    const shouldShowFullPageLoading = isLoading && products.length === 0;

    const sortProducts = useCallback(
        items => {
            const sortedItems = [...items].sort((left, right) => {
                let leftValue = left?.[sortBy];
                let rightValue = right?.[sortBy];

                if (sortBy === 'name') {
                    leftValue = String(leftValue || '').toLowerCase();
                    rightValue = String(rightValue || '').toLowerCase();
                } else if (sortBy === 'price') {
                    leftValue = Number(leftValue) || 0;
                    rightValue = Number(rightValue) || 0;
                } else if (sortBy === 'created_at') {
                    leftValue = new Date(leftValue || left?.id || 0).getTime();
                    rightValue = new Date(
                        rightValue || right?.id || 0
                    ).getTime();
                } else {
                    leftValue = Number(leftValue) || 0;
                    rightValue = Number(rightValue) || 0;
                }

                if (leftValue < rightValue) {
                    return sortOrder === 'asc' ? -1 : 1;
                }

                if (leftValue > rightValue) {
                    return sortOrder === 'asc' ? 1 : -1;
                }

                return 0;
            });

            return sortedItems;
        },
        [sortBy, sortOrder]
    );

    const fetchProducts = useCallback(
        async (page = 1) => {
            setIsLoading(true);

            try {
                const queryParams = new URLSearchParams({
                    page: page.toString(),
                    limit: itemsPerPage.toString(),
                    sortBy,
                    sortOrder,
                });

                const [data, _, responseCode, error] = await api.get(
                    `/product/getAll?${queryParams.toString()}`
                );

                if (
                    !error &&
                    responseCode === 200 &&
                    data &&
                    Array.isArray(data.products)
                ) {
                    setProducts(sortProducts(data.products || []));
                    setPagination({
                        totalPages: data.pagination?.totalPages || 1,
                        totalItems: data.pagination?.total || 0,
                        hasNextPage: data.pagination?.hasNextPage || false,
                        hasPrevPage: data.pagination?.hasPrevPage || false,
                    });
                } else {
                    console.error(
                        'Error fetching products:',
                        error || 'No data returned'
                    );
                    toast.error('خطأ', {
                        description: 'فشل في تحميل المنتجات',
                        duration: 4000,
                        style: {
                            background: '#ef4444',
                            color: '#ffffff',
                            direction: 'rtl',
                            textAlign: 'right',
                        },
                    });
                    setProducts([]);
                    setPagination({
                        totalPages: 1,
                        totalItems: 0,
                        hasNextPage: false,
                        hasPrevPage: false,
                    });
                }
            } catch (err) {
                console.error('Unexpected error fetching products:', err);
                toast.error('خطأ', {
                    description: 'حدث خطأ غير متوقع أثناء تحميل المنتجات',
                    duration: 4000,
                    style: {
                        background: '#ef4444',
                        color: '#ffffff',
                        direction: 'rtl',
                        textAlign: 'right',
                    },
                });
                setProducts([]);
                setPagination({
                    totalPages: 1,
                    totalItems: 0,
                    hasNextPage: false,
                    hasPrevPage: false,
                });
            } finally {
                setIsLoading(false);
            }
        },
        [api, itemsPerPage, sortProducts, sortBy, sortOrder]
    );

    const fetchProductDetails = async id => {
        const [data, _, responseCode, error] = await api.get(
            `/product/get/${id}`
        );

        if (!error && responseCode === 200 && data) {
            setSelectedProduct(data);
            setIsDetailsOpen(true);
        } else {
            console.error(
                'Error fetching products:',
                error || 'No data returned'
            );
            toast.error('خطأ', {
                description: 'فشل في تحميل المنتج',
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

    const formatPrice = price => {
        return new Intl.NumberFormat('ar-DZ', {
            style: 'currency',
            currency: 'DZD',
            minimumFractionDigits: 0,
        }).format(price);
    };

    const formatDate = dateString => {
        if (!dateString) return 'غير محدد';
        return new Date(dateString).toLocaleDateString('ar-DZ');
    };

    const searchProducts = useCallback(
        async (page = 1, query = debouncedSearchTerm) => {
            setIsLoading(true);
            const normalizedQuery = query.trim();

            try {
                const queryParams = new URLSearchParams({
                    page: page.toString(),
                    limit: itemsPerPage.toString(),
                    sortBy,
                    sortOrder,
                    ...(normalizedQuery && { searchQuery: normalizedQuery }),
                });

                const endpoint = normalizedQuery
                    ? '/product/search'
                    : '/product/getAll';
                const [data, _, responseCode, error] = await api.get(
                    `${endpoint}?${queryParams.toString()}`
                );

                if (!error && responseCode === 200 && data) {
                    const products = normalizedQuery
                        ? data.data
                        : data.products;
                    if (Array.isArray(products)) {
                        setProducts(sortProducts(products || []));
                        setPagination({
                            totalPages:
                                data.pagination?.totalPages ||
                                Math.ceil(
                                    data.pagination?.total / itemsPerPage
                                ) ||
                                1,
                            totalItems: data.pagination?.total || 0,
                            hasNextPage:
                                data.pagination?.hasNextPage ||
                                page <
                                    Math.ceil(
                                        data.pagination?.total / itemsPerPage
                                    ),
                            hasPrevPage:
                                data.pagination?.hasPrevPage || page > 1,
                        });
                    }
                } else {
                    console.error(
                        'Error searching products:',
                        error || 'No data returned'
                    );
                    setProducts([]);
                    setPagination({
                        totalPages: 1,
                        totalItems: 0,
                        hasNextPage: false,
                        hasPrevPage: false,
                    });
                }
            } catch (err) {
                console.error('Unexpected error searching products:', err);
                toast.error('خطأ', {
                    description: 'حدث خطأ غير متوقع أثناء البحث',
                    duration: 4000,
                    style: {
                        background: '#ef4444',
                        color: '#ffffff',
                        direction: 'rtl',
                        textAlign: 'right',
                    },
                });
            } finally {
                setIsLoading(false);
            }
        },
        [api, itemsPerPage, sortProducts, sortBy, sortOrder]
    );

    useEffect(() => {
        const searchTimeout = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            setCurrentPage(1);
        }, 500);

        return () => clearTimeout(searchTimeout);
    }, [searchTerm]);

    useEffect(() => {
        if (debouncedSearchTerm.trim()) {
            searchProducts(currentPage, debouncedSearchTerm);
            return;
        }

        fetchProducts(currentPage);
    }, [currentPage, debouncedSearchTerm, fetchProducts, searchProducts]);

    const deleteProduct = async productId => {
        try {
            const [, _, responseCode, error] = await api.delete(
                `/product/delete/${productId}`
            );

            if (!error && responseCode === 200) {
                toast.success('تم الحذف', {
                    description: 'تم حذف المنتج بنجاح',
                    duration: 3000,
                    style: {
                        background: '#22c55e',
                        color: '#ffffff',
                        direction: 'rtl',
                        textAlign: 'right',
                    },
                });
                if (debouncedSearchTerm.trim()) {
                    searchProducts(currentPage, debouncedSearchTerm);
                } else {
                    fetchProducts(currentPage);
                }
            } else {
                console.error('Error deleting product:', error);
                toast.error('خطأ', {
                    description: 'فشل في حذف المنتج',
                    duration: 4000,
                    style: {
                        background: '#ef4444',
                        color: '#ffffff',
                        direction: 'rtl',
                        textAlign: 'right',
                    },
                });
            }
        } catch (err) {
            console.error('Unexpected error deleting product:', err);
            toast.error('خطأ', {
                description: 'حدث خطأ غير متوقع أثناء حذف المنتج',
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

    const handleDeleteClick = productId => {
        setProductToDelete(productId);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!productToDelete) return;
        await deleteProduct(productToDelete);
        setDeleteDialogOpen(false);
        setProductToDelete(null);
    };

    const getDiscountStatus = product => {
        if (!product?.discount_price) return null;

        if (product.discount_start && product.discount_end) {
            const now = new Date();
            const startDate = new Date(product.discount_start);
            const endDate = new Date(product.discount_end);

            if (now >= startDate && now <= endDate) {
                return (
                    <Badge className="bg-green-500 text-white">خصم نشط</Badge>
                );
            }
            if (now < startDate) {
                return (
                    <Badge className="bg-zinc-400 text-white">خصم سينشط</Badge>
                );
            }
            return (
                <Badge variant="outline" className="text-gray-500">
                    خصم منتهي
                </Badge>
            );
        }

        return <Badge className="bg-red-500 text-white">خصم نشط</Badge>;
    };

    const handlePageChange = page => {
        if (page < 1 || page > pagination.totalPages) return;
        setCurrentPage(page);

        if (debouncedSearchTerm.trim()) {
            searchProducts(page, debouncedSearchTerm);
        } else {
            fetchProducts(page);
        }
    };

    if (shouldShowFullPageLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">إدارة المنتجات</h1>
                        <p className="text-gray-600 mt-2">
                            إدارة المنتجات والتسعير والمخزون
                        </p>
                    </div>
                </div>
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">جاري تحميل المنتجات...</p>
                    </div>
                </div>
            </div>
        );
    }

    const isDiscountActive = product => {
        if (!product?.discount_price) return false;

        if (product.discount_start && product.discount_end) {
            const now = new Date();
            const startDate = new Date(product.discount_start);
            const endDate = new Date(product.discount_end);

            return now >= startDate && now <= endDate;
        }

        // If no start/end dates, assume discount is active
        return true;
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Package className="w-7 h-7 text-primary" />
                <div>
                    <h1 className="text-2xl font-bold">إدارة المنتجات</h1>
                    <p className="text-muted-foreground text-sm">
                        إدارة المنتجات والتسعير والمخزون
                    </p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative flex-1 min-w-[220px] max-w-md">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <Input
                        placeholder="البحث في المنتجات، الفئات، أو الفئات الفرعية..."
                        value={searchTerm}
                        onChange={e => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="pr-10 rounded-none border-border"
                        dir="rtl"
                    />
                </div>

                {/* Sort By */}
                <select
                    value={sortBy}
                    onChange={e => {
                        setSortBy(e.target.value);
                        setCurrentPage(1);
                    }}
                    className="h-9 px-3 text-sm border border-border bg-background text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary rounded-none"
                >
                    <option value="id">ترتيب: رقم</option>
                    <option value="name">ترتيب: الاسم</option>
                    <option value="price">ترتيب: السعر</option>
                    <option value="created_at">ترتيب: التاريخ</option>
                </select>

                {/* Sort Order */}
                <button
                    onClick={() => {
                        setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
                        setCurrentPage(1);
                    }}
                    className="h-9 px-3 border border-border bg-background text-foreground text-sm flex items-center gap-1.5 hover:bg-muted transition-colors rounded-none"
                >
                    {sortOrder === 'asc' ? (
                        <>
                            <ChevronDown className="w-4 h-4 rotate-180" />{' '}
                            تصاعدي
                        </>
                    ) : (
                        <>
                            <ChevronDown className="w-4 h-4" /> تنازلي
                        </>
                    )}
                </button>

                {/* Items per page */}
                <select
                    value={itemsPerPage}
                    onChange={e => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                    }}
                    className="h-9 px-3 text-sm border border-border bg-background text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary rounded-none"
                >
                    <option value={10}>10 / صفحة</option>
                    <option value={20}>20 / صفحة</option>
                    <option value={30}>30 / صفحة</option>
                    <option value={50}>50 / صفحة</option>
                </select>

                {debouncedSearchTerm.trim() && (
                    <button
                        onClick={() => {
                            setSearchTerm('');
                            setDebouncedSearchTerm('');
                            setCurrentPage(1);
                        }}
                        className="h-9 px-3 border border-border bg-background text-foreground text-sm hover:bg-muted transition-colors rounded-none"
                    >
                        ✕ مسح البحث
                    </button>
                )}

                {/* Add Button */}
                <Button
                    onClick={() => navigate('/admin/add-product')}
                    className="gap-2 rounded-none h-9 ml-auto"
                    size="sm"
                >
                    <Plus className="h-4 w-4" />
                    إضافة منتج جديد
                </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Card className="border-border p-3 rounded-none">
                    <CardContent className="p-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100">
                                <Package className="w-5 h-5 text-blue-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-muted-foreground">
                                    إجمالي المنتجات
                                </p>
                                <p className="text-2xl font-bold">
                                    {pagination.totalItems}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border p-3 rounded-none">
                    <CardContent className="p-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100">
                                <Tag className="w-5 h-5 text-green-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-muted-foreground">
                                    منتجات بخصم
                                </p>
                                <p className="text-2xl font-bold">
                                    {
                                        products.filter(p => p?.discount_price)
                                            .length
                                    }
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-border p-0">
                <CardContent className="m-0 border-0 p-0">
                    {!Array.isArray(products) || products.length === 0 ? (
                        <div className="py-8 text-center">
                            <Package className="mx-auto mb-4 h-16 w-16 text-gray-400" />
                            <p className="text-gray-600">لا توجد منتجات</p>
                        </div>
                    ) : (
                        <div>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[800px]">
                                    <thead className="border-b">
                                        <tr className="text-right">
                                            <th className="p-4 font-medium">
                                                صورة
                                            </th>
                                            <th className="p-4 font-medium">
                                                اسم المنتج
                                            </th>
                                            <th className="p-4 font-medium">
                                                الفئة
                                            </th>
                                            <th className="p-4 font-medium">
                                                الفئة الفرعية
                                            </th>
                                            <th className="p-4 font-medium">
                                                السعر
                                            </th>
                                            <th className="p-4 font-medium">
                                                الحالة
                                            </th>
                                            <th className="p-4 font-medium"></th>
                                            <th className="p-4 font-medium">
                                                الإجراءات
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {products.map(product => (
                                            <tr
                                                key={product?.id}
                                                className="border-b hover:bg-gray-50"
                                            >
                                                <td className="p-4">
                                                    <div className="h-16 w-16 overflow-hidden rounded-lg bg-gray-100">
                                                        {product?.main_image_url ? (
                                                            <img
                                                                src={
                                                                    product.main_image_url
                                                                }
                                                                alt={
                                                                    product?.name
                                                                }
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="flex h-full w-full items-center justify-center">
                                                                <Package className="h-6 w-6 text-gray-400" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-medium">
                                                        {product?.name}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <Badge variant="outline">
                                                        {product?.category
                                                            ?.name || 'N/A'}
                                                    </Badge>
                                                </td>
                                                <td className="p-4">
                                                    <Badge variant="outline">
                                                        {product?.subcategory
                                                            ?.name || 'N/A'}
                                                    </Badge>
                                                </td>
                                                <td className="p-4">
                                                    {isDiscountActive(
                                                        product
                                                    ) ? (
                                                        <div>
                                                            <div className="font-bold">
                                                                {
                                                                    product.discount_price
                                                                }{' '}
                                                                دج
                                                            </div>
                                                            <div className="text-sm text-gray-600 line-through">
                                                                {product.price}{' '}
                                                                دج
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="font-bold">
                                                            {product?.price} دج
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    {getDiscountStatus(product)}
                                                </td>
                                                <td className="p-4">
                                                    <div className="space-y-1 text-sm">
                                                        <div className="font-semibold">
                                                            الصور:{' '}
                                                            <span className="font-normal text-gray-600">
                                                                {product?.total_images ||
                                                                    0}
                                                            </span>
                                                        </div>
                                                        <div className="font-semibold">
                                                            العلامات:{' '}
                                                            <span className="font-normal text-gray-600">
                                                                {product?.total_tags ||
                                                                    0}
                                                            </span>
                                                        </div>
                                                        <div className="font-semibold">
                                                            أنواع المنتج:{' '}
                                                            <span className="font-normal text-gray-600">
                                                                {product?.total_variants ||
                                                                    0}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            aria-label="View product"
                                                            onClick={() =>
                                                                fetchProductDetails(
                                                                    product.id
                                                                )
                                                            }
                                                            className="group flex items-center justify-center rounded-md border-sky-500 bg-white! shadow-none! cursor-pointer transition hover:border-sky-600 hover:bg-sky-50 hover:text-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-1 text-sky-500"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>

                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger
                                                                asChild
                                                            >
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-8 w-8 p-0 cursor-pointer border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                                                                >
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent
                                                                align="end"
                                                                className="w-44 text-right"
                                                                dir="rtl"
                                                            >
                                                                <DropdownMenuItem
                                                                    onClick={() =>
                                                                        navigate(
                                                                            `/admin/edit-product/${product.id}`
                                                                        )
                                                                    }
                                                                    className="cursor-pointer text-right"
                                                                >
                                                                    <Edit2 className="ml-2 inline h-4 w-4 text-indigo-500" />
                                                                    تعديل المنتج
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() =>
                                                                        navigate(
                                                                            `/admin/products/${product.id}/add-variants`
                                                                        )
                                                                    }
                                                                    className="cursor-pointer text-right"
                                                                >
                                                                    <Layers className="ml-2 inline h-4 w-4 text-emerald-500" />
                                                                    إضافة نوع
                                                                    (Variant)
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() =>
                                                                        navigate(
                                                                            `/admin/products/${product.id}/edit-variants`
                                                                        )
                                                                    }
                                                                    className="cursor-pointer text-right"
                                                                >
                                                                    <Settings className="ml-2 inline h-4 w-4 text-amber-500" />
                                                                    تعديل
                                                                    الأنواع
                                                                </DropdownMenuItem>

                                                                <DropdownMenuSeparator />

                                                                <DropdownMenuItem
                                                                    onClick={() =>
                                                                        handleDeleteClick(
                                                                            product?.id
                                                                        )
                                                                    }
                                                                    className="cursor-pointer text-right text-red-600 focus:bg-red-50 focus:text-red-700"
                                                                >
                                                                    <Trash2 className="ml-2 inline h-4 w-4" />
                                                                    حذف المنتج
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {pagination.totalPages > 1 && (
                                <div className="flex flex-col items-center justify-between gap-4 px-4 py-4 sm:flex-row">
                                    <p className="text-sm text-gray-600">
                                        صفحة {currentPage} من{' '}
                                        {pagination.totalPages}
                                        <span className="mr-2">
                                            • المجموع: {pagination.totalItems}{' '}
                                            منتج
                                        </span>
                                    </p>
                                    <div className="flex flex-wrap justify-center gap-2">
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
                                            onClick={() =>
                                                handlePageChange(
                                                    currentPage - 1
                                                )
                                            }
                                            disabled={!pagination.hasPrevPage}
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                        <span className="rounded bg-gray-100 px-3 py-1">
                                            {currentPage} /{' '}
                                            {pagination.totalPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                handlePageChange(
                                                    currentPage + 1
                                                )
                                            }
                                            disabled={!pagination.hasNextPage}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                handlePageChange(
                                                    pagination.totalPages
                                                )
                                            }
                                            disabled={
                                                currentPage ===
                                                pagination.totalPages
                                            }
                                        >
                                            الأخيرة
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {isDetailsOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
                    <div
                        className="bg-white rounded-2xl shadow-2xl max-w-6xl max-h-[90vh] w-full mx-4 overflow-hidden font-admin"
                        dir="rtl"
                    >
                        {/* Header */}
                        <div className="flex flex-row-reverse items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                            <button
                                onClick={() => setIsDetailsOpen(false)}
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-md hover:shadow-lg text-gray-500 hover:text-red-500 transition-all duration-200"
                            >
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-bold text-gray-800">
                                    {selectedProduct?.name}
                                </h2>
                                {isLoading && (
                                    <div className="flex items-center gap-2 bg-blue-100 px-3 py-1 rounded-full">
                                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-sm text-blue-700">
                                            جاري التحميل...
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Body */}
                        <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6">
                            {selectedProduct ? (
                                <div className="space-y-8">
                                    {/* Images and Basic Info */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl overflow-hidden shadow-lg">
                                                <img
                                                    src={
                                                        selectedImageUrl ||
                                                        selectedProduct.main_image_url
                                                    }
                                                    alt={selectedProduct?.name}
                                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                                />
                                            </div>

                                            {selectedProduct.images?.length >
                                                1 && (
                                                <div className="grid grid-cols-5 gap-3">
                                                    {selectedProduct.images.map(
                                                        img => (
                                                            <div
                                                                key={img.id}
                                                                onClick={() =>
                                                                    setSelectedImageUrl(
                                                                        img.url
                                                                    )
                                                                }
                                                                className={`aspect-square rounded-xl overflow-hidden cursor-pointer border-3 transition-all duration-200 ${
                                                                    selectedImageUrl ===
                                                                    img.url
                                                                        ? 'border-blue-500 ring-4 ring-blue-200 scale-105'
                                                                        : 'border-gray-200 hover:border-gray-400 hover:scale-105'
                                                                }`}
                                                            >
                                                                <img
                                                                    src={
                                                                        img.url
                                                                    }
                                                                    alt=""
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Product Info */}
                                        <div className="space-y-6">
                                            {/* Tags */}
                                            {selectedProduct.tags &&
                                                selectedProduct.tags.length >
                                                    0 && (
                                                    <section>
                                                        <h3 className="text-lg font-semibold mb-3 text-gray-800 flex items-center gap-2">
                                                            <svg
                                                                className="w-5 h-5 text-blue-500"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={
                                                                        2
                                                                    }
                                                                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                                                                />
                                                            </svg>
                                                            العلامات
                                                        </h3>
                                                        <div className="flex flex-wrap gap-2">
                                                            {selectedProduct.tags.map(
                                                                (
                                                                    tag,
                                                                    index
                                                                ) => (
                                                                    <span
                                                                        key={
                                                                            index
                                                                        }
                                                                        className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md hover:shadow-lg transition-shadow duration-200"
                                                                    >
                                                                        {tag}
                                                                    </span>
                                                                )
                                                            )}
                                                        </div>
                                                    </section>
                                                )}

                                            {/* Description */}
                                            <section>
                                                <h3 className="text-lg font-semibold mb-3 text-gray-800 flex items-center gap-2">
                                                    <svg
                                                        className="w-5 h-5 text-green-500"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                        />
                                                    </svg>
                                                    الوصف
                                                </h3>
                                                <div className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-xl border border-gray-100">
                                                    <div
                                                        className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                                                        dangerouslySetInnerHTML={{
                                                            __html: selectedProduct.description,
                                                        }}
                                                    />
                                                </div>
                                            </section>

                                            {/* Pricing */}
                                            <section>
                                                <h3 className="text-lg font-semibold mb-3 text-gray-800 flex items-center gap-2">
                                                    <svg
                                                        className="w-5 h-5 text-yellow-500"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                                                        />
                                                    </svg>
                                                    التسعير
                                                </h3>
                                                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                                                    <div className="flex items-baseline gap-3">
                                                        {isDiscountActive(
                                                            selectedProduct
                                                        ) ? (
                                                            <>
                                                                <p className="text-2xl font-bold text-green-700">
                                                                    {formatPrice(
                                                                        selectedProduct.discount_price
                                                                    )}
                                                                    {selectedProduct.has_measure_unit &&
                                                                        selectedProduct.measure_unit && (
                                                                            <span className="text-sm font-normal text-gray-600 mr-2">
                                                                                /{' '}
                                                                                {
                                                                                    selectedProduct.measure_unit
                                                                                }
                                                                            </span>
                                                                        )}
                                                                </p>
                                                                <p className="text-xl text-gray-500 line-through">
                                                                    {formatPrice(
                                                                        selectedProduct.price
                                                                    )}
                                                                    {selectedProduct.has_measure_unit &&
                                                                        selectedProduct.measure_unit && (
                                                                            <span className="text-sm font-normal text-gray-400 mr-2">
                                                                                /{' '}
                                                                                {
                                                                                    selectedProduct.measure_unit
                                                                                }
                                                                            </span>
                                                                        )}
                                                                </p>
                                                                <span className="bg-red-100 text-red-600 px-2 py-1 rounded-lg text-sm font-medium">
                                                                    خصم نشط
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <p className="text-2xl font-bold text-green-700">
                                                                    {formatPrice(
                                                                        selectedProduct.price
                                                                    )}
                                                                    {selectedProduct.has_measure_unit &&
                                                                        selectedProduct.measure_unit && (
                                                                            <span className="text-sm font-normal text-gray-600 mr-2">
                                                                                /{' '}
                                                                                {
                                                                                    selectedProduct.measure_unit
                                                                                }
                                                                            </span>
                                                                        )}
                                                                </p>
                                                                {selectedProduct.discount_price && (
                                                                    <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded-lg text-sm">
                                                                        خصم
                                                                        منتهي
                                                                    </span>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </section>
                                        </div>
                                    </div>

                                    {/* Category & Unit Information */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Category */}
                                        <section>
                                            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                                <svg
                                                    className="w-5 h-5 text-purple-500"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                                                    />
                                                </svg>
                                                التصنيف
                                            </h3>
                                            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl space-y-3">
                                                <div>
                                                    <p className="text-sm text-gray-500 mb-2">
                                                        الفئة الرئيسية
                                                    </p>
                                                    <span className="inline-block bg-white border border-purple-200 px-3 py-2 rounded-lg font-medium">
                                                        {selectedProduct
                                                            ?.category?.name ||
                                                            'غير محدد'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-500 mb-2">
                                                        الفئة الفرعية
                                                    </p>
                                                    <span className="inline-block bg-white border border-purple-200 px-3 py-2 rounded-lg font-medium">
                                                        {selectedProduct
                                                            ?.subcategory
                                                            ?.name ||
                                                            'غير محدد'}
                                                    </span>
                                                </div>
                                            </div>
                                        </section>

                                        {/* Unit Information */}
                                        <section>
                                            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                                <svg
                                                    className="w-5 h-5 text-indigo-500"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                                    />
                                                </svg>
                                                معلومات الوحدة
                                            </h3>
                                            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-4 rounded-xl space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm text-gray-600">
                                                        يحتوي على وحدة قياس
                                                    </p>
                                                    <span
                                                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                                                            selectedProduct.has_measure_unit ||
                                                            selectedProduct.measure_unit
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-gray-100 text-gray-600'
                                                        }`}
                                                    >
                                                        {selectedProduct.has_measure_unit ||
                                                        selectedProduct.measure_unit ? (
                                                            <>
                                                                <svg
                                                                    className="w-4 h-4"
                                                                    fill="currentColor"
                                                                    viewBox="0 0 20 20"
                                                                >
                                                                    <path
                                                                        fillRule="evenodd"
                                                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                                        clipRule="evenodd"
                                                                    />
                                                                </svg>
                                                                نعم
                                                            </>
                                                        ) : (
                                                            <>
                                                                <svg
                                                                    className="w-4 h-4"
                                                                    fill="currentColor"
                                                                    viewBox="0 0 20 20"
                                                                >
                                                                    <path
                                                                        fillRule="evenodd"
                                                                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                                                        clipRule="evenodd"
                                                                    />
                                                                </svg>
                                                                لا
                                                            </>
                                                        )}
                                                    </span>
                                                </div>

                                                {(selectedProduct.has_measure_unit ||
                                                    selectedProduct.measure_unit) && (
                                                    <div>
                                                        <p className="text-sm text-gray-600 mb-2">
                                                            وحدة القياس
                                                        </p>
                                                        <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-lg font-medium">
                                                            {selectedProduct.measure_unit ||
                                                                'غير محدد'}
                                                        </span>
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm text-gray-600">
                                                        يسمح بكمية مخصصة
                                                    </p>
                                                    <span
                                                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                                                            selectedProduct.allows_custom_quantity
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-gray-100 text-gray-600'
                                                        }`}
                                                    >
                                                        {selectedProduct.allows_custom_quantity ? (
                                                            <>
                                                                <svg
                                                                    className="w-4 h-4"
                                                                    fill="currentColor"
                                                                    viewBox="0 0 20 20"
                                                                >
                                                                    <path
                                                                        fillRule="evenodd"
                                                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                                        clipRule="evenodd"
                                                                    />
                                                                </svg>
                                                                نعم
                                                            </>
                                                        ) : (
                                                            <>
                                                                <svg
                                                                    className="w-4 h-4"
                                                                    fill="currentColor"
                                                                    viewBox="0 0 20 20"
                                                                >
                                                                    <path
                                                                        fillRule="evenodd"
                                                                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                                                        clipRule="evenodd"
                                                                    />
                                                                </svg>
                                                                لا
                                                            </>
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        </section>
                                    </div>

                                    {/* Additional Product Info */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {/* Admin Pricing */}
                                        {selectedProduct.admin_pricing && (
                                            <section>
                                                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                                    <svg
                                                        className="w-5 h-5 text-green-500"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                                                        />
                                                    </svg>
                                                    تسعير الإدارة
                                                </h3>
                                                <div className="bg-green-50 p-4 rounded-xl space-y-2">
                                                    <div className="flex justify-between">
                                                        <span className="text-sm text-gray-600">
                                                            السعر الأولي:
                                                        </span>
                                                        <span className="font-semibold">
                                                            {formatPrice(
                                                                selectedProduct
                                                                    .admin_pricing
                                                                    .initial_price
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-sm text-gray-600">
                                                            الربح:
                                                        </span>
                                                        <span className="font-semibold text-green-600">
                                                            {formatPrice(
                                                                selectedProduct
                                                                    .admin_pricing
                                                                    .profit
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-sm text-gray-600">
                                                            نسبة الخصم:
                                                        </span>
                                                        <span className="font-semibold">
                                                            {
                                                                selectedProduct
                                                                    .admin_pricing
                                                                    .discount_percentage
                                                            }
                                                            %
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between border-t pt-2">
                                                        <span className="text-sm text-gray-600">
                                                            السعر المحسوب:
                                                        </span>
                                                        <span className="font-bold text-lg">
                                                            {formatPrice(
                                                                selectedProduct
                                                                    .admin_pricing
                                                                    .calculated_price
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            </section>
                                        )}

                                        {/* Discount Details */}
                                        <section>
                                            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                                <svg
                                                    className="w-5 h-5 text-red-500"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                                                    />
                                                </svg>
                                                تفاصيل الخصم
                                            </h3>
                                            <div className="bg-red-50 p-4 rounded-xl space-y-2">
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-600">
                                                        عتبة الخصم:
                                                    </span>
                                                    <span className="font-semibold">
                                                        {selectedProduct.discount_threshold ||
                                                            'غير محدد'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-600">
                                                        بداية الخصم:
                                                    </span>
                                                    <span className="font-semibold">
                                                        {formatDate(
                                                            selectedProduct.discount_start
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-600">
                                                        نهاية الخصم:
                                                    </span>
                                                    <span className="font-semibold">
                                                        {formatDate(
                                                            selectedProduct.discount_end
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-600">
                                                        رقم المرجع:
                                                    </span>
                                                    <span className="font-semibold">
                                                        {selectedProduct.prod_ref ||
                                                            'غير محدد'}
                                                    </span>
                                                </div>
                                            </div>
                                        </section>

                                        {/* Statistics */}
                                        <section>
                                            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                                <svg
                                                    className="w-5 h-5 text-blue-500"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                                    />
                                                </svg>
                                                إحصائيات
                                            </h3>
                                            <div className="bg-blue-50 p-4 rounded-xl space-y-2">
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-600">
                                                        إجمالي الصور:
                                                    </span>
                                                    <span className="font-semibold">
                                                        {selectedProduct.total_images ||
                                                            0}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-600">
                                                        إجمالي المتغيرات:
                                                    </span>
                                                    <span className="font-semibold">
                                                        {selectedProduct.total_variants ||
                                                            0}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-600">
                                                        المنتجات ذات الصلة:
                                                    </span>
                                                    <span className="font-semibold">
                                                        {selectedProduct
                                                            .related_products
                                                            ?.length || 0}
                                                    </span>
                                                </div>
                                            </div>
                                        </section>
                                    </div>

                                    {/* Variants */}
                                    {selectedProduct.variants?.length > 0 && (
                                        <section>
                                            <h3 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
                                                <svg
                                                    className="w-5 h-5 text-orange-500"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                                                    />
                                                </svg>
                                                النماذج المتوفرة
                                                <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                                                    {
                                                        selectedProduct.variants
                                                            .length
                                                    }{' '}
                                                    نموذج
                                                </span>
                                            </h3>
                                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {selectedProduct.variants.map(
                                                    variant => (
                                                        <div
                                                            key={variant.id}
                                                            className="bg-white border-2 border-gray-200 rounded-xl p-4 space-y-3"
                                                        >
                                                            <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                                                                <img
                                                                    src={
                                                                        variant.primary_image_url
                                                                    }
                                                                    alt={
                                                                        variant.title
                                                                    }
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <h4 className="font-bold text-gray-800">
                                                                    {
                                                                        variant.title
                                                                    }
                                                                </h4>
                                                                <p className="text-sm text-gray-600">
                                                                    الحجم:{' '}
                                                                    {
                                                                        variant.size
                                                                    }{' '}
                                                                    {
                                                                        variant.measure_unit
                                                                    }
                                                                </p>
                                                                <div className="flex items-baseline gap-2">
                                                                    <p className="text-lg font-bold text-green-600">
                                                                        {formatPrice(
                                                                            variant.price
                                                                        )}
                                                                    </p>
                                                                    {variant.discount_price && (
                                                                        <p className="text-red-600 font-semibold">
                                                                            {formatPrice(
                                                                                variant.discount_price
                                                                            )}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <Badge
                                                                        variant={
                                                                            variant.is_active
                                                                                ? 'default'
                                                                                : 'secondary'
                                                                        }
                                                                    >
                                                                        {variant.is_active
                                                                            ? 'نشط'
                                                                            : 'غير نشط'}
                                                                    </Badge>
                                                                    {variant.has_discount && (
                                                                        <Badge className="bg-green-100 text-green-800">
                                                                            خصم
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        </section>
                                    )}

                                    {/* Related Products */}
                                    {selectedProduct.related_products?.length >
                                        0 && (
                                        <section>
                                            <h3 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
                                                <svg
                                                    className="w-5 h-5 text-purple-500"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                                                    />
                                                </svg>
                                                المنتجات ذات الصلة
                                                <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                                                    {
                                                        selectedProduct
                                                            .related_products
                                                            .length
                                                    }{' '}
                                                    منتج
                                                </span>
                                            </h3>
                                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {selectedProduct.related_products.map(
                                                    relatedProduct => (
                                                        <div
                                                            key={
                                                                relatedProduct.id
                                                            }
                                                            className="bg-white border border-gray-200 rounded-xl p-4 space-y-3"
                                                        >
                                                            <div className="flex gap-3">
                                                                {relatedProduct.main_image_url && (
                                                                    <img
                                                                        src={
                                                                            relatedProduct.main_image_url
                                                                        }
                                                                        alt={
                                                                            relatedProduct.name
                                                                        }
                                                                        className="w-16 h-16 object-cover rounded"
                                                                    />
                                                                )}
                                                                <div className="flex-1">
                                                                    <h4 className="font-medium text-sm">
                                                                        {
                                                                            relatedProduct.name
                                                                        }
                                                                    </h4>
                                                                    <p className="text-xs text-gray-600">
                                                                        {formatPrice(
                                                                            relatedProduct.price
                                                                        )}
                                                                    </p>
                                                                    {relatedProduct
                                                                        .unit_info
                                                                        ?.has_measure_unit && (
                                                                        <Badge
                                                                            variant="outline"
                                                                            className="text-xs"
                                                                        >
                                                                            {
                                                                                relatedProduct
                                                                                    .unit_info
                                                                                    .measure_unit
                                                                            }
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        </section>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-64 space-y-4">
                                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-gray-600 font-medium">
                                        جاري تحميل تفاصيل المنتج...
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <Dialog
                open={deleteDialogOpen}
                dir="rtl"
                onOpenChange={setDeleteDialogOpen}
            >
                <DialogContent className="text-right font-admin border-none admin-app">
                    <DialogHeader className="pt-5">
                        <DialogTitle className="font-admin text-center">
                            تأكيد الحذف
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="font-admin">
                            هل أنت متأكد أنك تريد حذف هذا المنتج؟ لا يمكن
                            التراجع عن هذا الإجراء
                        </p>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            className="font-admin"
                            onClick={() => setDeleteDialogOpen(false)}
                        >
                            إلغاء
                        </Button>
                        <Button
                            variant="destructive"
                            className="font-admin"
                            onClick={confirmDelete}
                        >
                            حذف
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
