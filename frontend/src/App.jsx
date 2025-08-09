import React, { useEffect } from "react";
import { Toaster } from "sonner"; // Import directly from sonner
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/customer/Index";
import ProductDetails from "./pages/customer/ProductDetail";
import Shop from "./pages/customer/Shop";
import Cart from "./pages/customer/Cart";
import Checkout from "./pages/customer/Checkout";
import OrderSuccess from "./pages/customer/OrderSuccess";
import AdminLogin from "./pages/admin/AdminLogin";
import { AdminLayout } from "./components/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Categories from "./pages/admin/Categories";
import Subcategories from "./pages/admin/Subcategories";
import Tags from "./pages/admin/Tags";
import Wilayas from "./pages/admin/Wilayas";
import Products from "./pages/admin/Products";
import Orders from "./pages/admin/Orders";
import { AdminProfile } from "./components/admin/AdminProfile";
// import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./contexts/protectedRoute";
import AuthProvider from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import { setupPushNotifications } from "./lib/pushNotifications";

import AddProductPage from "@/pages/admin/AddProductPage";
import AddProductVariant from "@/pages/admin/AddProductVarient";

import ModifyProduct from "@/pages/admin/ModifyProduct";
const queryClient = new QueryClient();

function App() {
  useEffect(() => {
    if (
      window.location.pathname === "/admin" ||
      window.location.pathname === "/admin/dashboard"
    ) {
      setupPushNotifications();
    }
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <AuthProvider>
          <TooltipProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/product/:id" element={<ProductDetails />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/order-success" element={<OrderSuccess />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route element={<ProtectedRoute />}>
                  {/* <Route path="/admin/dashboard" element={<AdminDashboard />} /> */}
                  <Route
                    path="/admin/dashboard"
                    element={
                      <AdminLayout>
                        <Dashboard />
                      </AdminLayout>
                    }
                  />
                  <Route
                    path="/admin/categories"
                    element={
                      <AdminLayout>
                        <Categories />
                      </AdminLayout>
                    }
                  />
                  <Route
                    path="/admin/subcategories"
                    element={
                      <AdminLayout>
                        <Subcategories />
                      </AdminLayout>
                    }
                  />
                  <Route
                    path="/admin/tags"
                    element={
                      <AdminLayout>
                        <Tags />
                      </AdminLayout>
                    }
                  />
                  <Route
                    path="/admin/wilayas"
                    element={
                      <AdminLayout>
                        <Wilayas />
                      </AdminLayout>
                    }
                  />
                  <Route
                    path="/admin/products"
                    element={
                      <AdminLayout>
                        <Products />
                      </AdminLayout>
                    }
                  />
                  <Route
                    path="/admin/products/:productId/add-variants"
                    element={
                      <AdminLayout>
                        <AddProductVariant />
                      </AdminLayout>
                    }
                  />

                  <Route
                    path="/admin/orders"
                    element={
                      <AdminLayout>
                        <Orders />
                      </AdminLayout>
                    }
                  />
                  <Route
                    path="/admin/add-product"
                    element={
                      <AdminLayout>
                        <AddProductPage />
                      </AdminLayout>
                    }
                  />
                  <Route
                    path="/admin/edit-product/:id"
                    element={
                      <AdminLayout>
                        <ModifyProduct />
                      </AdminLayout>
                    }
                  />
                  <Route
                    path="/admin/profile"
                    element={
                      <AdminLayout>
                        <AdminProfile />
                      </AdminLayout>
                    }
                  />
                </Route>

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </CartProvider>
    </QueryClientProvider>
  );
}

export default App;
