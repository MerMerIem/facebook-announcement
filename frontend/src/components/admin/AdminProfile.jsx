import { useState, useEffect } from "react";
import { User, Lock, Mail, Save, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useApi } from "@/contexts/RestContext";
import { toast } from "sonner";

export function AdminProfile() {
  const [user, setUser] = useState({
    username: "",
    email: "",
  });
  const [formData, setFormData] = useState({
    username: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [userLoading, setUserLoading] = useState(true);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [passwordError, setPasswordError] = useState("");
  
  const { api } = useApi();

  // Fetch current user data
  const fetchUser = async () => {
    setUserLoading(true);
    setError(null);
    
    try {
      const [data, response, responseCode, error] = await api.get("/auth/me");
      
      if (responseCode === 200 && data) {
        const userData = {
          username: data.user?.username || "",
          email: data.user?.email || "",
        };
        setUser(userData);
        setFormData(prev => ({
          ...prev,
          username: userData.username,
        }));
      } else {
        setError(error || "Failed to fetch user data");
        toast.error("فشل في تحميل بيانات المستخدم", {
          description: error || "حدث خطأ أثناء جلب بيانات المستخدم",
          duration: 4000,
          style: {
            background: "#ef4444",
            color: "#ffffff",
            direction: "rtl",
            textAlign: "right",
          },
        });
      }
    } catch (err) {
      setError(err.message);
      toast.error("خطأ في النظام", {
        description: "حدث خطأ غير متوقع أثناء جلب بيانات المستخدم",
        duration: 4000,
        style: {
          background: "#ef4444",
          color: "#ffffff",
          direction: "rtl",
          textAlign: "right",
        },
      });
    } finally {
      setUserLoading(false);
    }
  };

  // Validate password fields
  const validatePasswords = () => {
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      setPasswordError("كلمات المرور غير متطابقة");
      return false;
    }
    if (formData.newPassword && formData.newPassword.length < 6) {
      setPasswordError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return false;
    }
    setPasswordError("");
    return true;
  };

  // Handle form submission
  const handleUpdate = async (e) => {
    e.preventDefault();
    
    if (!validatePasswords()) {
      toast.error("خطأ في التحقق", {
        description: passwordError,
        duration: 4000,
        style: {
          background: "#ef4444",
          color: "#ffffff",
          direction: "rtl",
          textAlign: "right",
        },
      });
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const updateData = {
        username: formData.username,
      };

      // Only include password field if user wants to change password
      if (formData.newPassword) {
        updateData.newPassword = formData.newPassword;
      }

      const [data, response, responseCode, error] = await api.post("/auth/profile", updateData);
      
      if (responseCode === 200) {
        setSuccess("تم حفظ التغييرات بنجاح");
        toast.success("تم التحديث بنجاح", {
          description: "تم تحديث ملفك الشخصي بنجاح",
          duration: 3000,
          style: {
            background: "#22c55e",
            color: "#ffffff",
            direction: "rtl",
            textAlign: "right",
          },
        });
        // Update local user state
        setUser(prev => ({
          ...prev,
          username: formData.username,
        }));
        // Clear password fields
        setFormData(prev => ({
          ...prev,
          newPassword: "",
          confirmPassword: "",
        }));
      } else {
        setError(error || "فشل في تحديث الملف الشخصي");
        toast.error("فشل في التحديث", {
          description: error || "حدث خطأ أثناء تحديث الملف الشخصي",
          duration: 4000,
          style: {
            background: "#ef4444",
            color: "#ffffff",
            direction: "rtl",
            textAlign: "right",
          },
        });
      }
    } catch (err) {
      setError(err.message);
      toast.error("خطأ في النظام", {
        description: "حدث خطأ غير متوقع أثناء تحديث الملف الشخصي",
        duration: 4000,
        style: {
          background: "#ef4444",
          color: "#ffffff",
          direction: "rtl",
          textAlign: "right",
        },
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear errors when user starts typing
    if (error) setError(null);
    if (success) setSuccess(null);
    if (passwordError && (field === "newPassword" || field === "confirmPassword")) {
      setPasswordError("");
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (formData.newPassword || formData.confirmPassword) {
      validatePasswords();
    }
  }, [formData.newPassword, formData.confirmPassword]);

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-right">الملف الشخصي للمدير</h1>
          </div>
          <div className="flex items-center justify-center p-6 sm:p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-sm sm:text-base">جاري تحميل البيانات...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6" dir="rtl">
      <div className="max-w-4xl mx-auto">
        {/* Header - Responsive text sizing */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-right mb-2">حسابي</h1>
        </div>

        {/* User Info Card - Mobile optimized */}
        <Card className="mb-4 sm:mb-6">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4 text-center sm:text-right">
              <Avatar className="w-12 h-12 sm:w-16 sm:h-16">
                <AvatarFallback className="text-base sm:text-lg">
                  <User className="w-6 h-6 sm:w-8 sm:h-8" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-lg sm:text-xl font-semibold mb-1">{user.username || "المدير"}</h2>
                <p className="text-sm sm:text-base text-muted-foreground break-all" dir="ltr">{user.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Information Form - Mobile optimized */}
        <Card>
          <CardHeader className="text-right border-b p-4 sm:p-6">
            <CardTitle className="flex flex-col sm:flex-row items-center gap-2 justify-center sm:justify-end text-lg sm:text-xl">
              <span className="order-2 sm:order-1">معلومات الملف الشخصي</span>
              <User className="w-5 h-5 order-1 sm:order-2" />
            </CardTitle>
            <CardDescription className="text-center sm:text-right text-sm sm:text-base mt-2 sm:mt-1">
              عرض وتحديث تفاصيل حسابك
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-4 sm:p-6">
            {/* Error Alert - Mobile friendly */}
            {error && (
              <Alert variant="destructive" className="mb-4 sm:mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm sm:text-base">{error}</AlertDescription>
              </Alert>
            )}
            
            {/* Success Alert - Mobile friendly */}
            {success && (
              <Alert className="border-green-200 bg-green-50 mb-4 sm:mb-6">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700 text-sm sm:text-base">{success}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleUpdate} className="space-y-4 sm:space-y-6">
              {/* Username Field - Mobile optimized */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-right block">
                  اسم المستخدم
                </label>
                <Input
                  value={formData.username}
                  onChange={(e) => handleInputChange("username", e.target.value)}
                  className="text-right h-10 sm:h-11 text-sm sm:text-base"
                  required
                  disabled={loading}
                />
              </div>

              {/* Email Field (Read-only) - Mobile friendly */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-right block">
                  البريد الإلكتروني
                </label>
                <Input
                  value={user.email}
                  disabled
                  className="text-right bg-muted h-10 sm:h-11 text-sm sm:text-base"
                  dir="ltr"
                />
                <p className="text-xs sm:text-sm text-muted-foreground text-right">
                  لا يمكن تغيير البريد الإلكتروني
                </p>
              </div>

              {/* New Password - Mobile optimized */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-right block">
                  كلمة مرور جديدة
                </label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    value={formData.newPassword}
                    onChange={(e) => handleInputChange("newPassword", e.target.value)}
                    className="pr-10 text-right h-10 sm:h-11 text-sm sm:text-base"
                    placeholder="اتركه فارغاً للاحتفاظ بكلمة المرور الحالية"
                    disabled={loading}
                    dir="ltr"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full w-10 sm:w-11 px-2 sm:px-3"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    disabled={loading}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Confirm New Password - Mobile optimized */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-right block">
                  تأكيد كلمة المرور الجديدة
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    className="pr-10 text-right h-10 sm:h-11 text-sm sm:text-base"
                    placeholder="تأكيد كلمة المرور الجديدة"
                    disabled={loading}
                    dir="ltr"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full w-10 sm:w-11 px-2 sm:px-3"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={loading}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                {passwordError && (
                  <p className="text-xs sm:text-sm text-destructive text-right leading-relaxed">{passwordError}</p>
                )}
              </div>

              {/* Submit Button - Mobile friendly */}
              <div className="flex flex-col sm:flex-row justify-center sm:justify-end pt-4 gap-3">
                <Button
                  type="submit"
                  disabled={loading || !!passwordError}
                  className="w-full sm:w-auto px-6 sm:px-8 h-10 sm:h-11 text-sm sm:text-base"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span className="hidden xs:inline">جاري الحفظ...</span>
                      <span className="xs:hidden">حفظ...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Save className="w-4 h-4" />
                      <span className="hidden xs:inline">حفظ التعديلات</span>
                      <span className="xs:hidden">حفظ</span>
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}