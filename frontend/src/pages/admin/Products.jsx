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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useApi } from "@/contexts/RestContext";
import { replace, useNavigate } from "react-router-dom";

export default function Products() {
  const navigate = useNavigate();
  const { toast } = useToast();
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
        toast({
          title: "خطأ",
          description: "فشل في تحميل المنتجات",
          variant: "destructive",
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
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع أثناء تحميل المنتجات",
        variant: "destructive",
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
  
      if (
        !error &&
        responseCode === 200 &&
        data &&
        Array.isArray(data.data)
      ) {
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
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع أثناء البحث",
        variant: "destructive",
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
        toast({
          title: "تم الحذف",
          description: "تم حذف المنتج بنجاح",
          variant: "default",
        });
        fetchProducts(currentPage);
      } else {
        console.error("Error deleting product:", error);
        toast({
          title: "خطأ",
          description: "فشل في حذف المنتج",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Unexpected error deleting product:", err);
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع أثناء حذف المنتج",
        variant: "destructive",
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
        return data; // Return the product data
      } else {
        console.error("Error fetching product:", error || "No data returned");
        toast({
          title: "خطأ",
          description: "فشل في تحميل تفاصيل المنتج",
          variant: "destructive",
        });
        return null;
      }
    } catch (err) {
      console.error("Unexpected error fetching product:", err);
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع أثناء تحميل تفاصيل المنتج",
        variant: "destructive",
      });
      return null;
    }
  };

  const showProductDetails = async (product) => {
    setIsLoading(true);
    try {
      // First show the basic product info
      setSelectedProduct(product);
      setIsDetailsOpen(true);

      // Then fetch the full details
      const fullProduct = await fetchProductById(product.id);
      if (fullProduct) {
        setSelectedProduct(fullProduct);
      }
    } finally {
      setIsLoading(false);
    }
  };
  console.log("product", selectedProduct);

  const getDiscountStatus = (product) => {
    // Check if discount_price exists and is not null
    if (!product?.discount_price) return null;

    // If there are discount dates, check if discount is still active
    if (product.discount_start && product.discount_end) {
      const now = new Date();
      const startDate = new Date(product.discount_start);
      const endDate = new Date(product.discount_end);

      if (now >= startDate && now <= endDate) {
        return <Badge className="bg-green-500 text-white">خصم نشط</Badge>;
      }
      if(now < startDate){
        return <Badge className="bg-zinc-400 text-white">خصم سينشط </Badge>;
      }
      return <Badge variant="outline">خصم منتهي</Badge>;
    }

    // If discount_price exists but no dates, assume active
    return <Badge className="bg-red-500 text-white">خصم نشط</Badge>;
  };

  const handlePageChange = (page) => {
    if (page < 1 || page > pagination.totalPages) return;
    setCurrentPage(page);
    
    // ADD THIS LOGIC:
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
                if (e.key === 'Enter' && searchTerm.trim()) {
                  setCurrentPage(1);
                  setIsSearchMode(true);
                  searchProducts(1);
                }
              }}
            />
          </div>
          
          {/* ADD THESE BUTTONS: */}
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
                    <th className="p-4 font-medium">الصور/العلامات</th>
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
                        <div className="text-sm">
                          <div>الصور: {product?.total_images || 0}</div>
                          <div>العلامات: {product?.total_tags || 0}</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => showProductDetails(product)}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleDeleteClick(product?.id)}
                          >
                            <Trash2 className="h-3 w-3" />
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

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          {selectedProduct ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">
                  {selectedProduct?.name}
                  {isLoading && (
                    <span className="ml-2 text-sm text-gray-500">
                      (جاري التحميل...)
                    </span>
                  )}
                </DialogTitle>
              </DialogHeader>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
                {/* Image Section */}
                <div className="space-y-4">
                  {/* Main Image Display */}
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    {(selectedImageUrl || selectedProduct?.main_image_url) ? (
                      <img
                        src={selectedImageUrl || selectedProduct.main_image_url}
                        alt={selectedProduct?.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-20 w-20 text-gray-400" />
                      </div>
                    )}
                  </div>
                  
                  {/* Image Thumbnails */}
                  {selectedProduct?.images?.length > 1 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-700">الصور</h4>
                      <div className="grid grid-cols-5 gap-2">
                        {/* Main image thumbnail with indicator */}
                        <div
                          className={`relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                            !selectedImageUrl || selectedImageUrl === selectedProduct.main_image_url
                              ? 'border-blue-500 ring-2 ring-blue-200'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedImageUrl(selectedProduct.main_image_url)}
                        >
                          <img
                            src={selectedProduct.main_image_url}
                            alt="الصورة الرئيسية"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-1 right-1">
                            <div className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                              رئيسية
                            </div>
                          </div>
                        </div>
                        
                        {/* Additional images */}
                        {selectedProduct.images
                          .filter((img) => !img.is_main)
                          .map((image, index) => (
                            <div
                              key={image?.id}
                              className={`aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                                selectedImageUrl === image?.url
                                  ? 'border-blue-500 ring-2 ring-blue-200'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                              onClick={() => setSelectedImageUrl(image?.url)}
                            >
                              <img
                                src={image?.url}
                                alt={`صورة ${index + 2}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Product Information Section */}
                <div className="space-y-6">
                  {/* Description */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-gray-800">الوصف</h3>
                    <div className="bg-gray-50 p-4 rounded-lg min-h-[100px]">
                      {selectedProduct?.description ? (
                        <div
                          className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: selectedProduct.description,
                          }}
                        />
                      ) : (
                        <p className="text-gray-500 italic">لا يوجد وصف متاح</p>
                      )}
                    </div>
                  </div>

                  {/* Category Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">التصنيف</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-gray-500 mb-2">الفئة الرئيسية</p>
                          <Badge variant="outline" className="px-3 py-2">
                            {selectedProduct?.category?.name || "غير محدد"}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 mb-2">الفئة الفرعية</p>
                          <Badge variant="outline" className="px-3 py-2">
                            {selectedProduct?.subcategory?.name || "غير محدد"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pricing Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">التسعير</h3>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                      <div className="flex justify-between items-center py-2">
                        <span className="text-gray-700">السعر الأساسي:</span>
                        <span className="text-xl font-bold text-gray-800">
                          {selectedProduct?.price} دج
                        </span>
                      </div>
                      
                      {selectedProduct?.discount_price && (
                        <>
                          <div className="border-t border-gray-200 pt-4">
                            <div className="flex justify-between items-center py-2">
                              <span className="text-red-700">سعر الخصم:</span>
                              <span className="text-xl font-bold text-red-600">
                                {selectedProduct.discount_price} دج
                              </span>
                            </div>
                            <div className="mt-3 p-3 bg-red-50 rounded border border-red-200">
                              <p className="text-sm text-red-700 font-medium mb-2">
                                فترة الخصم:
                              </p>
                              <div className="text-sm text-red-600 space-y-1">
                                <p>من: {selectedProduct.discount_start &&
                                  new Date(selectedProduct.discount_start).toLocaleDateString('ar-DZ')}</p>
                                <p>إلى: {selectedProduct.discount_end &&
                                  new Date(selectedProduct.discount_end).toLocaleDateString('ar-DZ')}</p>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Admin Pricing Details */}
                  {selectedProduct?.admin_pricing && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 text-gray-800">
                        تفاصيل التسعير الإداري
                      </h3>
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <div className="bg-white p-3 rounded">
                              <p className="text-xs text-gray-500 mb-1">السعر الأساسي</p>
                              <p className="font-bold text-gray-800">
                                {selectedProduct.admin_pricing.initial_price} دج
                              </p>
                            </div>
                            <div className="bg-white p-3 rounded">
                              <p className="text-xs text-gray-500 mb-1">هامش الربح</p>
                              <p className="font-bold text-green-600">
                                +{selectedProduct.admin_pricing.profit} دج
                              </p>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="bg-white p-3 rounded">
                              <p className="text-xs text-gray-500 mb-1">نسبة الخصم</p>
                              <p className="font-bold text-orange-600">
                                {selectedProduct.admin_pricing.discount_percentage}%
                              </p>
                            </div>
                            <div className="bg-white p-1 rounded border-2 border-blue-300">
                              <p className="text-xs text-gray-500 mb-1">السعر النهائي</p>
                              <p className="text-lg font-bold text-blue-600">
                                {selectedProduct.admin_pricing.calculated_price} دج
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Additional Details */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-gray-800">تفاصيل إضافية</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">حالة الخصم:</span>
                        <div>
                          {selectedProduct.discount_start && selectedProduct.discount_end ? (
                            (() => {
                              const now = new Date();
                              const startDate = new Date(selectedProduct.discount_start);
                              const endDate = new Date(selectedProduct.discount_end);

                              if (now >= startDate && now <= endDate) {
                                return (
                                  <Badge className="bg-green-500 text-white px-3 py-1">
                                    خصم نشط
                                  </Badge>
                                );
                              }
                              if (now < startDate) {
                                return (
                                  <Badge className="bg-yellow-500 text-white px-3 py-1">
                                    خصم سينشط
                                  </Badge>
                                );
                              }
                              return (
                                <Badge variant="outline" className="px-3 py-1">
                                  خصم منتهي
                                </Badge>
                              );
                            })()
                          ) : (
                            <Badge variant="outline" className="px-3 py-1">
                              غير نشط
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">جاري تحميل تفاصيل المنتج...</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              هل أنت متأكد أنك تريد حذف هذا المنتج؟ لا يمكن التراجع عن هذا
              الإجراء.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              إلغاء
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              حذف
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
