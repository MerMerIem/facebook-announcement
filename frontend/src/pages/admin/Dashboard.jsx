import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Package,
  FolderTree,
  ShoppingCart,
  Users,
  TrendingUp,
  Calendar,
  DollarSign,
  BarChart3,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { useApi } from "@/contexts/RestContext";
import { useState, useEffect } from "react";

const getStatusText = (status) => {
  const statusMap = {
    pending: "في الانتظار",
    confirmed: "مؤكد",
    processing: "قيد المعالجة",
    shipped: "تم الشحن",
    delivered: "تم التسليم",
    cancelled: "ملغي",
  };
  return statusMap[status] || status;
};

const getStatusStyle = (status) => {
  const statusStyles = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    processing: "bg-orange-100 text-orange-800",
    shipped: "bg-purple-100 text-purple-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };
  return statusStyles[status] || "bg-gray-100 text-gray-800";
};

// Colors for charts
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export default function Dashboard() {
  const { api } = useApi();
  const [recentOrders, setRecentOrders] = useState([]);
  const [todaysOrders, setTodaysOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  const getRecentOrders = async () => {
    try {
      const [data, _, responseCode, error] = await api.get("/order/getRecent");
      console.log("recent", data);
      if (responseCode === 200 && data.success) {
        setRecentOrders(data.orders);
      }
    } catch (error) {
      console.error("Error fetching recent orders:", error);
    }
  };

  const getTodaysOrders = async () => {
    try {
      const [data, _, responseCode, error] = await api.get("/order/getTodays");
      console.log(data);
      if (responseCode === 200 && data.success) {
        setTodaysOrders(data.orders);
      }
    } catch (error) {
      console.error("Error fetching today's orders:", error);
    }
  };

  const getStats = async () => {
    try {
      const [data, _, responseCode, error] = await api.get("/stats");
      console.log(data);
      if (responseCode === 200 && data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([getRecentOrders(), getTodaysOrders(), getStats()]);
      setLoading(false);
    };

    fetchData();
  }, []);

  // Create stats cards from API data
  const getStatsCards = () => {
    if (!stats) return [];

    return [
      {
        title: "المنتجات",
        value: stats.totalProducts?.toString() || "0",
        icon: Package,
        color: "text-blue-600",
        bgColor: "bg-blue-50",
      },
      {
        title: "الفئات",
        value: stats.totalCategories?.toString() || "0",
        icon: FolderTree,
        color: "text-green-600",
        bgColor: "bg-green-50",
      },
      {
        title: "الطلبات",
        value: stats.totalOrders?.toString() || "0",
        icon: ShoppingCart,
        color: "text-orange-600",
        bgColor: "bg-orange-50",
      },
      {
        title: "العملاء",
        value: stats.totalUsers?.toString() || "0",
        icon: Users,
        color: "text-purple-600",
        bgColor: "bg-purple-50",
      },
      {
        title: "إجمالي الإيرادات",
        value: stats.totalRevenue
          ? `${stats.totalRevenue.toLocaleString()} د.ج`
          : "0 د.ج",
        icon: DollarSign,
        color: "text-emerald-600",
        bgColor: "bg-emerald-50",
      },
      {
        title: "متوسط قيمة الطلب",
        value: stats.averageOrderValue
          ? `${Math.round(stats.averageOrderValue).toLocaleString()} د.ج`
          : "0 د.ج",
        icon: TrendingUp,
        color: "text-indigo-600",
        bgColor: "bg-indigo-50",
      },
    ];
  };

  const statsCards = getStatsCards();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">لوحة التحكم</h1>
        <p className="text-muted-foreground mt-2">
          نظرة عامة على إحصائيات المتجر
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, index) => (
              <Card
                key={index}
                className="border-0 p-3 shadow-admin animate-pulse"
              >
                <CardContent className="p-0">
                  <div className="flex items-center space-x-5">
                    <div className="p-3 rounded-lg bg-gray-200 w-12 h-12"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-6 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          : statsCards.map((stat) => (
              <Card key={stat.title} className="border-0 p-3 shadow-admin">
                <CardContent className="p-0">
                  <div className="flex items-center space-x-5">
                    <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-muted-foreground truncate">
                        {stat.title}
                      </p>
                      <p className="text-lg font-bold text-foreground truncate">
                        {stat.value}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Charts and Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card className="border-0 shadow-admin">
          <CardHeader>
            <CardTitle className="text-right flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              الطلبات الأخيرة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="text-center text-muted-foreground">
                  جاري التحميل...
                </div>
              ) : recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <div key={order.id} className="p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="text-right flex-1">
                        <h3 className="font-semibold text-lg mb-1">
                          {order.full_name || `طلب #${order.id}`}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <span>{order.phone}</span>
                          <span>•</span>
                          <span>{order.wilaya}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString(
                            "ar-DZ",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusStyle(
                          order.status
                        )}`}
                      >
                        {getStatusText(order.status)}
                      </span>
                    </div>

                    {order.product_names && (
                      <div className="mb-3 text-left">
                        <p className="text-sm text-muted-foreground bg-accent/10 p-2 rounded">
                          {order.product_names}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          {order.item_count} كمية
                        </span>
                        {order.delivery_location === "home" && (
                          <span className="text-green-600 text-xs bg-green-100 p-1 rounded-full">
                            توصيل منزلي
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">
                          {order.total_price
                            ? `${parseFloat(
                                order.total_price
                              ).toLocaleString()} د.ج`
                            : "غير محدد"}
                        </p>
                        {order.delivery_fee && (
                          <p className="text-xs text-muted-foreground">
                            + {parseFloat(order.delivery_fee).toLocaleString()}{" "}
                            د.ج توصيل
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground">
                  لا توجد طلبات
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Today's Orders */}
        <Card className="border-0 shadow-admin">
          <CardHeader>
            <CardTitle className="text-right flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              طلبات اليوم ({todaysOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="text-center text-muted-foreground">
                  جاري التحميل...
                </div>
              ) : todaysOrders.length > 0 ? (
                todaysOrders.map((order) => (
                  <div
                    key={order.id + order.full_name}
                    className="p-4 bg-muted/30 rounded-lg"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="text-right flex-1">
                        <h3 className="font-semibold text-lg mb-1">
                          {order.full_name || `طلب #${order.id}`}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <span>{order.phone}</span>
                          <span>•</span>
                          <span>{order.wilaya}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString(
                            "ar-DZ",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusStyle(
                          order.status
                        )}`}
                      >
                        {getStatusText(order.status)}
                      </span>
                    </div>

                    {order.product_names && (
                      <div className="mb-3 text-left">
                        <p className="text-sm text-muted-foreground bg-accent/10 p-2 rounded">
                          {order.product_names}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          {order.item_count} كمية
                        </span>
                        {order.delivery_location === "home" && (
                          <span className="text-green-600 text-xs bg-green-100 p-1 rounded-full">
                            توصيل منزلي
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">
                          {order.total_price
                            ? `${parseFloat(
                                order.total_price
                              ).toLocaleString()} د.ج`
                            : "غير محدد"}
                        </p>
                        {order.delivery_fee && (
                          <p className="text-xs text-muted-foreground">
                            + {parseFloat(order.delivery_fee).toLocaleString()}{" "}
                            د.ج توصيل
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground">
                  لا توجد طلبات اليوم
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
