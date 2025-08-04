import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useState,
} from "react";
import { useApi } from "@/contexts/RestContext";

const CartContext = createContext(null);

const CART_STORAGE_KEY = "hardware_store_cart";

const calculateTotal = (items) => {
  return items.reduce((total, item) => {
    // Make sure to handle both current_price logic for discounts
    const hasDiscount =
      item.product.has_discount === true || item.product.has_discount === 1;
    const originalPrice = parseFloat(item.product.price || "0");
    const discountPrice = parseFloat(item.product.discount_price || "0");
    const currentPrice =
      hasDiscount && discountPrice > 0 ? discountPrice : originalPrice;

    return total + currentPrice * item.quantity;
  }, 0);
};

const calculateItemCount = (items) => {
  return items.reduce((count, item) => count + item.quantity, 0);
};

const cartReducer = (state, action) => {
  let newItems;

  switch (action.type) {
    case "ADD_ITEM":
      const existingItem = state.items.find(
        (item) => item.product.id === action.product.id
      );

      if (existingItem) {
        newItems = state.items.map((item) =>
          item.product.id === action.product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        newItems = [...state.items, { product: action.product, quantity: 1 }];
      }

      return {
        items: newItems,
        total: calculateTotal(newItems),
        itemCount: calculateItemCount(newItems),
      };

    case "REMOVE_ITEM":
      newItems = state.items.filter(
        (item) => item.product.id !== action.productId
      );
      return {
        items: newItems,
        total: calculateTotal(newItems),
        itemCount: calculateItemCount(newItems),
      };

    case "UPDATE_QUANTITY":
      if (action.quantity <= 0) {
        newItems = state.items.filter(
          (item) => item.product.id !== action.productId
        );
      } else {
        newItems = state.items.map((item) =>
          item.product.id === action.productId
            ? { ...item, quantity: action.quantity }
            : item
        );
      }

      return {
        items: newItems,
        total: calculateTotal(newItems),
        itemCount: calculateItemCount(newItems),
      };

    case "CLEAR_CART":
      return {
        items: [],
        total: 0,
        itemCount: 0,
      };

    case "LOAD_CART":
      const loadedItems = action.items || [];
      return {
        items: loadedItems,
        total: calculateTotal(loadedItems),
        itemCount: calculateItemCount(loadedItems),
      };

    case "UPDATE_SERVER_TOTAL":
      return {
        ...state,
        total: action.total, // Use server-calculated total
      };

    default:
      return state;
  }
};

// Helper functions for localStorage operations
const saveCartToStorage = (items) => {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    console.log("Cart saved to localStorage:", items);
  } catch (error) {
    console.error("Error saving cart to localStorage:", error);
  }
};

const loadCartFromStorage = () => {
  try {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (savedCart) {
      const parsed = JSON.parse(savedCart);
      console.log("Cart loaded from localStorage:", parsed);
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
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const [pricingData, setPricingData] = useState(null); // New state for server pricing
  const [loadingPricing, setLoadingPricing] = useState(false); // New loading state

  const { api } = useApi(); // Use your API hook

  // Load cart from localStorage on mount
  useEffect(() => {
    const loadCart = () => {
      const savedItems = loadCartFromStorage();
      if (savedItems.length > 0) {
        dispatch({ type: "LOAD_CART", items: savedItems });
      }
      setIsInitialized(true);
    };

    // Add a small delay to ensure DOM is ready
    const timer = setTimeout(loadCart, 100);
    return () => clearTimeout(timer);
  }, []);

  // Save cart to localStorage whenever it changes (but only after initialization)
  useEffect(() => {
    if (isInitialized) {
      saveCartToStorage(state.items);
    }
  }, [state.items, isInitialized]);

  // New function to fetch server-side pricing using your API pattern
  const fetchPricing = async () => {
    if (state.items.length === 0) {
      setPricingData(null);
      return;
    }

    setLoadingPricing(true);
    try {
      const requestBody = {
        items: state.items.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
        })),
      };

      const [pricingResult, response, responseCode, error] = await api.post(
        "/order/calculate-pricing",
        requestBody
      );

      if (responseCode === 200 && pricingResult) {
        setPricingData(pricingResult);
        // Update the cart total with server-calculated subtotal
        dispatch({
          type: "UPDATE_SERVER_TOTAL",
          total: pricingResult.subtotal,
        });
        console.log("Pricing data updated:", pricingResult);
      } else {
        console.error("Failed to fetch pricing:", error);
        setPricingData(null);
      }
    } catch (error) {
      console.error("Error fetching pricing:", error);
      setPricingData(null);
    } finally {
      setLoadingPricing(false);
    }
  };

  // Fetch pricing whenever cart items change
  useEffect(() => {
    if (isInitialized && state.items.length > 0) {
      const timeoutId = setTimeout(() => {
        fetchPricing();
      }, 300); // Debounce API calls

      return () => clearTimeout(timeoutId);
    } else if (state.items.length === 0) {
      setPricingData(null);
    }
  }, [state.items, isInitialized, api]);

  // Debug: Log state changes
  useEffect(() => {
    console.log("Cart state updated:", {
      itemCount: state.itemCount,
      total: state.total,
      items: state.items,
      pricingData: pricingData,
    });
  }, [state, pricingData]);

  const addItem = (product) => {
    const simplifiedProduct = {
      id: product.id,
      price: product.price,
      main_image_url: product.main_image_url,
      description: product.description,
    };

    console.log("Adding item to cart:", simplifiedProduct);

    dispatch({ type: "ADD_ITEM", product: simplifiedProduct });
  };

  const removeItem = (productId) => {
    console.log("Removing item from cart:", productId);
    dispatch({ type: "REMOVE_ITEM", productId });
  };

  const updateQuantity = (productId, quantity) => {
    console.log("Updating quantity:", productId, quantity);
    dispatch({ type: "UPDATE_QUANTITY", productId, quantity });
  };

  const clearCart = () => {
    console.log("Clearing cart");
    dispatch({ type: "CLEAR_CART" });
    setPricingData(null); // Clear pricing data when cart is cleared
  };

  const getItemQuantity = (productId) => {
    const item = state.items.find((item) => item.product.id === productId);
    return item ? item.quantity : 0;
  };

  // Debug function to manually check localStorage
  const debugCart = () => {
    console.log(
      "Current localStorage cart:",
      localStorage.getItem(CART_STORAGE_KEY)
    );
    console.log("Current state:", state);
    console.log("Current pricing data:", pricingData);
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
        pricingData, // New: server pricing data
        loadingPricing, // New: loading state
        fetchPricing, // New: manual refresh function
        debugCart, // Remove this in production
        isInitialized,
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
