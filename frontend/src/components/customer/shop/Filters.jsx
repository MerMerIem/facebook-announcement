import { useState } from 'react';
import { ChevronDown, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const Filters = ({ options, activeFilters, onFiltersChange, isOpen = true, onToggle }) => {
  const [openSections, setOpenSections] = useState({
    categories: true,
    subcategories: true,
    tags: true,
    price: true,
    discount: true,
  });

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleCategoryChange = (categoryId, checked) => {
    const newCategories = checked
      ? [...activeFilters.categories, categoryId]
      : activeFilters.categories.filter(id => id !== categoryId);
    
    onFiltersChange({ ...activeFilters, categories: newCategories });
  };

  const handleSubcategoryChange = (subcategoryId, checked) => {
    const newSubcategories = checked
      ? [...activeFilters.subcategories, subcategoryId]
      : activeFilters.subcategories.filter(id => id !== subcategoryId);
    
    onFiltersChange({ ...activeFilters, subcategories: newSubcategories });
  };

  const handleTagChange = (tagId, checked) => {
    const newTags = checked
      ? [...activeFilters.tags, tagId]
      : activeFilters.tags.filter(id => id !== tagId);
    
    onFiltersChange({ ...activeFilters, tags: newTags });
  };

  const handlePriceChange = (value) => {
    onFiltersChange({ ...activeFilters, priceRange: [value[0], value[1]] });
  };

  const handleDiscountChange = (checked) => {
    onFiltersChange({ ...activeFilters, hasDiscount: checked });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      categories: [],
      subcategories: [],
      tags: [],
      priceRange: options.priceRange,
      hasDiscount: false,
    });
  };

  const getActiveFiltersCount = () => {
    return activeFilters.categories.length + 
           activeFilters.subcategories.length + 
           activeFilters.tags.length + 
           (activeFilters.hasDiscount ? 1 : 0);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ar-DZ', {
      style: 'currency',
      currency: 'DZD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (!isOpen) {
    return (
      <Button onClick={onToggle} variant="outline" className="w-full md:w-auto">
        <Filter className="h-4 w-4 ml-2" />
        الفلاتر
        {getActiveFiltersCount() > 0 && (
          <Badge variant="destructive" className="mr-2">
            {getActiveFiltersCount()}
          </Badge>
        )}
      </Button>
    );
  }

  return (
    <Card className="animate-slide-up">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            الفلاتر
          </CardTitle>
          <div className="flex items-center gap-2">
            {getActiveFiltersCount() > 0 && (
              <Button onClick={clearAllFilters} variant="ghost" size="sm">
                مسح الكل
              </Button>
            )}
            {onToggle && (
              <Button onClick={onToggle} variant="ghost" size="sm">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Categories */}
        <Collapsible open={openSections.categories} onOpenChange={() => toggleSection('categories')}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              <span className="font-medium">الفئات</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${openSections.categories ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 mt-3">
            {options.categories.map((category) => (
              <div key={category.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`category-${category.id}`}
                  checked={activeFilters.categories.includes(category.id)}
                  onCheckedChange={(checked) => handleCategoryChange(category.id, checked)}
                />
                <label 
                  htmlFor={`category-${category.id}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer"
                >
                  {category.name}
                  {category.count && (
                    <span className="text-muted-foreground ml-1">({category.count})</span>
                  )}
                </label>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Subcategories */}
        {options.subcategories.length > 0 && (
          <Collapsible open={openSections.subcategories} onOpenChange={() => toggleSection('subcategories')}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                <span className="font-medium">الفئات الفرعية</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${openSections.subcategories ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 mt-3">
              {options.subcategories.map((subcategory) => (
                <div key={subcategory.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`subcategory-${subcategory.id}`}
                    checked={activeFilters.subcategories.includes(subcategory.id)}
                    onCheckedChange={(checked) => handleSubcategoryChange(subcategory.id, checked)}
                  />
                  <label 
                    htmlFor={`subcategory-${subcategory.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer"
                  >
                    {subcategory.name}
                    {subcategory.count && (
                      <span className="text-muted-foreground ml-1">({subcategory.count})</span>
                    )}
                  </label>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Tags */}
        {options.tags.length > 0 && (
          <Collapsible open={openSections.tags} onOpenChange={() => toggleSection('tags')}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                <span className="font-medium">الوسوم</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${openSections.tags ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 mt-3">
              {options.tags.map((tag) => (
                <div key={tag.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`tag-${tag.id}`}
                    checked={activeFilters.tags.includes(tag.id)}
                    onCheckedChange={(checked) => handleTagChange(tag.id, checked)}
                  />
                  <label 
                    htmlFor={`tag-${tag.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer"
                  >
                    {tag.name}
                    {tag.count && (
                      <span className="text-muted-foreground ml-1">({tag.count})</span>
                    )}
                  </label>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Discount Filter */}
        <Collapsible open={openSections.discount} onOpenChange={() => toggleSection('discount')}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              <span className="font-medium">العروض</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${openSections.discount ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="has-discount"
                checked={activeFilters.hasDiscount}
                onCheckedChange={handleDiscountChange}
              />
              <label 
                htmlFor="has-discount"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                المنتجات المخفضة فقط
              </label>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

export default Filters;