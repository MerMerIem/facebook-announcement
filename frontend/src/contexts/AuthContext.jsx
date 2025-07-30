import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import axios from "axios";

// Configure axios defaults
axios.defaults.baseURL = "http://localhost:5000";
axios.defaults.withCredentials = true;

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is authenticated on app start
  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.get("/auth/me");

      if (response.status === 200 || response.status === 201) {
        setUser(response.data);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.error("Auth check failed:", err);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Login function
  const login = useCallback(async (credentials) => {
    try {
      const response = await axios.post("/auth/login", credentials);

      if (response.status === 200 || response.status === 201) {
        setUser(response.data);
        setIsAuthenticated(true);
        return { success: true, data: response.data };
      } else {
        return {
          success: false,
          error: response.data?.message || "Login failed",
          responseCode: response.status,
        };
      }
    } catch (err) {
      console.error("Login error:", err);
      return {
        success: false,
        error: err.response?.data?.message || "Login failed. Please try again.",
        responseCode: err?.response?.status,
      };
    }
  }, []);

  // // Register function
  // const register = useCallback(
  //   async (userData) => {
  //     try {
  //       const response = await axios.post("/auth/register", userData);

  //       if (response.status === 200 || response.status === 201) {
  //         setUser(response.data);
  //         setIsAuthenticated(true);
  //         return { success: true, data: response.data };
  //       } else {
  //         return {
  //           success: false,
  //           error: response.data?.message || "Registration failed",
  //           responseCode: response.status,
  //         };
  //       }
  //     } catch (err) {
  //       console.error("Registration error:", err);
  //       return {
  //         success: false,
  //         error: err.response?.data?.message || "Registration failed. Please try again.",
  //         responseCode: err?.response?.status,
  //       };
  //     }
  //   },
  //   []
  // );

  // Logout function
  const logout = useCallback(async () => {
    try {
      const response = await axios.delete(
        "/auth/logout",
        {},
        {
          withCredentials: true, // Ensure cookies are sent with the request
        }
      );

      // Only clear state after successful server response
      if (response.status === 200) {
        setUser(null);
        setIsAuthenticated(false);
        return { success: true, message: "Logged out successfully" };
      }
    } catch (err) {
      console.error("Logout error:", err);

      if (err.response) {
        if (err.response.status === 401) {
          setUser(null);
          setIsAuthenticated(false);
          return { success: true, message: "Already logged out" };
        }
        return {
          success: false,
          error: err.response.data.message || "Logout failed",
        };
      } else if (err.request) {
        setUser(null);
        setIsAuthenticated(false);
        return {
          success: false,
          error: "Network error during logout",
        };
      } else {
        return {
          success: false,
          error: "Unexpected error during logout",
        };
      }
    }
  }, []);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    return await checkAuth();
  }, [checkAuth]);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshUser,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
