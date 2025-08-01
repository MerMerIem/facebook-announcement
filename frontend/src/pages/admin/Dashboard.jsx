import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, FolderTree, ShoppingCart, Users, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const statsData = [
  {
    title: "المنتجات",
    value: "5",
    icon: Package,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    title: "الفئات",
    value: "4",
    icon: FolderTree,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    title: "الطلبات",
    value: "1",
    icon: ShoppingCart,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
  {
    title: "العملاء",
    value: "1",
    icon: Users,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
];

const chartData = [
  { name: "يناير", orders: 2 },
  { name: "فبراير", orders: 4 },
  { name: "مارس", orders: 3 },
  { name: "أبريل", orders: 7 },
  { name: "مايو", orders: 6 },
  { name: "يونيو", orders: 9 },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">لوحة التحكم</h1>
        <p className="text-muted-foreground mt-2">نظرة عامة على إحصائيات المتجر</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat) => (
          <Card key={stat.title} className="border-0 shadow-admin">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-admin">
          <CardHeader>
            <CardTitle className="text-right flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              الطلبات عبر الوقت
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="orders" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-admin">
          <CardHeader>
            <CardTitle className="text-right">الطلبات الأخيرة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="text-right">
                  <p className="font-medium">Ahmed Benaissa</p>
                  <p className="text-sm text-muted-foreground">10040.00 د.ج</p>
                </div>
                <span className="px-2 py-1 bg-warning text-warning-foreground rounded-md text-xs">
                  في الانتظار
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}