import React from "react";
import { Toaster } from "sonner"; // Import directly from sonner
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import ProductDetails from "./pages/ProductDetails";
import AdminLogin from "./pages/admin/AdminLogin";
import { AdminLayout } from "./components/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Categories from "./pages/admin/Categories";
import Subcategories from "./pages/admin/Subcategories";
import Tags from "./pages/admin/Tags";
import Wilayas from "./pages/admin/Wilayas";
import Products from "./pages/admin/Products";
import Orders from "./pages/admin/Orders";
// import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./contexts/protectedRoute";
import AuthProvider from "./contexts/AuthContext";
import AddProductPage from "@/pages/admin/AddProductPage";

import ModifyProduct from "@/pages/admin/ModifyProduct";
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/product/:id" element={<ProductDetails />} />
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
              </Route>

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
