import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "frontend/src/components/ui/button";
import { Input } from "frontend/src/components/ui/input";
import { Label } from "frontend/src/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "frontend/src/components/ui/card";
import { ArrowLeft, LogIn } from "lucide-react";
import { useAuth } from "frontend/src/contexts/AuthContext";
import { useToast } from "frontend/src/hooks/use-toast";
import { useApi } from "../contexts/RestContext";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();

  const { api } = useApi();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const body = { email, password };

    const [userData, response, responseCode, error] = await api.post(
      "/auth/login",
      body
    );

    if (responseCode === 200 && userData) {
      toast({
        title: "Login Successful",
        description: "Welcome to the admin panel",
      });
      console.log("it is called")
      navigate("/admin/dashboard");
    } else {
      console.error("Login error:", error);
      toast({
        title: "Login Failed",
        description: error || "Invalid email or password",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Store
        </Button>

        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center bg-primary bg-clip-text text-transparent">
              Admin Panel
            </CardTitle>
            <p className="text-muted-foreground text-center">
              Sign in to access the admin dashboard
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                <LogIn className="w-4 h-4 mr-2" />
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
