import { Menu, Bell, User, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function Header({ onMenuClick, unreadCount }) {
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
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full flex items-center justify-center text-white text-xs">
              {unreadCount}
            </span>
          )}
        </Button>
        
        <div className="flex items-center gap-2">
          <Avatar>
            <AvatarFallback>
              <User className="w-4 h-4" />
            </AvatarFallback>
          </Avatar>
          <div className="text-right">
            <p className="text-sm font-medium">المدير</p>
            <p className="text-xs text-muted-foreground">admin@store.com</p>
          </div>
        </div>
      </div>
    </header>
  );
}