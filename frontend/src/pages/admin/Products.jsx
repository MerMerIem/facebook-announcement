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
                              navigate(`/admin/edit-variant/${product.id}`)
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div
            className="bg-white rounded-lg shadow-xl max-w-7xl max-h-[90vh] w-full mx-4 overflow-hidden font-admin"
            dir="rtl"
          >
            {/* Header */}
            <div className="flex flex-row-reverse items-center justify-between p-6 border-b border-gray-200">
              <button
                onClick={() => setIsDetailsOpen(false)}
                className="text-gray-400 hover:text-red-600 transition-colors"
              >
                ✕
              </button>
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedProduct?.name}
                {isLoading && (
                  <span className="mr-2 text-sm text-gray-500">
                    (جاري التحميل...)
                  </span>
                )}
              </h2>
            </div>

            {/* Body */}
            <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6">
              {selectedProduct ? (
                <div className="space-y-8">
                  {/* Images */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={
                            selectedImageUrl || selectedProduct.main_image_url
                          }
                          alt={selectedProduct?.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {selectedProduct.images?.length > 1 && (
                        <div className="grid grid-cols-5 gap-2 mt-3">
                          {selectedProduct.images.map((img) => (
                            <div
                              key={img.id}
                              onClick={() => setSelectedImageUrl(img.url)}
                              className={`aspect-square rounded-lg overflow-hidden cursor-pointer border-2 ${
                                selectedImageUrl === img.url
                                  ? "border-blue-500 ring-2 ring-blue-200"
                                  : "border-gray-200 hover:border-gray-300"
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

                    {/* Product info */}
                    <div className="space-y-6">
                      {/* Description */}
                      <section>
                        <h3 className="text-lg font-semibold mb-3 text-gray-800">
                          الوصف
                        </h3>
                        <div className=" rounded-lg">
                          <div
                            className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                            dangerouslySetInnerHTML={{
                              __html: selectedProduct.description,
                            }}
                          />
                        </div>
                      </section>

                      {/* Category */}
                      <section>
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">
                          التصنيف
                        </h3>
                        <div className="bg-accent/10 p-4 rounded-lg space-y-3">
                          <div>
                            <p className="text-sm text-gray-500 my-2">
                              الفئة الرئيسية
                            </p>
                            <span className="inline-block bg-white border-gray-200 px-3 py-1 rounded-lg">
                              {selectedProduct?.category?.name || "غير محدد"}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 my-2">
                              الفئة الفرعية
                            </p>
                            <span className="inline-block bg-white border-gray-200 px-3 py-1 rounded-lg">
                              {selectedProduct?.subcategory?.name || "غير محدد"}
                            </span>
                          </div>
                        </div>
                      </section>

                      {/* Pricing */}
                      <section>
                        <h3 className="text-lg font-semibold mb-3 text-gray-800">
                          التسعير
                        </h3>
                        <div className="bg-accent/10 p-4 rounded-lg">
                          <p className="text-xl font-bold">
                            {selectedProduct.price} دج
                          </p>
                          {selectedProduct.discount_price && (
                            <p className="text-red-600 font-bold">
                              {selectedProduct.discount_price} دج (سعر الخصم)
                            </p>
                          )}
                        </div>
                      </section>
                    </div>
                  </div>

                  {/* Variants */}
                  {selectedProduct.has_variants &&
                    selectedProduct.variants?.length > 0 && (
                      <section>
                        <h3 className="text-lg font-bold mb-3 text-gray-800">
                          النماذج المتوفرة
                        </h3>
                        <div className="grid sm:grid-cols-3 lg:grid-cols-4 gap-4">
                          {selectedProduct.variants.map((variant) => (
                            <div
                              key={variant.id}
                              className="border border-gray-500 rounded-lg p-4 space-y-3 bg-white "
                            >
                              <img
                                src={variant.primary_image_url}
                                alt={variant.title}
                                className="w-full h-40 object-cover rounded"
                              />
                              <div>
                                <h4 className="font-bold">{variant.title}</h4>
                                <p className="text-sm text-gray-500">
                                  الحجم: {variant.size} {variant.measure_unit}
                                </p>
                              </div>
                              <div>
                                <p className="text-xl font-bold">
                                  {variant.price} دج
                                </p>
                                {variant.discount_price && (
                                  <p className="text-red-600">
                                    {variant.discount_price} دج (خصم)
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
                <div className="flex items-center justify-center h-64">
                  <p>جاري تحميل تفاصيل المنتج...</p>
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
