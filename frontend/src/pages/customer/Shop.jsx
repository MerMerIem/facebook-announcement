import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Grid, List, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Header from '@/components/customer/layout/Header';
import ProductCard from '@/components/customer/shop/ProductCard';
import Filters from '@/components/customer/shop/Filters';
import Pagination from '@/components/customer/shop/Pagination';

// Mock data
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
    main_image_url: "/placeholder.svg",
    has_discount: "2025-08-15T00:00:00.000Z",
    total_images: 0,
    total_tags: 0
  },
  {
    id: 14,
    name: "مثقاب لاسلكي 18 فولت 10",
    description: "مثقاب قوي وفعال ببطارية ليثيوم أيون 18 فولت، مثالي للمشاريع المنزلية.",
    price: "15000.00",
    discount_price: "0.00",
    discount_start: null,
    discount_end: null,
    category: { id: 2, name: "الأدوات الكهربائية" },
    subcategory: { id: 2, name: "مثاقب كهربائية" },
    images: [{ id: 12, url: "https://res.cloudinary.com/dj8va2cd0/image/upload/v1753784102/oyavzv8povmoad7uxvem.png", is_main: 1 }],
    tags: [{ id: 1, name: "مستلزمات السباكة" }],
    main_image_url: "https://res.cloudinary.com/dj8va2cd0/image/upload/v1753784102/oyavzv8povmoad7uxvem.png",
    has_discount: null,
    total_images: 1,
    total_tags: 1
  },
  {
    id: 15,
    name: "مثقاب لاسلكي 18 فولت 12",
    description: "مثقاب قوي وفعال ببطارية ليثيوم أيون 18 فولت، مثالي للمشاريع المنزلية.",
    price: "18000.00",
    discount_price: "0.00",
    discount_start: null,
    discount_end: null,
    category: { id: 2, name: "الأدوات الكهربائية" },
    subcategory: { id: 2, name: "مثاقب كهربائية" },
    images: [{ id: 13, url: "https://res.cloudinary.com/dj8va2cd0/image/upload/v1753784693/ikcpff4ttbrpmhswsgnu.png", is_main: 1 }],
    tags: [{ id: 1, name: "مستلزمات السباكة" }],
    main_image_url: "https://res.cloudinary.com/dj8va2cd0/image/upload/v1753784693/ikcpff4ttbrpmhswsgnu.png",
    has_discount: null,
    total_images: 1,
    total_tags: 1
  },
  {
    id: 16,
    name: "مثقاب لاسلكي 18 فولت 14",
    description: "مثقاب قوي وفعال ببطارية ليثيوم أيون 18 فولت، مثالي للمشاريع المنزلية.",
    price: "22000.00",
    discount_price: "19000.00",
    discount_start: "2025-08-01T00:00:00.000Z",
    discount_end: "2025-08-20T00:00:00.000Z",
    category: { id: 2, name: "الأدوات الكهربائية" },
    subcategory: { id: 2, name: "مثاقب كهربائية" },
    images: [
      { id: 14, url: "https://res.cloudinary.com/dj8va2cd0/image/upload/v1753784811/cq5a4dcj2ayqhf7rai8x.png", is_main: 1 },
      { id: 15, url: "https://res.cloudinary.com/dj8va2cd0/image/upload/v1753784811/kbtgfwsxyle6vzsehckq.png", is_main: 0 }
    ],
    tags: [{ id: 1, name: "مستلزمات السباكة" }],
    main_image_url: "https://res.cloudinary.com/dj8va2cd0/image/upload/v1753784811/cq5a4dcj2ayqhf7rai8x.png",
    has_discount: "2025-08-20T00:00:00.000Z",
    total_images: 2,
    total_tags: 1
  },
  {
    id: 17,
    name: "مثقاب لاسلكي 18 فولت 15",
    description: "مثقاب قوي وفعال ببطارية ليثيوم أيون 18 فولت، مثالي للمشاريع المنزلية.",
    price: "25000.00",
    discount_price: "0.00",
    discount_start: null,
    discount_end: null,
    category: { id: 2, name: "الأدوات الكهربائية" },
    subcategory: { id: 2, name: "مثاقب كهربائية" },
    images: [
      { id: 16, url: "https://res.cloudinary.com/dj8va2cd0/image/upload/v1753784895/uhltbkakospijoillj6o.png", is_main: 1 },
      { id: 17, url: "https://res.cloudinary.com/dj8va2cd0/image/upload/v1753784895/b2w0euoufpbxxduimsl3.png", is_main: 0 },
      { id: 18, url: "https://res.cloudinary.com/dj8va2cd0/image/upload/v1753784895/rjuzoumt7p6s7fxw0q5c.png", is_main: 0 }
    ],
    tags: [{ id: 1, name: "مستلزمات السباكة" }],
    main_image_url: "https://res.cloudinary.com/dj8va2cd0/image/upload/v1753784895/uhltbkakospijoillj6o.png",
    has_discount: null,
    total_images: 3,
    total_tags: 1
  }
];

const Shop = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState(mockProducts);
  const [isGridView, setIsGridView] = useState(true);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('newest');
  
  const searchQuery = searchParams.get('search') || '';
  const categoryFilter = searchParams.get('category');

  const [filters, setFilters] = useState({
    categories: categoryFilter ? [parseInt(categoryFilter)] : [],
    subcategories: [],
    tags: [],
    priceRange: [0, 50000],
    hasDiscount: false,
  });

  const filterOptions = {
    categories: [
      { id: 1, name: "أدوات البناء", count: 25 },
      { id: 2, name: "الأدوات الكهربائية", count: 15 },
      { id: 3, name: "قطع الغيار", count: 8 }
    ],
    subcategories: [
      { id: 1, name: "مناشير كهربائية", categoryId: 2, count: 5 },
      { id: 2, name: "مثاقب كهربائية", categoryId: 2, count: 10 }
    ],
    tags: [
      { id: 1, name: "مستلزمات السباكة", count: 12 },
      { id: 2, name: "أدوات احترافية", count: 8 }
    ],
    priceRange: [0, 50000]
  };

  const pagination = {
    page: currentPage,
    limit: 12,
    total: products.length,
    totalPages: Math.ceil(products.length / 12),
    hasNextPage: currentPage < Math.ceil(products.length / 12),
    hasPrevPage: currentPage > 1
  };

  const handleSearch = (query) => {
    const params = new URLSearchParams(searchParams);
    if (query) {
      params.set('search', query);
    } else {
      params.delete('search');
    }
    setSearchParams(params);
  };

  const handleSortChange = (value) => {
    setSortBy(value);
    // Apply sorting logic here
  };

  const filteredProducts = products.filter(product => {
    // Search filter
    if (searchQuery && !product.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !product.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Category filter
    if (filters.categories.length > 0 && !filters.categories.includes(product.category.id)) {
      return false;
    }

    // Subcategory filter
    if (filters.subcategories.length > 0 && !filters.subcategories.includes(product.subcategory.id)) {
      return false;
    }

    // Price filter
    const price = parseFloat(product.discount_price || product.price || '0');
    if (price < filters.priceRange[0] || price > filters.priceRange[1]) {
      return false;
    }

    // Discount filter
    if (filters.hasDiscount && !product.has_discount) {
      return false;
    }

    return true;
  });

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * pagination.limit,
    currentPage * pagination.limit
  );

  return (
    <div className="min-h-screen bg-shop-bg">
      <Header onSearch={handleSearch} searchQuery={searchQuery} />
      
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters Sidebar */}
          <div className={`lg:w-80 ${isFiltersOpen ? 'block' : 'hidden lg:block'}`}>
            <Filters
              options={filterOptions}
              activeFilters={filters}
              onFiltersChange={setFilters}
              isOpen={isFiltersOpen || window.innerWidth >= 1024}
              onToggle={() => setIsFiltersOpen(!isFiltersOpen)}
            />
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="lg:hidden">
                  <Filters
                    options={filterOptions}
                    activeFilters={filters}
                    onFiltersChange={setFilters}
                    isOpen={false}
                    onToggle={() => setIsFiltersOpen(!isFiltersOpen)}
                  />
                </div>
                
                <p className="text-muted-foreground">
                  عرض {filteredProducts.length} منتج
                  {searchQuery && ` من البحث عن "${searchQuery}"`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Select value={sortBy} onValueChange={handleSortChange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="ترتيب حسب" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">الأحدث</SelectItem>
                    <SelectItem value="oldest">الأقدم</SelectItem>
                    <SelectItem value="price-low">السعر: الأقل أولاً</SelectItem>
                    <SelectItem value="price-high">السعر: الأعلى أولاً</SelectItem>
                    <SelectItem value="name">الاسم</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex border rounded-lg">
                  <Button
                    variant={isGridView ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setIsGridView(true)}
                    className="rounded-l-lg rounded-r-none"
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={!isGridView ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setIsGridView(false)}
                    className="rounded-r-lg rounded-l-none"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            {paginatedProducts.length > 0 ? (
              <div className={`grid gap-6 ${
                isGridView 
                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                  : 'grid-cols-1'
              }`}>
                {paginatedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <SlidersHorizontal className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">لا توجد منتجات</h3>
                <p className="text-muted-foreground">
                  لم نجد أي منتجات تطابق معايير البحث الحالية
                </p>
              </div>
            )}

            {/* Pagination */}
            {filteredProducts.length > pagination.limit && (
              <div className="mt-8">
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(filteredProducts.length / pagination.limit)}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Shop;