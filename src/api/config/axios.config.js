import axios from "axios";
import { log, error } from "../../utils/logger";

const getApiBaseURL = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  if (import.meta.env.DEV) {
    return "/api/v1"; // Vite dev proxy
  }

  return "https://sochat-backend.onrender.com/api/v1";
};

const axiosInstance = axios.create({
  baseURL: getApiBaseURL(),
  timeout: 30000,
  // Auth is a bearer token, not a cookie
  withCredentials: false,
  headers: { Accept: "application/json" },
});

// Guest session token, attached to guest requests that don't set their own header
let currentSessionToken = null;

export const setSessionToken = (token) => {
  currentSessionToken = token;
};

export const getSessionToken = () => currentSessionToken;

/** Error thrown by API calls; `status` is the HTTP status (0 when there was no response). */
export class ApiError extends Error {
  constructor(message, status = 0, data = null, url = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.url = url;
  }
}

axiosInstance.interceptors.request.use((config) => {
  const isAdminRequest = config.url?.startsWith("/admin");
  if (!config.headers.Authorization && !isAdminRequest && currentSessionToken) {
    config.headers.Authorization = `Bearer ${currentSessionToken}`;
  }
  if (import.meta.env.DEV) {
    log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`);
  }
  return config;
});

const messageFor = (status, data) => {
  switch (status) {
    case 401:
      return data?.message === "Invalid credentials"
        ? "Invalid email or password"
        : "Session expired. Please refresh the page.";
    case 403:
      return data?.message?.toLowerCase().includes("banned")
        ? "You have been banned from this platform"
        : "Access denied. You don't have permission to perform this action.";
    case 404:
      return data?.message || "Resource not found";
    case 422: {
      const firstError = data?.errors && Object.values(data.errors)[0];
      if (firstError) return Array.isArray(firstError) ? firstError[0] : firstError;
      return data?.message || "Validation failed";
    }
    case 429:
      return "Please slow down. Too many requests.";
    default:
      return status >= 500
        ? "Something went wrong. Please try again later."
        : data?.message || "An error occurred";
  }
};

axiosInstance.interceptors.response.use(
  (response) => response,
  (apiError) => {
    error("❌ API Error:", {
      url: apiError.config?.url,
      status: apiError.response?.status,
      message: apiError.message,
    });

    if (apiError.response) {
      const { status, data } = apiError.response;
      throw new ApiError(messageFor(status, data), status, data, apiError.config?.url);
    }

    if (apiError.code === "ECONNABORTED" || apiError.message?.includes("timeout")) {
      throw new ApiError("The server took too long to respond. Please try again.");
    }
    if (apiError.request) {
      throw new ApiError("Cannot reach the server. Please check your connection and try again.");
    }
    throw new ApiError("An unexpected error occurred");
  }
);

export default axiosInstance;
