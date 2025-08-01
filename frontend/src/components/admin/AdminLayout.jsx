import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { cn } from "@/lib/utils";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useApi } from "../../contexts/RestContext"; // Make sure to import useApi

export function AdminLayout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { permission, requestPermission, initializePush } = usePushNotifications();
  const { api } = useApi(); // Get the api instance from your context

  // Check for unread notifications using your API pattern
  const checkUnreadNotifications = async () => {
    try {
      console.log("Attempting to fetch unread count...");
      const [data, response, responseCode, error] = await api.get("/notification/unread-count");
      
      console.log("API Response:", {
        status: responseCode,
        data: data,
        error: error
      });
      
      if (responseCode === 200 && data) {
        setUnreadCount(data.count);
      } else {
        console.error("Error checking notifications:", error);
        // Optional: Set unreadCount to 0 or show error state
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("API Call Failed:", {
        error: error,
        message: error.message,
        stack: error.stack
      });
      setUnreadCount(0); // Fallback state
    }
  };

  // Initialize push notifications on mount
  useEffect(() => {
    if (permission === 'granted') {
      initializePush();
    } else {
      // Optionally request permission on first load
      requestPermission();
    }
    
    // Check notifications immediately and every 5 minutes
    checkUnreadNotifications();
    const interval = setInterval(checkUnreadNotifications, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [permission]);

  return (
    <div className="min-h-screen bg-background">
      <div
        className={cn(
          "transition-all duration-300",
          sidebarCollapsed ? "mr-16" : "mr-64"
        )}
      >
        <Header 
          onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)} 
          unreadCount={unreadCount} 
        />
        <main className="p-6">{children}</main>
      </div>
      <Sidebar collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} />
    </div>
  );
}