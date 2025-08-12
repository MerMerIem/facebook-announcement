import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
  Search,
  Plus,
  Edit2,
  Trash2,
  Package,
  Eye,
  Tag,
  ChevronLeft,
  ChevronRight,
  Layers,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/contexts/RestContext";
import { useNavigate } from "react-router-dom";

export default function Products() {
  const navigate = useNavigate();
  const { api } = useApi();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [pagination, setPagination] = useState({
    totalPages: 1,
    totalItems: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const itemsPerPage = 4;

  const fetchProducts = async (page = 1) => {
    setIsLoading(true);

    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
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
        setProducts(data.products || []);
        setPagination({
          totalPages: data.pagination?.totalPages || 1,
          totalItems: data.pagination?.total || 0,
          hasNextPage: data.pagination?.hasNextPage || false,
          hasPrevPage: data.pagination?.hasPrevPage || false,
        });
      } else {
        console.error("Error fetching products:", error || "No data returned");
        toast.error("خطأ", {
          description: "فشل في تحميل المنتجات",
          duration: 4000,
          style: {
            background: "#ef4444",
            color: "#ffffff",
            direction: "rtl",
            textAlign: "right",
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
      console.error("Unexpected error fetching products:", err);
      toast.error("خطأ", {
        description: "حدث خطأ غير متوقع أثناء تحميل المنتجات",
        duration: 4000,
        style: {
          background: "#ef4444",
          color: "#ffffff",
          direction: "rtl",
          textAlign: "right",
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
  };

  const fetchProductDetails = async (id) => {
    const [data, _, responseCode, error] = await api.get(`/product/get/${id}`);
    console.log("data", data);

    if (!error && responseCode === 200 && data) {
      setSelectedProduct(data);
      setIsDetailsOpen(true);
    } else {
      console.error("Error fetching products:", error || "No data returned");
      toast.error("خطأ", {
        description: "فشل في تحميل المنتج",
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

  const searchProducts = async (page = 1) => {
    setIsLoading(true);

    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
        searchQuery: searchTerm,
      });

      const [data, _, responseCode, error] = await api.get(
        `/product/search?${queryParams.toString()}`
      );

      if (!error && responseCode === 200 && data && Array.isArray(data.data)) {
        setProducts(data.data || []);
        setPagination({
          totalPages: Math.ceil(data.pagination.total / itemsPerPage),
          totalItems: data.pagination.total || 0,
          hasNextPage: page < Math.ceil(data.pagination.total / itemsPerPage),
          hasPrevPage: page > 1,
        });
      } else {
        console.error("Error searching products:", error || "No data returned");
        setProducts([]);
        setPagination({
          totalPages: 1,
          totalItems: 0,
          hasNextPage: false,
          hasPrevPage: false,
        });
      }
    } catch (err) {
      console.error("Unexpected error searching products:", err);
      toast.error("خطأ", {
        description: "حدث خطأ غير متوقع أثناء البحث",
        duration: 4000,
        style: {
          background: "#ef4444",
          color: "#ffffff",
          direction: "rtl",
          textAlign: "right",
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(currentPage);
  }, [currentPage]);

  const deleteProduct = async (productId) => {
    try {
      const [data, _, responseCode, error] = await api.delete(
        `/product/delete/${productId}`
      );

      if (!error && responseCode === 200) {
        toast.success("تم الحذف", {
          description: "تم حذف المنتج بنجاح",
          duration: 3000,
          style: {
            background: "#22c55e",
            color: "#ffffff",
            direction: "rtl",
            textAlign: "right",
          },
        });
        fetchProducts(currentPage);
      } else {
        console.error("Error deleting product:", error);
        toast.error("خطأ", {
          description: "فشل في حذف المنتج",
          duration: 4000,
          style: {
            background: "#ef4444",
            color: "#ffffff",
            direction: "rtl",
            textAlign: "right",
          },
        });
      }
    } catch (err) {
      console.error("Unexpected error deleting product:", err);
      toast.error("خطأ", {
        description: "حدث خطأ غير متوقع أثناء حذف المنتج",
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

  const handleDeleteClick = (productId) => {
    setProductToDelete(productId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    await deleteProduct(productToDelete);
    setDeleteDialogOpen(false);
    setProductToDelete(null);
  };

  const filteredProducts = Array.isArray(products) ? products : [];

  const fetchProductById = async (productId) => {
    try {
      const [data, _, responseCode, error] = await api.get(
        `/product/get/${productId}`
      );

      if (!error && responseCode === 200 && data) {
        return data;
      } else {
        console.error("Error fetching product:", error || "No data returned");
        toast.error("خطأ", {
          description: "فشل في تحميل تفاصيل المنتج",
          duration: 4000,
          style: {
            background: "#ef4444",
            color: "#ffffff",
            direction: "rtl",
            textAlign: "right",
          },
        });
        return null;
      }
    } catch (err) {
      console.error("Unexpected error fetching product:", err);
      toast.error("خطأ", {
        description: "حدث خطأ غير متوقع أثناء تحميل تفاصيل المنتج",
        duration: 4000,
        style: {
          background: "#ef4444",
          color: "#ffffff",
          direction: "rtl",
          textAlign: "right",
        },
      });
      return null;
    }
  };

  const showProductDetails = async (product) => {
    setIsLoading(true);
    try {
      setSelectedProduct(product);
      setIsDetailsOpen(true);

      const fullProduct = await fetchProductById(product.id);
      if (fullProduct) {
        setSelectedProduct(fullProduct);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getDiscountStatus = (product) => {
    if (!product?.discount_price) return null;

    if (product.discount_start && product.discount_end) {
      const now = new Date();
      const startDate = new Date(product.discount_start);
      const endDate = new Date(product.discount_end);

      if (now >= startDate && now <= endDate) {
        return <Badge className="bg-green-500 text-white">خصم نشط</Badge>;
      }
      if (now < startDate) {
        return <Badge className="bg-zinc-400 text-white">خصم سينشط </Badge>;
      }
      return <Badge variant="outline">خصم منتهي</Badge>;
    }

    return <Badge className="bg-red-500 text-white">خصم نشط</Badge>;
  };

  const handlePageChange = (page) => {
    if (page < 1 || page > pagination.totalPages) return;
    setCurrentPage(page);

    if (isSearchMode && searchTerm.trim()) {
      searchProducts(page);
    } else {
      fetchProducts(page);
    }
  };

  if (isLoading) {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">إدارة المنتجات</h1>
          <p className="text-gray-600 mt-2">إدارة المنتجات والتسعير والمخزون</p>
        </div>
      </div>

      <div className="flex items-center gap-4 justify-between">
        <div className="relative w-full flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400 bg-white!" />
            <Input
              placeholder="البحث في المنتجات، الفئات، أو الفئات الفرعية..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 bg-white!"
              onKeyPress={(e) => {
                if (e.key === "Enter" && searchTerm.trim()) {
                  setCurrentPage(1);
                  setIsSearchMode(true);
                  searchProducts(1);
                }
              }}
            />
          </div>

          <Button
            variant="outline"
            onClick={() => {
              if (searchTerm.trim()) {
                setCurrentPage(1);
                setIsSearchMode(true);
                searchProducts(1);
              }
            }}
            disabled={!searchTerm.trim()}
          >
            بحث
          </Button>

          {isSearchMode && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setIsSearchMode(false);
                setCurrentPage(1);
                fetchProducts(1);
              }}
            >
              مسح البحث
            </Button>
          )}
        </div>

        <Button onClick={() => navigate("/admin/add-product")}>
          <Plus className="h-4 w-4 ml-2" />
          إضافة منتج جديد
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card className="border-0 p-3 shadow-admin">
          <CardContent className="p-0">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-lg bg-blue-100">
                <Package className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground truncate">
                  إجمالي المنتجات
                </p>
                <p className="text-lg font-bold text-foreground truncate">
                  {pagination.totalItems}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 p-3 shadow-admin">
          <CardContent className="p-0">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-lg bg-green-100">
                <Tag className="w-6 h-6 text-green-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground truncate">
                  منتجات بخصم
                </p>
                <p className="text-lg font-bold text-foreground truncate">
                  {products.filter((p) => p?.discount_price).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className={"border-0 p-0"}>
        <CardContent className="p-0 m-0 border-0">
          {!Array.isArray(products) || products.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">لا توجد منتجات</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr className="text-right">
                    <th className="p-4 font-medium">صورة</th>
                    <th className="p-4 font-medium">اسم المنتج</th>
                    <th className="p-4 font-medium">الفئة</th>
                    <th className="p-4 font-medium">الفئة الفرعية</th>
                    <th className="p-4 font-medium">السعر</th>
                    <th className="p-4 font-medium">الحالة</th>
                    <th className="p-4 font-medium"></th>
                    <th className="p-4 font-medium">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product?.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                          {product?.main_image_url ? (
                            <img
                              src={product.main_image_url}
                              alt={product?.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <div className="font-medium">{product?.name}</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline">
                          {product?.category?.name || "N/A"}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline">
                          {product?.subcategory?.name || "N/A"}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div>
                          {product?.discount_price ? (
                            <div>
                              <div className="font-bold">
                                {product.discount_price} دج
                              </div>
                              <div className="text-sm text-gray-600 line-through">
                                {product.price} دج
                              </div>
                            </div>
                          ) : (
                            <div className="font-bold">{product?.price} دج</div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">{getDiscountStatus(product)}</td>
                      <td className="p-4">
                        <div className="text-sm space-y-1">
                          <div className="font-semibold">
                            الصور:{" "}
                            <span className="font-normal text-gray-600">
                              {product?.total_images || 0}
                            </span>
                          </div>
                          <div className="font-semibold">
                            العلامات:{" "}
                            <span className="font-normal text-gray-600">
                              {product?.total_tags || 0}
                            </span>
                          </div>
                          <div className="font-semibold">
                            أنواع المنتج:{" "}
                            <span className="font-normal text-gray-600">
                              {product?.total_variants || 0}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1">
                          {/* View product */}
                          <Button
                            variant="outline"
                            size="sm"
                            aria-label="View product"
                            onClick={() => fetchProductDetails(product.id)}
                            className="group bg-white! shadow-none! flex items-center justify-center cursor-pointer transition 
        border-sky-500 text-sky-500 rounded-md
        hover:bg-sky-50 hover:border-sky-600 hover:text-sky-600
        focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-sky-400"
                          >
                            <Eye className="h-3 w-3 transition-transform group-hover:scale-110" />
                          </Button>

                          {/* Edit product */}
                          <Button
                            variant="outline"
                            size="sm"
                            aria-label="Edit product"
                            onClick={() =>
                              navigate(`/admin/edit-product/${product.id}`)
                            }
                            className="group bg-white! shadow-none! flex items-center justify-center cursor-pointer transition 
        border-violet-500 text-violet-500 rounded-md
        hover:bg-violet-50 hover:border-violet-600 hover:text-violet-600
        focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-violet-400"
                          >
                            <Edit2 className="h-3 w-3 transition-transform group-hover:scale-110" />
                          </Button>

                          {/* Add variant */}
                          <Button
                            variant="outline"
                            size="sm"
                            aria-label="Add variant"
                            onClick={() =>
                              navigate(
                                `/admin/products/${product.id}/add-variants`
                              )
                            }
                            className="group bg-white! shadow-none! flex items-center justify-center cursor-pointer transition 
        border-emerald-500 text-emerald-500 rounded-md
        hover:bg-emerald-50 hover:border-emerald-600 hover:text-emerald-600
        focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-emerald-400"
                          >
                            <Layers className="h-3 w-3 transition-transform group-hover:scale-110" />
                          </Button>

                          {/* Edit variant */}
                          <Button
                            variant="outline"
                            size="sm"
                            aria-label="Edit variant"
                            onClick={() =>
                              navigate(
                                `/admin/products/${product.id}/edit-variants`
                              )
                            }
                            className="group bg-white! shadow-none! flex items-center justify-center cursor-pointer transition 
        border-amber-500 text-amber-500 rounded-md
        hover:bg-amber-50 hover:border-amber-600 hover:text-amber-600
        focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-amber-400"
                          >
                            <Settings className="h-3 w-3 transition-transform group-hover:scale-110" />
                          </Button>

                          {/* Delete product */}
                          <Button
                            variant="outline"
                            size="sm"
                            aria-label="Delete product"
                            onClick={() => handleDeleteClick(product?.id)}
                            className="group bg-white! shadow-none! flex items-center justify-center cursor-pointer transition 
        border-rose-500 text-rose-500 rounded-md
        hover:bg-rose-50 hover:border-rose-600 hover:text-rose-600
        focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-rose-400"
                          >
                            <Trash2 className="h-3 w-3 transition-transform group-hover:scale-110" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            صفحة {currentPage} من {pagination.totalPages}
            <span className="mr-2">
              • المجموع: {pagination.totalItems} منتج
            </span>
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
              disabled={!pagination.hasPrevPage}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <span className="px-3 py-1 bg-gray-100 rounded">
              {currentPage} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!pagination.hasNextPage}
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
                            selectedImageUrl || selectedProduct.main_image_url
                          }
                          alt={selectedProduct?.name}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>

                      {selectedProduct.images?.length > 1 && (
                        <div className="grid grid-cols-5 gap-3">
                          {selectedProduct.images.map((img) => (
                            <div
                              key={img.id}
                              onClick={() => setSelectedImageUrl(img.url)}
                              className={`aspect-square rounded-xl overflow-hidden cursor-pointer border-3 transition-all duration-200 ${
                                selectedImageUrl === img.url
                                  ? "border-blue-500 ring-4 ring-blue-200 scale-105"
                                  : "border-gray-200 hover:border-gray-400 hover:scale-105"
                              }`}
                            >
                              <img
                                src={img.url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="space-y-6">
                      {/* Tags */}
                      {selectedProduct.tags &&
                        selectedProduct.tags.length > 0 && (
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
                                  strokeWidth={2}
                                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                                />
                              </svg>
                              العلامات
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              {selectedProduct.tags.map((tag, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md hover:shadow-lg transition-shadow duration-200"
                                >
                                  {tag}
                                </span>
                              ))}
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
                            <p className="text-2xl font-bold text-green-700">
                              {selectedProduct.price} 
                              {selectedProduct.has_measure_unit &&
                                selectedProduct.measure_unit && (
                                  <span className="text-sm font-normal text-gray-600 mr-2">
                                    / {selectedProduct.measure_unit}
                                  </span>
                                )}
                            </p>
                            {selectedProduct.discount_price && (
                              <p className="text-xl font-bold text-red-600 flex items-center gap-2">
                                <span className="bg-red-100 px-2 py-1 rounded-lg">
                                  خصم
                                </span>
                                {selectedProduct.discount_price} 
                                {selectedProduct.has_measure_unit &&
                                  selectedProduct.measure_unit && (
                                    <span className="text-sm font-normal text-red-500 mr-2">
                                      / {selectedProduct.measure_unit}
                                    </span>
                                  )}
                              </p>
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
                            {selectedProduct?.category?.name || "غير محدد"}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 mb-2">
                            الفئة الفرعية
                          </p>
                          <span className="inline-block bg-white border border-purple-200 px-3 py-2 rounded-lg font-medium">
                            {selectedProduct?.subcategory?.name || "غير محدد"}
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
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-600"
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
                              {selectedProduct.measure_unit || "غير محدد"}
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
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-600"
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

                  {/* Variants */}
                  {(selectedProduct.has_variants ||
                    selectedProduct.variants?.length > 0) && (
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
                          {selectedProduct.variants?.length || 0} نموذج
                        </span>
                      </h3>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {selectedProduct.variants?.map((variant) => (
                          <div
                            key={variant.id}
                            className="group bg-white border-2 border-gray-200 hover:border-blue-300 rounded-xl p-4 space-y-3 transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
                          >
                            <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                              <img
                                src={variant.primary_image_url}
                                alt={variant.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                            </div>
                            <div className="space-y-2">
                              <h4 className="font-bold text-gray-800 leading-tight">
                                {variant.title}
                              </h4>
                              {variant.size && (
                                <p className="text-sm text-gray-600 flex items-center gap-1">
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                                    />
                                  </svg>
                                  الحجم: {variant.size}
                                  {variant.measure_unit &&
                                    ` ${variant.measure_unit}`}
                                </p>
                              )}
                              {variant.allows_custom_quantity && (
                                <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                                  <svg
                                    className="w-3 h-3"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  يسمح بكمية مخصصة
                                </p>
                              )}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-baseline gap-2">
                                <p className="text-lg font-bold text-green-600">
                                  {variant.price} دج
                                </p>
                                {variant.measure_unit && (
                                  <span className="text-xs text-gray-500">
                                    / {variant.measure_unit}
                                  </span>
                                )}
                              </div>
                              {variant.discount_price && (
                                <p className="text-red-600 font-semibold flex items-center gap-1">
                                  <span className="bg-red-100 text-red-800 text-xs px-1.5 py-0.5 rounded">
                                    خصم
                                  </span>
                                  {variant.discount_price} دج
                                  {variant.measure_unit && (
                                    <span className="text-xs text-red-400">
                                      / {variant.measure_unit}
                                    </span>
                                  )}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
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
        <DialogContent className="text-right font-admin border-none">
          <DialogHeader>
            <DialogTitle className="font-admin text-center">
              تأكيد الحذف
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="font-admin">
              هل أنت متأكد أنك تريد حذف هذا المنتج؟ لا يمكن التراجع عن هذا
              الإجراء
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
