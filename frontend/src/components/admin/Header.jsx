// Updated Header component
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Bell, User, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useApi } from "@/contexts/RestContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header({
  onMenuClick,
  unreadCount,
  loading,
  error,
  onNotificationsRead,
  setUnreadCount,
}) {
  const [user, setUser] = useState("المدير");
  const [email, setEmail] = useState("admin@store.com");
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState(null);
  const [logoutLoading, setLogoutLoading] = useState(false);

  // Notification states
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const { api } = useApi();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const fetchUser = async () => {
    setUserLoading(true);
    setUserError(null);

    try {
      const [data, response, responseCode, error] = await api.get("/auth/me");

      if (responseCode === 200 && data) {
        setUser(data.user?.username || "المدير");
        setEmail(data.user?.email || "admin@store.com");
      } else {
        setUserError(error || "Failed to fetch user data");
        console.error("Error fetching user:", error);
      }
    } catch (err) {
      setUserError(err.message);
      console.error("API Call Failed:", err);
    } finally {
      setUserLoading(false);
    }
  };

  const fetchUnreadNotifications = async () => {
    setNotificationsLoading(true);
    setNotificationsError(null);

    try {
      const [data, response, responseCode, error] = await api.get(
        "/notification/getUnread"
      );

      if (responseCode === 200 && data) {
        setNotifications(data.notifications || data || []);
      } else {
        setNotificationsError(error || "Failed to fetch notifications");
        console.error("Error fetching notifications:", error);
      }
    } catch (err) {
      setNotificationsError(err.message);
      console.error("Notifications API Call Failed:", err);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      setUnreadCount(0);
      const [data, response, responseCode, error] = await api.post(
        "/notification/markAllAsRead"
      );

      if (responseCode === 200) {
        console.log("All notifications marked as read");
        // Callback to parent to refresh unread count
        if (onNotificationsRead) {
          onNotificationsRead();
        }
      } else {
        console.error("Failed to mark notifications as read:", error);
      }
    } catch (err) {
      console.error("Mark as read API call failed:", err);
    }
  };

  // Handle dropdown open/close changes
  const handleNotificationsOpenChange = (open) => {
    console.log("Notifications dropdown opening:", open);
    setNotificationsOpen(open);

    if (open) {
      // Fetch notifications when opening
      fetchUnreadNotifications();
    } else {
      // Mark as read when closing (only if there were unread notifications)
      if (notifications.length > 0 && unreadCount > 0) {
        markAllNotificationsAsRead();
      }
    }
  };

  const handleLogout = async () => {
    setLogoutLoading(true);

    try {
      const { statusCode, error } = await logout();

      if (statusCode === 200) {
        setUser("المدير");
        setEmail("admin@store.com");
        localStorage.removeItem("authToken");
        sessionStorage.removeItem("authToken");
        navigate("/");
      } else {
        console.error("Logout failed:", error);
      }
    } catch (err) {
      console.error("Logout API call failed:", err);
    } finally {
      setLogoutLoading(false);
    }
  };

  const handleProfileClick = () => {
    navigate("/admin/profile");
  };

  const formatNotificationTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffInHours < 1) return "الآن";
    if (diffInHours < 24) return `منذ ${diffInHours} ساعة`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `منذ ${diffInDays} يوم`;
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <header className="bg-card border-b border-border p-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="hover:bg-accent"
        >
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications Dropdown */}
        <DropdownMenu
          open={notificationsOpen}
          onOpenChange={handleNotificationsOpenChange}
        >
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              disabled={loading}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full flex items-center justify-center text-white text-xs">
                  {unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-80 max-h-96 overflow-y-auto"
          >
            <div className="p-3 border-b">
              <h3 className="font-semibold text-right">
                الإشعارات غير المقروءة
              </h3>
            </div>

            {notificationsLoading ? (
              <div className="p-4 text-center text-muted-foreground">
                جاري التحميل...
              </div>
            ) : notificationsError ? (
              <div className="p-4 text-center text-destructive text-sm">
                خطأ في تحميل الإشعارات
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                لا توجد إشعارات جديدة
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {notifications.map((notification, index) => (
                  <DropdownMenuItem
                    key={notification.id || index}
                    className="flex flex-col items-start p-3 hover:bg-accent cursor-pointer border-b last:border-b-0"
                  >
                    <div className="w-full text-right">
                      <p className="text-sm font-medium mb-1">{"إشعار جديد"}</p>
                      {notification.content && (
                        <p className="text-xs text-muted-foreground mb-2">
                          {notification.content}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatNotificationTime(
                          notification.createdAt || notification.timestamp
                        )}
                      </p>
                    </div>
                  </DropdownMenuItem>
                ))}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              disabled={userLoading}
              className="flex items-center gap-2 p-2 hover:bg-accent rounded-md"
            >
              <Avatar>
                <AvatarFallback>
                  {userLoading ? (
                    <span className="text-xs">...</span>
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="text-right">
                <p className="text-sm font-medium">
                  {userLoading
                    ? "جاري التحميل..."
                    : userError
                    ? "خطأ في التحميل"
                    : user}
                </p>
                <p className="text-xs text-muted-foreground">
                  {userLoading ? "..." : userError ? "---" : email}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={handleProfileClick}
              className="text-right"
            >
              <User className="ml-2 h-4 w-4" />
              الملف الشخصي
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleLogout}
              disabled={logoutLoading}
              className="text-right text-destructive focus:text-destructive"
            >
              <svg
                className="ml-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013 3v1"
                />
              </svg>
              {logoutLoading ? "جاري تسجيل الخروج..." : "تسجيل الخروج"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
