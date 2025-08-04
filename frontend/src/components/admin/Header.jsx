import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Bell, User, Search, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useApi } from "@/contexts/RestContext";

export function Header({ onMenuClick, unreadCount, loading, error }) {
  const [user, setUser] = useState("المدير");
  const [email, setEmail] = useState("admin@store.com");
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState(null);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const { api } = useApi();
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

  const handleLogout = async () => {
    setLogoutLoading(true);
    
    try {
      const [data, response, responseCode, error] = await api.delete("/auth/logout");
      
      if (responseCode === 200) {
        // Clear any user data from state
        setUser("المدير");
        setEmail("admin@store.com");
        
        // Clear tokens from storage if needed
        localStorage.removeItem("authToken");
        sessionStorage.removeItem("authToken");
        
        // Redirect to login page
        navigate("/admin/login");
      } else {
        console.error("Logout failed:", error);
        // You might want to show a toast notification here
      }
    } catch (err) {
      console.error("Logout API call failed:", err);
      // Handle network/API errors
    } finally {
      setLogoutLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []); // Empty dependency array to run only once on mount

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
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="البحث..."
            className="pl-10 w-64"
            disabled={userLoading}
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
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

        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          disabled={logoutLoading || userLoading}
          className="hover:bg-accent"
          title="تسجيل الخروج"
        >
          <LogOut className="w-5 h-5" />
        </Button>
        
        <div className="flex items-center gap-2">
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
              {userLoading ? "جاري التحميل..." : userError ? "خطأ في التحميل" : user}
            </p>
            <p className="text-xs text-muted-foreground">
              {userLoading ? "..." : userError ? "---" : email}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}