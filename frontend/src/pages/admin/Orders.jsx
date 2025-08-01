import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// import { Pagination } from "@/components/admin/Pagination"; // This component is not provided, so it is commented out.
import { Search, Eye, Trash2, Package, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useApi } from "@/contexts/RestContext";

export default function Orders() {
  const { toast } = useToast();
  const { api } = useApi();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [itemsPerPage] = useState(10);

  const [ordersList, setOrdersList] = useState([]);
  const [pagination, setPagination] = useState({
    totalPages: 1,
    totalItems: 0,
  });

  // Debounced search term for server-side search
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [debouncedStatusFilter, setDebouncedStatusFilter] = useState("");

  // Debounce the search term and status filter to avoid excessive API calls
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

  // Fetch data function with query parameters (page, limit, status, search)
  const fetchData = async (page = 1, status = "", search = "") => {
    setIsLoading(true);

    try {
      // Build query parameters
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
      });

      if (status) {
        queryParams.append("status", status);
      }

      // Use the debounced search term for server-side search
      if (search) {
        queryParams.append("search", search);
      }

      const [data, _, responseCode, error] = await api.get(
        `/order/getAll?${queryParams.toString()}`
      );

      if (!error && responseCode === 200 && data) {
        setOrdersList(data.orders || []);
        setPagination(data.pagination || { totalPages: 1, totalItems: 0 });
      } else {
        console.error("Error fetching orders:", error || "No data returned");
        toast({
          title: "خطأ",
          description: "فشل في تحميل الطلبات",
          variant: "destructive",
        });
        setOrdersList([]);
        setPagination({ totalPages: 1, totalItems: 0 });
      }
    } catch (err) {
      console.error("Unexpected error fetching orders:", err);
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع أثناء تحميل الطلبات",
        variant: "destructive",
      });
      setOrdersList([]);
      setPagination({ totalPages: 1, totalItems: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  // Main useEffect hook to fetch data.
  // It now depends on debounced values to avoid
  // an API call on every keystroke.
  useEffect(() => {
    fetchData(currentPage, debouncedStatusFilter, debouncedSearchTerm);
  }, [currentPage, debouncedStatusFilter, debouncedSearchTerm]);

  // Handle page change
  const handlePageChange = (page) => {
    if (page < 1 || page > (pagination?.totalPages || 1)) return;
    setCurrentPage(page);
  };

  // Handle status filter change, resets page to 1
  const handleStatusFilterChange = (status) => {
    setStatusFilter(status === "all" ? "" : status);
    setCurrentPage(1);
  };

  // Handle search, resets page to 1
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "en attente":
        return <Badge variant="secondary">في الانتظار</Badge>;
      case "confirmé":
        return (
          <Badge className="bg-success text-success-foreground">مؤكد</Badge>
        );
      case "expédié":
        return (
          <Badge className="bg-primary text-primary-foreground">مُرسل</Badge>
        );
      case "livré":
        return (
          <Badge className="bg-success text-success-foreground">
            تم التسليم
          </Badge>
        );
      case "annulé":
        return <Badge variant="destructive">ملغى</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const [data, _, responseCode, error] = await api.put(
        `/order/${orderId}/status`,
        { status: newStatus }
      );

      if (!error && responseCode === 200) {
        setOrdersList(
          ordersList.map((order) =>
            order.id === orderId ? { ...order, status: newStatus } : order
          )
        );
        toast({
          title: "تم التحديث",
          description: "تم تحديث حالة الطلب بنجاح",
        });
      } else {
        throw new Error(error || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحديث حالة الطلب",
        variant: "destructive",
      });
    }
  };

  const deleteOrder = async (orderId) => {
    try {
      const [data, _, responseCode, error] = await api.delete(
        `/order/${orderId}`
      );

      if (!error && responseCode === 200) {
        fetchData(currentPage, statusFilter, searchTerm);
        toast({
          title: "تم الحذف",
          description: "تم حذف الطلب بنجاح",
          variant: "destructive",
        });
      } else {
        throw new Error(error || "Failed to delete order");
      }
    } catch (error) {
      console.error("Error deleting order:", error);
      toast({
        title: "خطأ",
        description: "فشل في حذف الطلب",
        variant: "destructive",
      });
    }
  };

  const showOrderDetails = async (order) => {
    try {
      const [data, _, responseCode, error] = await api.get(
        `/order/${order.id}`
      );

      if (!error && responseCode === 200 && data) {
        setSelectedOrder(data.order || order);
      } else {
        setSelectedOrder(order);
      }
      setIsDetailsOpen(true);
    } catch (error) {
      console.error("Error fetching order details:", error);
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
            <p className="text-muted-foreground">جاري تحميل الطلبات...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">إدارة الطلبات</h1>
          <p className="text-muted-foreground mt-2">
            متابعة ومعالجة طلبات العملاء
          </p>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 h-8">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="البحث بالاسم، البريد الإلكتروني، الهاتف، أو رقم الطلب..."
            value={searchTerm}
            onChange={handleSearchChange} // Use new handler
            className="pr-10 bg-white!"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={statusFilter || "all"}
            onValueChange={handleStatusFilterChange}
            dir="rtl"
            className="bg-white!"
          >
            <SelectTrigger className="w-48 text-right bg-white!">
              <SelectValue placeholder="تصفية حسب الحالة" />
            </SelectTrigger>
            <SelectContent side="bottom" align="end">
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="en attente">في الانتظار</SelectItem>
              <SelectItem value="confirmé">مؤكد</SelectItem>
              <SelectItem value="expédié">مُرسل</SelectItem>
              <SelectItem value="livré">تم التسليم</SelectItem>
              <SelectItem value="annulé">ملغى</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active Filters Display */}
      {(statusFilter || searchTerm) && (
        <div className="flex items-center gap-2 mt-4 pt-4 border-t">
          <span className="text-sm text-muted-foreground">الفلاتر النشطة:</span>
          {statusFilter && (
            <Badge variant="secondary" className="gap-1">
              حالة:{" "}
              {statusFilter === "en attente"
                ? "في الانتظار"
                : statusFilter === "confirmé"
                ? "مؤكد"
                : statusFilter === "expédié"
                ? "مُرسل"
                : statusFilter === "livré"
                ? "تم التسليم"
                : statusFilter === "annulé"
                ? "ملغى"
                : statusFilter}
              <button
                onClick={() => handleStatusFilterChange("")}
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
                onClick={() => setSearchTerm("")}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
              >
                ×
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Orders Table */}
      <Card className={"p-0 border-0"}>
        <CardContent className="p-0 m-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader className={"p-0"}>
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
                    <TableCell colSpan={10} className="text-center py-8">
                      <div className="text-muted-foreground">
                        {searchTerm || statusFilter
                          ? "لا توجد طلبات تطابق الفلاتر المحددة"
                          : "لا توجد طلبات"}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  ordersList.map((order) => (
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
                      <TableCell className="text-sm">{order.wilaya}</TableCell>
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
                          {new Date(order.created_at).toLocaleDateString(
                            "ar-DZ",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(order.created_at).toLocaleTimeString(
                            "ar-DZ",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Select
                            value={order.status}
                            onValueChange={(newStatus) =>
                              updateOrderStatus(order.id, newStatus)
                            }
                            dir="rtl"
                          >
                            <SelectTrigger className="h-8 w-28 text-xs text-right pr-2">
                              <SelectValue placeholder="اختر الحالة" />
                            </SelectTrigger>
                            <SelectContent side="bottom" align="end">
                              <SelectItem value="en attente">
                                في الانتظار
                              </SelectItem>
                              <SelectItem value="confirmé">مؤكد</SelectItem>
                              <SelectItem value="expédié">مُرسل</SelectItem>
                              <SelectItem value="livré">تم التسليم</SelectItem>
                              <SelectItem value="annulé">ملغى</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => showOrderDetails(order)}
                            className="h-8 w-8 p-0 cursor-pointer hover:text-blue-700 hover:bg-blue-100"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 cursor-pointer p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => deleteOrder(order.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-between items-center mt-10">
          <div className="text-sm text-muted-foreground">
            صفحة {currentPage} من {pagination.totalPages}
            {pagination && (
              <span className="mr-2">
                {" "}
                • المجموع: {pagination.totalItems} طلب
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
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
              onClick={() => handlePageChange(pagination.totalPages)}
              disabled={currentPage === pagination.totalPages}
            >
              الأخيرة
            </Button>
          </div>
        </div>
      )}

      {/* Order Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto font-admin">
          {selectedOrder && (
            <>
              <DialogHeader className="border-b pb-4 mb-6 flex flex-row-reverse">
                <DialogTitle className="text-lg font-medium text-right">
                  طلب #{selectedOrder.id}
                </DialogTitle>
              </DialogHeader>

              {/* Customer & Order Info */}
              <div className="grid md:grid-cols-2 gap-8 mb-8 text-right">
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">
                    معلومات العميل
                  </h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>{selectedOrder.full_name}</span>
                      <span className="text-gray-400">الاسم</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{selectedOrder.email}</span>
                      <span className="text-gray-400">البريد</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{selectedOrder.phone}</span>
                      <span className="text-gray-400">الهاتف</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{selectedOrder.wilaya}</span>
                      <span className="text-gray-400">الولاية</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-left">{selectedOrder.address}</span>
                      <span className="text-gray-400">العنوان</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{selectedOrder.delivery_location}</span>
                      <span className="text-gray-400">التسليم</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">
                    تفاصيل الطلب
                  </h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>
                        {new Date(selectedOrder.created_at).toLocaleDateString(
                          "fr"
                        )}
                      </span>
                      <span className="text-gray-400">التاريخ</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>{getStatusBadge(selectedOrder.status)}</span>
                      <span className="text-gray-400">الحالة</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{selectedOrder.delivery_fee} دج</span>
                      <span className="text-gray-400">الشحن</span>
                    </div>
                    <div className="flex justify-between font-black text-gray-900 pt-2 border-t">
                      <span>{selectedOrder.total_price} دج</span>
                      <span>المجموع</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div className="mb-2 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-900 mb-2 text-right">
                    ملاحظات
                  </h3>
                  <p className="text-sm text-gray-600">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Products */}
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div>
                  <h3 className="text-sm font-black text-gray-900 mb-4 pb-2 border-b text-right">
                    المنتجات ({selectedOrder.items.length})
                  </h3>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 p-4 border-1 border-gray-500 rounded-lg bg-white transition-colors"
                      >
                        {/* Product Image */}
                        {item.product_image ? (
                          <img
                            src={item.product_image}
                            alt={item.product_name}
                            className="w-16 h-16 object-cover rounded-md border-1 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 rounded-md border-1 flex items-center justify-center flex-shrink-0">
                            <Package className="h-6 w-6 text-gray-400" />
                          </div>
                        )}

                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">
                            {item.product_name}
                          </h4>
                          <p className="text-sm text-gray-600 line-clamp-1">
                            {item.product_description}
                          </p>
                        </div>

                        {/* Quantity & Price */}
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-medium text-gray-900">
                            {item.quantity} × {item.unit_price} دج
                          </div>
                          <div className="text-xs text-gray-600">
                            {(
                              item.quantity * parseFloat(item.unit_price)
                            ).toFixed(2)}{" "}
                            دج
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
