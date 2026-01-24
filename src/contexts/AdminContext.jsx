import { createContext, useContext, useState, useEffect } from "react";
import { adminService } from "../api/services/adminService";
import toast from "react-hot-toast";

const AdminContext = createContext(null);

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
};

export const AdminProvider = ({ children }) => {
  const [adminId, setAdminId] = useState(null);
  const [name, setName] = useState(null);
  const [email, setEmail] = useState(null);
  const [role, setRole] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const savedAuth = localStorage.getItem('adminAuth');
    if (savedAuth) {
      try {
        const authData = JSON.parse(savedAuth);
        setAdminId(authData.adminId);
        setName(authData.name);
        setEmail(authData.email);
        setRole(authData.role);
        setIsAuthenticated(true);
      } catch (e) {
        localStorage.removeItem('adminAuth');
      }
    }
  }, []);

  const login = async (emailInput, password) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await adminService.login(emailInput, password);

      const responseData = response.data.data || response.data;
      if (!responseData || !responseData.admin_id) {
        throw new Error('Invalid response from server');
      }

      const authData = {
        adminId: responseData.admin_id,
        name: responseData.name,
        email: responseData.email,
        role: responseData.role,
      };

      setAdminId(authData.adminId);
      setName(authData.name);
      setEmail(authData.email);
      setRole(authData.role);
      setIsAuthenticated(true);

      localStorage.setItem('adminAuth', JSON.stringify(authData));

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

  const logout = () => {
    setAdminId(null);
    setName(null);
    setEmail(null);
    setRole(null);
    setIsAuthenticated(false);
    setError(null);
    localStorage.removeItem('adminAuth');
    toast.success("Logged out successfully");
  };

  const checkAuth = () => {
    return isAuthenticated;
  };

  const value = {
    adminId,
    name,
    email,
    role,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    checkAuth,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};
