import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Grid, List, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/customer/layout/Header';
import ProductCard from '@/components/customer/shop/ProductCard';
import Filters from '@/components/customer/shop/Filters';
import Pagination from '@/components/customer/shop/Pagination';
import { useApi } from '@/contexts/RestContext';
import { useToast } from '@/hooks/use-toast';

const Shop = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGridView, setIsGridView] = useState(true);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('newest');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 8,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
  });

  // New state for filter options
  const [filterOptions, setFilterOptions] = useState({
    categories: [],
    subcategories: [],
    tags: [],
    priceRange: [0, 50000]
  });
  const [isFilterOptionsLoading, setIsFilterOptionsLoading] = useState(true);

  const { api } = useApi();
  const { toast } = useToast();
  
  const searchQuery = searchParams.get('search') || '';
  const categoryFilter = searchParams.get('category');

  const [filters, setFilters] = useState({
    categories: categoryFilter ? [parseInt(categoryFilter)] : [],
    subcategories: [],
    tags: [],
    priceRange: [0, 50000],
    hasDiscount: false,
  });

  // Fetch filter options from API
  const fetchFilterOptions = async () => {
    try {
      setIsFilterOptionsLoading(true);
      
      // Fetch categories (get all pages to have complete data for filtering)
      const [categoriesData, categoriesResponse, categoriesCode, categoriesError] = await api.get('/category/getAll?limit=100');
      
      // Fetch subcategories (get all pages)
      const [subcategoriesData, subcategoriesResponse, subcategoriesCode, subcategoriesError] = await api.get('/subcategory/getAll?limit=100');
      
      // Fetch tags (get all pages)
      const [tagsData, tagsResponse, tagsCode, tagsError] = await api.get('/tag/getAll?limit=100');

      const newFilterOptions = {
        categories: [],
        subcategories: [],
        tags: [],
        priceRange: [0, 50000]
      };

      // Process categories
      if (categoriesCode === 200 && categoriesData?.success) {
        newFilterOptions.categories = categoriesData.categories.map(cat => ({
          id: cat.id,
          name: cat.name,
          count: cat.subcategory_count || 0
        }));
      } else {
        console.error('Failed to fetch categories:', categoriesError);
      }

      // Process subcategories
      if (subcategoriesCode === 200 && subcategoriesData?.success) {
        newFilterOptions.subcategories = subcategoriesData.subcategories.map(sub => ({
          id: sub.id,
          name: sub.name,
          categoryId: sub.category_id,
          count: 0 // You might want to add a count field to your subcategories API
        }));
      } else {
        console.error('Failed to fetch subcategories:', subcategoriesError);
      }

      // Process tags
      if (tagsCode === 200 && tagsData?.success) {
        newFilterOptions.tags = tagsData.tags.map(tag => ({
          id: tag.id,
          name: tag.name,
          count: 0 // You might want to add a count field to your tags API
        }));
      } else {
        console.error('Failed to fetch tags:', tagsError);
      }

      setFilterOptions(newFilterOptions);

    } catch (error) {
      console.error('Error fetching filter options:', error);
      toast({
        title: 'خطأ في تحميل الفلاتر',
        description: 'فشل في تحميل خيارات الفلترة',
        variant: 'destructive',
      });
    } finally {
      setIsFilterOptionsLoading(false);
    }
  };

  // Update filters when URL category changes
  useEffect(() => {
    if (categoryFilter) {
      // If categoryFilter is a name (string), find the corresponding ID for filters
      let categoryId;
      if (isNaN(categoryFilter)) {
        const category = filterOptions.categories.find(cat => cat.name === categoryFilter);
        categoryId = category?.id;
      } else {
        categoryId = parseInt(categoryFilter);
      }
      
      if (categoryId) {
        setFilters(prev => ({
          ...prev,
          categories: [categoryId]
        }));
      }
    } else {
      setFilters(prev => ({
        ...prev,
        categories: []
      }));
    }
  }, [categoryFilter, filterOptions.categories]);

  // Helper function to convert tag IDs to names
  const getTagNamesByIds = (tagIds) => {
    return tagIds.map(id => {
      const tag = filterOptions.tags.find(tag => tag.id === id);
      return tag ? tag.name : null;
    }).filter(name => name !== null);
  };

  // Helper function to convert subcategory IDs to names
  const getSubcategoryNamesByIds = (subcategoryIds) => {
    return subcategoryIds.map(id => {
      const subcategory = filterOptions.subcategories.find(sub => sub.id === id);
      return subcategory ? subcategory.name : null;
    }).filter(name => name !== null);
  };

  // Fetch products from API
  const fetchProducts = async (page = 1, limit = 8) => {
    try {
      setIsLoading(true);
      
      // Build query parameters
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      // Add search query if exists
      if (searchQuery) {
        queryParams.set('searchQuery', searchQuery);
      }

      // Add category filter - send category NAME instead of ID
      if (categoryFilter) {
        // If categoryFilter is already a name (string), use it directly
        if (isNaN(categoryFilter)) {
          queryParams.set('category', categoryFilter);
        } else {
          // If it's an ID, convert it to name
          const category = filterOptions.categories.find(cat => cat.id === parseInt(categoryFilter));
          if (category) {
            queryParams.set('category', category.name);
          }
        }
      }

      // Add subcategory filter - convert IDs to names
      if (filters.subcategories.length > 0) {
        const subcategoryNames = getSubcategoryNamesByIds(filters.subcategories);
        if (subcategoryNames.length > 0) {
          queryParams.set('subcategory', subcategoryNames.join(','));
        }
      }

      // Add tags filter - convert IDs to names
      if (filters.tags.length > 0) {
        const tagNames = getTagNamesByIds(filters.tags);
        if (tagNames.length > 0) {
          queryParams.set('tags', tagNames.join(','));
        }
      }

      if (filters.hasDiscount) {
        queryParams.set('hasDiscount', 'true');
      }

      // Add sorting
      if (sortBy && sortBy !== 'newest') {
        queryParams.set('sort', sortBy);
      }

      console.log('Fetching products with params:', queryParams.toString());

      // Updated API endpoint to match your API structure
      const [data, response, responseCode, error] = await api.get(`/product/search?${queryParams.toString()}`);
      
      if (responseCode === 200 && data && data.success) {
        // Handle the response structure from your API
        setProducts(data.data || []);
        
        // Calculate pagination based on your API response
        const total = data.pagination?.total || 0;
        const totalPages = Math.ceil(total / limit);
        
        setPagination({
          page: page,
          limit: limit,
          total: total,
          totalPages: totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        });
      } else {
        console.error('API Error:', error);
        toast({
          title: 'خطأ في تحميل المنتجات',
          description: error || 'فشل في تحميل المنتجات',
          variant: 'destructive',
        });
        setProducts([]);
        setPagination({
          page: 1,
          limit: 8,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false
        });
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      toast({
        title: 'خطأ في الاتصال',
        description: 'تعذر الاتصال بالخادم',
        variant: 'destructive',
      });
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch of filter options
  useEffect(() => {
    fetchFilterOptions();
  }, []);

  // Initial fetch and refetch when dependencies change
  useEffect(() => {
    // Only fetch products if filter options are loaded (to ensure category name resolution works)
    if (!isFilterOptionsLoading) {
      fetchProducts(currentPage, 8);
    }
  }, [currentPage, searchQuery, categoryFilter, filters, sortBy, isFilterOptionsLoading]);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchQuery, categoryFilter, filters, sortBy]);

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
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    
    // Update URL parameters when filters change
    const params = new URLSearchParams(searchParams);
    
    // Update category in URL if it changed
    if (newFilters.categories.length > 0 && newFilters.categories[0] !== parseInt(categoryFilter)) {
      params.set('category', newFilters.categories[0].toString());
    } else if (newFilters.categories.length === 0) {
      params.delete('category');
    }
    
    setSearchParams(params);
  };

  // Get current category name for display
  const getCurrentCategoryName = () => {
    if (!categoryFilter) return null;
    // If categoryFilter is already a name (string), return it directly
    if (isNaN(categoryFilter)) {
      return categoryFilter;
    }
    // If it's an ID, try to find the name from filterOptions
    const category = filterOptions.categories.find(cat => cat.id === parseInt(categoryFilter));
    return category?.name;
  };

  // Show loading state if filter options are still loading
  if (isFilterOptionsLoading) {
    return (
      <div className="min-h-screen bg-shop-bg">
        <Header onSearch={handleSearch} searchQuery={searchQuery} />
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">جاري تحميل الفلاتر...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-shop-bg">
      <Header onSearch={handleSearch} searchQuery={searchQuery} />
      
      <div className="container mx-auto px-4 py-6">
        {/* Category breadcrumb/title */}
        {getCurrentCategoryName() && (
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-primary mb-2">
              {getCurrentCategoryName()}
            </h1>
            <p className="text-muted-foreground">
              تصفح منتجات فئة {getCurrentCategoryName()}
            </p>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters Sidebar */}
          <div className={`lg:w-80 ${isFiltersOpen ? 'block' : 'hidden lg:block'}`}>
            <Filters
              options={filterOptions}
              activeFilters={filters}
              onFiltersChange={handleFiltersChange}
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
                    onFiltersChange={handleFiltersChange}
                    isOpen={false}
                    onToggle={() => setIsFiltersOpen(!isFiltersOpen)}
                  />
                </div>
                
                <p className="text-muted-foreground">
                  {isLoading ? 'جاري التحميل...' : (
                    <>
                      عرض {pagination.total} منتج
                      {searchQuery && ` من البحث عن "${searchQuery}"`}
                      {getCurrentCategoryName() && ` في فئة ${getCurrentCategoryName()}`}
                    </>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
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

            {/* Loading State */}
            {isLoading ? (
              <div className={`grid gap-6 ${
                isGridView 
                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                  : 'grid-cols-1'
              }`}>
                {[...Array(8)].map((_, index) => (
                  <div key={index} className="animate-pulse">
                    <div className="bg-gray-200 rounded-lg aspect-square mb-4"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length > 0 ? (
              <>
                {/* Products Grid */}
                <div className={`grid gap-6 ${
                  isGridView 
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                    : 'grid-cols-1'
                }`}>
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="mt-8">
                    <Pagination
                      currentPage={pagination.page}
                      totalPages={pagination.totalPages}
                      onPageChange={handlePageChange}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <SlidersHorizontal className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">لا توجد منتجات</h3>
                <p className="text-muted-foreground">
                  {getCurrentCategoryName() 
                    ? `لم نجد أي منتجات في فئة ${getCurrentCategoryName()}`
                    : 'لم نجد أي منتجات تطابق معايير البحث الحالية'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Shop;