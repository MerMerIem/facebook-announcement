import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useState,
  useRef,
} from "react";
import { useApi } from "@/contexts/RestContext";

const CartContext = createContext(null);

const CART_STORAGE_KEY = "hardware_store_cart";
let totalLenght;

const calculateTotal = (items, pricingData = null) => {
  console.log("Calculating total for items:", items);

  if (pricingData?.pricing_details) {
    // Use server pricing if available
    return pricingData.subtotal;
  }

  // Fallback to local calculation
  return items.reduce((total, item) => {
    const hasDiscount =
      item.product?.used_discount === true || item.product?.used_discount === 1;
    const originalPrice = parseFloat(item.product.price || "0");
    const discountPrice = parseFloat(item.product.discount_price || "0");
    const currentPrice =
      hasDiscount && discountPrice > 0 ? discountPrice : originalPrice;
    return total + currentPrice * item.quantity;
  }, 0);
};

// Fixed: Now returns array length instead of sum of quantities
const calculateItemCount = (items) => {
  return items.length;
};

const cartReducer = (state, action) => {
  let newItems;

  // Helper function to generate unique cart item identifier
  const generateCartItemId = () => Date.now() + Math.random();

  // Helper function to determine if items should be treated as separate line items
  const shouldCreateSeparateLineItem = (product, existingItem = null) => {
    // Always create separate line items for products with measure units
    if (product.has_measure_unit) {
      return true;
    }

    // Always create separate line items for products with variants
    if (product.variant_id || product.selectedVariant) {
      return true;
    }

    // If product has custom options/attributes, create separate line items
    if (
      product.custom_options &&
      Object.keys(product.custom_options).length > 0
    ) {
      return true;
    }

    // For products with expiry dates or batch numbers
    if (product.batch_number || product.expiry_date) {
      return true;
    }

    // For products with different pricing tiers or discounts
    if (product.price_tier || product.applied_discount) {
      return true;
    }

    return false;
  };

  // Helper function to check if two items can be merged
  const canMergeItems = (item1, item2) => {
    const product1 = item1.product;
    const product2 = item2.product;

    // Same product ID
    if (product1.id !== product2.id) return false;

    // Same variant (if any)
    const variant1 = product1.variant_id || product1.selectedVariant?.id;
    const variant2 = product2.variant_id || product2.selectedVariant?.id;
    if (variant1 !== variant2) return false;

    // Same custom options (if any)
    const options1 = JSON.stringify(product1.custom_options || {});
    const options2 = JSON.stringify(product2.custom_options || {});
    if (options1 !== options2) return false;

    // Same batch/expiry info
    if (product1.batch_number !== product2.batch_number) return false;
    if (product1.expiry_date !== product2.expiry_date) return false;

    // Same pricing tier
    if (product1.price_tier !== product2.price_tier) return false;

    return true;
  };

  // Helper function to find existing item that can be merged
  const findMergeableItem = (items, newProduct) => {
    return items.findIndex((item) =>
      canMergeItems(item, { product: newProduct })
    );
  };

  switch (action.type) {
    case "ADD_ITEM":
      const quantity = action.quantity || 1;

      if (shouldCreateSeparateLineItem(action.product)) {
        // Create separate line item - don't merge with existing items
        const newItem = {
          product: action.product,
          quantity: quantity,
          _cartItemId: generateCartItemId(),
          // Store metadata for easy identification
          _itemType: {
            hasMeasureUnit: !!action.product.has_measure_unit,
            hasVariant: !!(
              action.product.variant_id || action.product.selectedVariant
            ),
            hasCustomOptions: !!(
              action.product.custom_options &&
              Object.keys(action.product.custom_options).length > 0
            ),
            hasBatch: !!(
              action.product.batch_number || action.product.expiry_date
            ),
            hasPriceTier: !!(
              action.product.price_tier || action.product.applied_discount
            ),
          },
        };

        newItems = [...state.items, newItem];
      } else {
        // Regular products - try to merge with existing items
        const existingItemIndex = findMergeableItem(
          state.items,
          action.product
        );

        if (existingItemIndex !== -1) {
          // Merge with existing item
          newItems = state.items.map((item, index) =>
            index === existingItemIndex
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        } else {
          // Add new item
          newItems = [
            ...state.items,
            {
              product: action.product,
              quantity: quantity,
              _cartItemId: generateCartItemId(),
              _itemType: {
                hasMeasureUnit: false,
                hasVariant: false,
                hasCustomOptions: false,
                hasBatch: false,
                hasPriceTier: false,
              },
            },
          ];
        }
      }

      return {
        ...state,
        items: newItems,
        total: calculateTotal(newItems, state.pricingData),
        itemCount: calculateItemCount(newItems),
      };

    case "REMOVE_ITEM":
      newItems = state.items.filter((item) => {
        // Remove by cartItemId (preferred method)
        if (action.cartItemId) {
          return item._cartItemId !== action.cartItemId;
        }
        // Fallback: remove by product id (only for items without variants/special attributes)
        if (action.productId && !shouldCreateSeparateLineItem(item.product)) {
          return item.product?.id !== action.productId;
        }
        // If neither cartItemId nor valid productId, keep the item
        return true;
      });

      return {
        ...state,
        items: newItems,
        total: calculateTotal(newItems, state.pricingData),
        itemCount: calculateItemCount(newItems),
      };

    case "UPDATE_QUANTITY":
      if (action.quantity <= 0) {
        // Remove item if quantity is 0 or less
        newItems = state.items.filter((item) => {
          if (action.cartItemId) {
            return item._cartItemId !== action.cartItemId;
          }
          if (action.productId && !shouldCreateSeparateLineItem(item.product)) {
            return item.product?.id !== action.productId;
          }
          return true;
        });
      } else {
        // Update quantity
        newItems = state.items.map((item) => {
          // Update by cartItemId (preferred)
          if (action.cartItemId && item._cartItemId === action.cartItemId) {
            return { ...item, quantity: action.quantity };
          }
          // Fallback: update by product id (only for simple products)
          if (
            !action.cartItemId &&
            action.productId &&
            item.product?.id === action.productId &&
            !shouldCreateSeparateLineItem(item.product)
          ) {
            return { ...item, quantity: action.quantity };
          }
          return item;
        });
      }

      return {
        ...state,
        items: newItems,
        total: calculateTotal(newItems, state.pricingData),
        itemCount: calculateItemCount(newItems),
      };

    case "CLEAR_CART":
      return {
        ...state,
        items: [],
        total: 0,
        itemCount: 0,
        pricingData: null,
      };

    case "LOAD_CART":
      const loadedItems = (action.items || []).map((item) => ({
        ...item,
        // Ensure loaded items have cartItemId and itemType metadata
        _cartItemId: item._cartItemId || generateCartItemId(),
        _itemType: item._itemType || {
          hasMeasureUnit: !!item.product?.has_measure_unit,
          hasVariant: !!(
            item.product?.variant_id || item.product?.selectedVariant
          ),
          hasCustomOptions: !!(
            item.product?.custom_options &&
            Object.keys(item.product.custom_options).length > 0
          ),
          hasBatch: !!(item.product?.batch_number || item.product?.expiry_date),
          hasPriceTier: !!(
            item.product?.price_tier || item.product?.applied_discount
          ),
        },
      }));

      return {
        ...state,
        items: loadedItems,
        total: calculateTotal(loadedItems),
        itemCount: calculateItemCount(loadedItems),
      };

    case "UPDATE_PRICING_DATA":
      const updatedTotal = action.pricingData
        ? action.pricingData.subtotal
        : calculateTotal(state.items);

      return {
        ...state,
        pricingData: action.pricingData,
        total: updatedTotal,
        // Keep using local itemCount (array length) instead of server items_count
        itemCount: calculateItemCount(state.items),
      };

    // New action to merge similar items (optional)
    case "MERGE_SIMILAR_ITEMS":
      const mergedItems = [];
      const processedIds = new Set();

      state.items.forEach((item) => {
        if (processedIds.has(item._cartItemId)) return;

        if (shouldCreateSeparateLineItem(item.product)) {
          // Don't merge items that should be separate
          mergedItems.push(item);
          processedIds.add(item._cartItemId);
        } else {
          // Find all similar items and merge them
          const similarItems = state.items.filter(
            (otherItem) =>
              !processedIds.has(otherItem._cartItemId) &&
              canMergeItems(item, otherItem)
          );

          const totalQuantity = similarItems.reduce((sum, similarItem) => {
            processedIds.add(similarItem._cartItemId);
            return sum + similarItem.quantity;
          }, 0);

          mergedItems.push({
            ...item,
            quantity: totalQuantity,
          });
        }
      });

      return {
        ...state,
        items: mergedItems,
        total: calculateTotal(mergedItems, state.pricingData),
        itemCount: calculateItemCount(mergedItems),
      };

    default:
      return state;
  }
};

// Helper functions for localStorage operations
const saveCartToStorage = (items) => {
  try {
    // Store more complete product information
    const itemsToStore = items.map((item) => ({
      product: {
        id: item.product.id,
        name: item.product.name,
        price: item.product.price,
        discount_price: item.product.discount_price,
        main_image_url: item.product.main_image_url,
        description: item.product.description,
        category: item.product.category,
        subcategory: item.product.subcategory,
        used_discount: item.product.used_discount,
        has_measure_unit: item.product.has_measure_unit,
        measure_unit: item.product.measure_unit,
        has_variants: item.product.has_variants,
        is_variant: item.product.is_variant,
        parent_product_id: item.product.parent_product_id,
        variant_title: item.product.variant_title,
        size: item.product.size,
        // Store any additional fields that might be needed
        ...item.product,
      },
      quantity: item.quantity,
      _cartItemId: item._cartItemId, // Preserve cart item ID
    }));
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(itemsToStore));
  } catch (error) {
    console.error("Error saving cart to localStorage:", error);
  }
};

const loadCartFromStorage = () => {
  try {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);

    if (savedCart) {
      const parsed = JSON.parse(savedCart);
      totalLenght = parsed.length;
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (error) {
    console.error("Error loading cart from localStorage:", error);
  }
  return [];
};

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    total: 0,
    itemCount: 0,
    pricingData: null,
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const [loadingPricing, setLoadingPricing] = useState(false);

  // Use ref to track last API call to prevent duplicates
  const lastApiCallRef = useRef("");
  const abortControllerRef = useRef(null);

  const { api } = useApi();

  // Load cart from localStorage on mount
  useEffect(() => {
    const loadCart = () => {
      const savedItems = loadCartFromStorage();
      if (savedItems.length > 0) {
        dispatch({ type: "LOAD_CART", items: savedItems });
      }
      setIsInitialized(true);
    };

    const timer = setTimeout(loadCart, 100);
    return () => clearTimeout(timer);
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (isInitialized) {
      saveCartToStorage(state.items);
    }
  }, [state.items, isInitialized]);

  // Improved fetchPricing with duplicate prevention
  const fetchPricing = async () => {
    if (state.items.length === 0) {
      dispatch({ type: "UPDATE_PRICING_DATA", pricingData: null });
      return;
    }

    // Create a unique signature for this API call
    const apiCallSignature = JSON.stringify(
      state.items.map((item) => ({
        id: item.product?.id,
        quantity: item.quantity,
      }))
    );

    // Skip if this exact call was already made
    if (lastApiCallRef.current === apiCallSignature) {
      console.log("Skipping duplicate API call");
      return;
    }

    // Cancel previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setLoadingPricing(true);
    lastApiCallRef.current = apiCallSignature;

    try {
      const requestBody = {
        items: state.items.map((item) => ({
          product_id: item.product?.id,
          quantity: item.quantity,
        })),
      };

      console.log("Making pricing API call:", requestBody);

      const [pricingResult, response, responseCode, error] = await api.post(
        "/order/calculate-pricing",
        requestBody
      );

      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        console.log("API request was aborted");
        return;
      }

      if (
        responseCode === 200 &&
        pricingResult?.success &&
        pricingResult?.data
      ) {
        const enhancedPricingData = {
          ...pricingResult.data,
          // Add a lookup map for easier access
          pricingLookup: pricingResult.data.pricing_details.reduce(
            (acc, detail) => {
              acc[detail.product_id] = detail;
              return acc;
            },
            {}
          ),
        };

        dispatch({
          type: "UPDATE_PRICING_DATA",
          pricingData: enhancedPricingData,
        });
      } else {
        console.error("Failed to fetch pricing:", error);
        dispatch({ type: "UPDATE_PRICING_DATA", pricingData: null });
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Error fetching pricing:", error);
        dispatch({ type: "UPDATE_PRICING_DATA", pricingData: null });
      }
    } finally {
      setLoadingPricing(false);
      abortControllerRef.current = null;
    }
  };

  // Fixed useEffect with proper dependency tracking
  useEffect(() => {
    if (!isInitialized) return;

    if (state.items.length > 0) {
      const timeoutId = setTimeout(() => {
        fetchPricing();
      }, 300);

      return () => clearTimeout(timeoutId);
    } else {
      dispatch({ type: "UPDATE_PRICING_DATA", pricingData: null });
      lastApiCallRef.current = "";
    }
  }, [
    // Use stringified version to avoid reference issues
    JSON.stringify(
      state.items.map((item) => ({
        id: item.product?.id,
        quantity: item.quantity,
      }))
    ),
    isInitialized,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Updated addItem function to handle quantity parameter
  const addItem = (product, quantity = null) => {
    // Store complete product information
    const completeProduct = {
      id: product.id,
      name: product.name,
      price: product.price,
      discount_price: product.discount_price,
      main_image_url: product.main_image_url,
      description: product.description,
      category: product.category,
      subcategory: product.subcategory,
      used_discount: product.used_discount,
      has_measure_unit: product.has_measure_unit,
      measure_unit: product.measure_unit,
      has_variants: product.has_variants,
      is_variant: product.is_variant,
      parent_product_id: product.parent_product_id,
      variant_title: product.variant_title,
      size: product.size,
      // Include any additional fields from the product
      ...product,
    };

    console.log("Adding item to cart:", completeProduct, "quantity:", quantity);
    dispatch({
      type: "ADD_ITEM",
      product: completeProduct,
      quantity: quantity,
    });
  };

  const removeItem = (cartItemId) => {
    dispatch({ type: "REMOVE_ITEM", cartItemId, productId: null });
  };

  const updateQuantity = (
    cartItemIdOrProductId,
    quantity,
    cartItemId = null
  ) => {
    // If cartItemId is provided as third parameter, use the old signature
    if (cartItemId !== null) {
      console.log(
        "Updating quantity (old signature):",
        cartItemIdOrProductId,
        quantity,
        "cartItemId:",
        cartItemId
      );
      dispatch({
        type: "UPDATE_QUANTITY",
        productId: cartItemIdOrProductId,
        quantity,
        cartItemId,
      });
      return;
    }

    // New signature: first parameter is cartItemId
    // Check if the first parameter looks like a cartItemId (timestamp-based)
    const isCartItemId =
      typeof cartItemIdOrProductId === "number" &&
      cartItemIdOrProductId > 1000000000000; // Timestamp check

    if (isCartItemId) {
      console.log(
        "Updating quantity by cartItemId:",
        cartItemIdOrProductId,
        "quantity:",
        quantity
      );
      dispatch({
        type: "UPDATE_QUANTITY",
        cartItemId: cartItemIdOrProductId,
        quantity,
        productId: null,
      });
    } else {
      console.log(
        "Updating quantity by productId:",
        cartItemIdOrProductId,
        "quantity:",
        quantity
      );
      dispatch({
        type: "UPDATE_QUANTITY",
        productId: cartItemIdOrProductId,
        quantity,
        cartItemId: null,
      });
    }
  };
  const clearCart = () => {
    console.log("Clearing cart");
    dispatch({ type: "CLEAR_CART" });
    lastApiCallRef.current = "";
  };

  const getItemQuantity = (productId) => {
    const item = state.items.find((item) => item.product?.id === productId);
    return item ? item.quantity : 0;
  };

  // Helper to get server pricing for an item
  const getServerPricing = (productId) => {
    return state.pricingData?.pricingLookup?.[productId] || null;
  };

  // Get the effective price for an item (server price if available, otherwise local)
  const getEffectivePrice = (productId) => {
    const serverPricing = getServerPricing(productId);
    if (serverPricing) {
      return {
        unitPrice: serverPricing.unit_price,
        originalPrice: serverPricing.original_price,
        discountPrice: serverPricing.discount_price,
        usedDiscount: serverPricing.used_discount,
        savings: serverPricing.savings,
        isFromServer: true,
      };
    }

    // Fallback to local product data
    const item = state.items.find((item) => item.product?.id === productId);
    if (item) {
      const product = item.product;
      const hasDiscount =
        product?.used_discount === true || product?.used_discount === 1;
      const originalPrice = parseFloat(product.price || "0");
      const discountPrice = parseFloat(product.discount_price || "0");
      const currentPrice =
        hasDiscount && discountPrice > 0 ? discountPrice : originalPrice;

      return {
        unitPrice: currentPrice,
        originalPrice: originalPrice,
        discountPrice: discountPrice,
        usedDiscount: hasDiscount,
        savings:
          hasDiscount && discountPrice > 0 ? originalPrice - discountPrice : 0,
        isFromServer: false,
      };
    }

    return null;
  };

  // Get delivery options for a specific wilaya
  const getDeliveryOption = (wilayaId) => {
    if (!state.pricingData?.delivery_options) return null;
    return state.pricingData.delivery_options.find(
      (option) => option.wilaya_id === wilayaId
    );
  };

  // Get all available wilayas
  const getWilayas = () => {
    return state.pricingData?.wilayas || [];
  };

  // Get pricing details for display
  const getPricingDetails = () => {
    return {
      subtotal: state.pricingData?.subtotal || state.total,
      totalSavings: state.pricingData?.total_savings || 0,
      itemsCount: state.itemCount, // Use local itemCount (array length)
      pricingDetails: state.pricingData?.pricing_details || [],
      hasServerPricing: !!state.pricingData,
    };
  };

  // Get cart summary with both local and server data
  const getCartSummary = () => {
    const summary = {
      items: state.items,
      itemCount: state.itemCount,
      total: state.total,
      hasServerPricing: !!state.pricingData,
      serverData: state.pricingData
        ? {
            subtotal: state.pricingData.subtotal,
            totalSavings: state.pricingData.total_savings,
            itemsCount: state.itemCount, // Use local itemCount
          }
        : null,
    };

    return summary;
  };

  return (
    <CartContext.Provider
      value={{
        ...state,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getItemQuantity,
        getServerPricing,
        getEffectivePrice,
        getDeliveryOption,
        getWilayas,
        getPricingDetails,
        getCartSummary,
        loadingPricing,
        fetchPricing,
        isInitialized,
        totalLenght,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
