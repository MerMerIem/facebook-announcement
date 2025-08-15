import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Tags,
  MapPin,
  ShoppingCart,
  Users,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

const menuItems = [
  {
    title: "لوحة التحكم",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "المنتجات",
    icon: Package,
    href: "/admin/products"
  },
  {
    title: "التصنيفات",
    icon: FolderTree,
    children: [
      { title: "الفئات الرئيسية", href: "/admin/categories" },
      { title: "الفئات الفرعية", href: "/admin/subcategories" },
    ],
  },
  {
    title: "العلامات",
    href: "/admin/tags",
    icon: Tags,
  },
  {
    title: "الولايات",
    href: "/admin/wilayas",
    icon: MapPin,
  },
  {
    title: "الطلبات",
    href: "/admin/orders",
    icon: ShoppingCart,
  },
];

export function Sidebar({ collapsed }) {
  const [expandedItems, setExpandedItems] = useState([]);
  const location = useLocation();

  const toggleExpanded = (title) => {
    setExpandedItems((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    );
  };

  const isActive = (href) => location.pathname === href;
  const isParentActive = (children) =>
    children.some((child) => location.pathname === child.href);

  return (
    <div
      className={cn(
        "fixed right-0 top-0 h-full bg-sidebar border-l border-sidebar-border transition-all duration-300 z-40",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-9 bg-admin-gradient rounded-lg flex items-center justify-center">
            <Package className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-sidebar-foreground font-bold text-lg">
                متجر الأدوات
              </h1>
            </div>
          )}
        </div>
      </div>

      <nav className="p-2 space-y-1">
        {menuItems.map((item) => {
          if (item.children) {
            const isExpanded = expandedItems.includes(item.title);
            const hasActiveChild = isParentActive(item.children);

            return (
              <div key={item.title}>
                <button
                  onClick={() => !collapsed && toggleExpanded(item.title)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors",
                    // Better contrast for active parent items
                    hasActiveChild && "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100"
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-right">{item.title}</span>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </>
                  )}
                </button>
                {!collapsed && isExpanded && (
                  <div className="mt-1 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        to={child.href}
                        className={cn(
                          "block px-3 py-2 mr-6 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent transition-colors text-right",
                          // Much better contrast for active child items
                          isActive(child.href) &&
                            "bg-blue-600 text-white font-medium shadow-sm"
                        )}
                      >
                        {child.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors",
                // Better contrast for active main items
                isActive(item.href) &&
                  "bg-blue-600 text-white font-medium shadow-sm"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && (
                <span className="flex-1 text-right">{item.title}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}