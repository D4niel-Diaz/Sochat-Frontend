import { createContext, useContext, useState, useEffect } from "react";
import { guestService } from "../api/services/guestService";
import toast from "react-hot-toast";
import { log, error } from "../utils/logger";

const GuestContext = createContext(null);

export const useGuest = () => {
  const context = useContext(GuestContext);
  if (!context) {
    throw new Error("useGuest must be used within a GuestProvider");
  }
  return context;
};

export const GuestProvider = ({ children }) => {
  const [guestId, setGuestId] = useState(null);
  const [sessionToken, setSessionToken] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBanned, setIsBanned] = useState(false);
  const [error, setError] = useState(null);

  const createSession = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // CRITICAL: Don't add extra timeout - axios already has 30s timeout
      // The extra timeout was causing premature failures in production
      const response = await guestService.createSession();

      log('🔍 Full response structure:', response);
      log('🔍 response.data:', response.data);

      // Handle both response formats: { success, data, message } or direct data
      const responseData = response.data.data || response.data;

      if (!responseData || !responseData.guest_id) {
        error('❌ Invalid response structure:', response.data);
        throw new Error('Invalid response from server');
      }

      setGuestId(responseData.guest_id);
      setSessionToken(responseData.session_token);
      setExpiresAt(responseData.expires_at);
      setIsBanned(false);
    } catch (err) {
      // CRITICAL: Provide better error messages for production
      let errorMessage = err.message;
      
      // Check if it's a production backend connection issue
      if (err.message?.includes('timeout') || err.message?.includes('ECONNABORTED')) {
        const isProduction = typeof window !== 'undefined' && 
                            window.location.hostname !== 'localhost' && 
                            window.location.hostname !== '127.0.0.1';
        
        if (isProduction) {
          errorMessage = "Unable to connect to server. The backend may be starting up or experiencing issues. Please try again in a moment.";
        } else {
          errorMessage = "Backend server timeout. Is the backend running? Check: http://localhost:8000/api/v1/health";
        }
      } else if (err.message?.includes('ECONNREFUSED') || err.message?.includes('ERR_NETWORK')) {
        const isProduction = typeof window !== 'undefined' && 
                            window.location.hostname !== 'localhost' && 
                            window.location.hostname !== '127.0.0.1';
        
        if (isProduction) {
          errorMessage = "Cannot connect to server. Please check if the backend service is available.";
        } else {
          errorMessage = "Cannot connect to backend server. Please ensure the backend is running on port 8000.";
        }
      }
      
      setError(errorMessage);
      if (err.message.includes("banned")) {
        setIsBanned(true);
      }
      // Don't show toast here - let the UI handle it gracefully
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSession = async () => {
    if (!sessionToken) return;

    try {
      setError(null);
      const response = await guestService.refreshSession(sessionToken);

      // Handle both response formats
      const responseData = response.data.data || response.data;
      if (!responseData || !responseData.expires_at) {
        error('❌ Invalid refresh response structure:', response.data);
        throw new Error('Invalid response from server');
      }

      setExpiresAt(responseData.expires_at);
    } catch (err) {
      setError(err.message);
      if (err.message.includes("banned")) {
        setIsBanned(true);
      }
      toast.error(err.message);
      throw err;
    }
  };

  const clearSession = () => {
    setGuestId(null);
    setSessionToken(null);
    setExpiresAt(null);
    setIsBanned(false);
    setError(null);
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Force loading to false after 15 seconds if session creation hasn't completed
      if (isLoading) {
        setIsLoading(false);
        setError("Unable to connect to server. Please refresh the page.");
      }
    }, 15000);

    createSession().catch(() => {
      // If session creation fails, still allow the app to render
      // The landing page will handle showing the error
      setIsLoading(false);
    });

    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!expiresAt) return;

    const expiresTime = new Date(expiresAt).getTime();
    const now = Date.now();
    const timeUntilExpiry = expiresTime - now;

    if (timeUntilExpiry <= 0) {
      clearSession();
      createSession();
      return;
    }

    const refreshTime = timeUntilExpiry - 4 * 60 * 60 * 1000;

    if (refreshTime > 0) {
      const refreshTimer = setTimeout(async () => {
        try {
          await refreshSession();
        } catch (refreshErr) {
          error("Session refresh failed, creating new session:", refreshErr);
          clearSession();
          createSession();
        }
      }, refreshTime);

      return () => clearTimeout(refreshTimer);
    }
  }, [expiresAt]);

  const value = {
    guestId,
    sessionToken,
    expiresAt,
    isLoading,
    isBanned,
    error,
    createSession,
    refreshSession,
    clearSession,
  };

  return <GuestContext.Provider value={value}>{children}</GuestContext.Provider>;
};
