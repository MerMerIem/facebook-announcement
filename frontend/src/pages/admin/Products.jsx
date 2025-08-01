import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pagination } from "@/components/admin/Pagination";
import { Search, Plus, Edit2, Trash2, Package, Eye, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Products() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Mock data from user's example
  const mockProducts = [
    {
      id: 1,
      name: "منشار كهربائي",
      description: "منشار كهربائي قوي بقدرة عالية",
      price: "0.00",
      discount_price: "10000.00",
      discount_start: "2025-08-01T00:00:00.000Z",
      discount_end: "2025-08-15T00:00:00.000Z",
      category: { id: 2, name: "الأدوات الكهربائية" },
      subcategory: { id: 1, name: "مناشير كهربائية" },
      images: [],
      tags: [],
      main_image_url: null,
      has_discount: "2025-08-15T00:00:00.000Z",
      total_images: 0,
      total_tags: 0,
    },
    {
      id: 2,
      name: "مثقاب لاسلكي 18 فولت برو",
      description: "مثقاب لاسلكي احترافي بأداء فائق، بطارية تدوم طويلاً.",
      price: "0.00",
      discount_price: "8000.00",
      discount_start: "2025-07-28T00:00:00.000Z",
      discount_end: "2025-08-31T00:00:00.000Z",
      category: { id: 2, name: "الأدوات الكهربائية" },
      subcategory: { id: 2, name: "مثاقب كهربائية" },
      images: [
        {
          id: 4,
          url: "https://res.cloudinary.com/dj8va2cd0/image/upload/v1753721622/tjncxea2olpbcbi7bb8m.png",
          is_main: 1,
        },
        {
          id: 5,
          url: "https://res.cloudinary.com/dj8va2cd0/image/upload/v1753721622/wevxutpcm85stuzi806w.png",
          is_main: 0,
        },
      ],
      tags: [],
      main_image_url:
        "https://res.cloudinary.com/dj8va2cd0/image/upload/v1753721622/tjncxea2olpbcbi7bb8m.png",
      has_discount: "2025-08-31T00:00:00.000Z",
      total_images: 2,
      total_tags: 0,
    },
    {
      id: 3,
      name: "مفتاح ربط قابل للتعديل",
      description:
        "مفتاح ربط متعدد الاستخدامات، مصنوع من الفولاذ المقوى، مثالي للسباكة والتصليحات العامة.",
      price: "0.00",
      discount_price: "0.00",
      discount_start: null,
      discount_end: null,
      category: { id: 8, name: "الأدوات اليدوية" },
      subcategory: { id: 7, name: "مفاتيح الربط" },
      images: [
        {
          id: 6,
          url: "https://res.cloudinary.com/dj8va2cd0/image/upload/v1753722268/jy7703p5dliwepzfyri3.png",
          is_main: 0,
        },
        {
          id: 7,
          url: "https://res.cloudinary.com/dj8va2cd0/image/upload/v1753722268/edz3uqd1gb48bwyo1w6k.png",
          is_main: 1,
        },
      ],
      tags: [],
      main_image_url:
        "https://res.cloudinary.com/dj8va2cd0/image/upload/v1753722268/edz3uqd1gb48bwyo1w6k.png",
      has_discount: null,
      total_images: 2,
      total_tags: 0,
    },
  ];

  const [products] = useState(mockProducts);
  const itemsPerPage = 6;

  const filteredProducts = products.filter(
    (product) =>
      product.name.includes(searchTerm) ||
      product.category.name.includes(searchTerm) ||
      product.subcategory.name.includes(searchTerm)
  );

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  const showProductDetails = (product) => {
    setSelectedProduct(product);
    setIsDetailsOpen(true);
  };

  const getDiscountStatus = (product) => {
    if (!product.has_discount) return null;

    const discountEnd = new Date(product.has_discount);
    const now = new Date();

    if (discountEnd > now) {
      return (
        <Badge className="bg-destructive text-destructive-foreground">
          خصم نشط
        </Badge>
      );
    }
    return <Badge variant="outline">خصم منتهي</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">إدارة المنتجات</h1>
          <p className="text-muted-foreground mt-2">
            إدارة المنتجات والتسعير والمخزون
          </p>
        </div>

        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 ml-2" />
          إضافة منتج جديد
        </Button>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="البحث في المنتجات، الفئات، أو الفئات الفرعية..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>صورة</TableHead>
                <TableHead>اسم المنتج</TableHead>
                <TableHead>الفئة</TableHead>
                <TableHead>الفئة الفرعية</TableHead>
                <TableHead>السعر</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الصور/العلامات</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden">
                      {product.main_image_url ? (
                        <img
                          src={product.main_image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {product.description}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{product.category.name}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{product.subcategory.name}</Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      {product.has_discount &&
                      parseFloat(product.discount_price) > 0 ? (
                        <div>
                          <div className="font-bold">
                            {product.discount_price} دج
                          </div>
                          <div className="text-sm text-muted-foreground line-through">
                            {product.price} دج
                          </div>
                        </div>
                      ) : (
                        <div className="font-bold">{product.price} دج</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getDiscountStatus(product)}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>الصور: {product.total_images}</div>
                      <div>العلامات: {product.total_tags}</div>
                    </div>
                  </TableCell>
                  <TableCell>
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
                        className="text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Product Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedProduct && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">
                  {selectedProduct.name}
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="aspect-square bg-muted rounded-lg mb-4 overflow-hidden">
                    {selectedProduct.main_image_url ? (
                      <img
                        src={selectedProduct.main_image_url}
                        alt={selectedProduct.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  {selectedProduct.images.length > 1 && (
                    <div className="grid grid-cols-4 gap-2 ">
                      {selectedProduct.images.map((image) => (
                        <div
                          key={image.id}
                          className="aspect-square bg-muted rounded overflow-hidden"
                        >
                          <img
                            src={image.url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">الوصف</h3>
                    <p className="text-muted-foreground">
                      {selectedProduct.description}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">التصنيف</h3>
                    <div className="flex gap-2">
                      <Badge variant="outline">
                        {selectedProduct.category.name}
                      </Badge>
                      <Badge variant="outline">
                        {selectedProduct.subcategory.name}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">التسعير</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>السعر الأساسي:</span>
                        <span>{selectedProduct.price} دج</span>
                      </div>
                      {selectedProduct.has_discount && (
                        <>
                          <div className="flex justify-between">
                            <span>سعر الخصم:</span>
                            <span className="text-destructive">
                              {selectedProduct.discount_price} دج
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>انتهاء الخصم:</span>
                            <span>
                              {new Date(
                                selectedProduct.has_discount
                              ).toLocaleDateString("ar")}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {selectedProduct.tags.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">العلامات</h3>
                      <div className="flex flex-wrap gap-1">
                        {selectedProduct.tags.map((tag) => (
                          <Badge key={tag.id} variant="secondary">
                            <Tag className="h-3 w-3 ml-1" />
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
