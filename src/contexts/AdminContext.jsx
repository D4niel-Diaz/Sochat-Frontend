import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { adminService, setAdminToken } from "../api/services/adminService";
import axiosInstance from "../api/config/axios.config";
import toast from "react-hot-toast";

const STORAGE_KEY = "adminAuth";

const AdminContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
};

const readSavedAuth = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return saved?.token ? saved : null;
  } catch {
    return null;
  }
};

export const AdminProvider = ({ children }) => {
  const [auth, setAuth] = useState(() => {
    const saved = readSavedAuth();
    setAdminToken(saved?.token ?? null);
    return saved;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const clearAuth = useCallback(() => {
    setAdminToken(null);
    setAuth(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // storage unavailable; state is already cleared
    }
  }, []);

  // An expired or revoked admin token signs the admin out
  useEffect(() => {
    const id = axiosInstance.interceptors.response.use(undefined, (err) => {
      if (err?.status === 401 && err.url?.startsWith("/admin") && err.url !== "/admin/login") {
        clearAuth();
        toast.error("Your admin session has expired. Please log in again.");
      }
      return Promise.reject(err);
    });
    return () => axiosInstance.interceptors.response.eject(id);
  }, [clearAuth]);

  const login = async (emailInput, password) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await adminService.login(emailInput, password);
      const data = response.data?.data;
      if (!data?.admin_id || !data?.token) {
        throw new Error("Invalid response from server");
      }

      const authData = {
        adminId: data.admin_id,
        name: data.name,
        email: data.email,
        role: data.role,
        token: data.token,
      };

      setAdminToken(authData.token);
      setAuth(authData);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(authData));
      } catch {
        // stays logged in for this page load only
      }

      toast.success("Logged in successfully");
      return true;
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await adminService.logout();
    } catch {
      // token may already be invalid; clear locally regardless
    }
    clearAuth();
    setError(null);
    toast.success("Logged out successfully");
  };

  const value = {
    adminId: auth?.adminId ?? null,
    name: auth?.name ?? null,
    email: auth?.email ?? null,
    role: auth?.role ?? null,
    isAuthenticated: Boolean(auth?.token),
    isLoading,
    error,
    login,
    logout,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};
