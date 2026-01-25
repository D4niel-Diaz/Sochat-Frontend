import axios from "axios";
import { log, error, warn } from "../../utils/logger";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://sochat-backend.onrender.com/api/v1";

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true,
});

axiosInstance.interceptors.request.use(
  (config) => {
    const sessionToken = config.metadata?.sessionToken;
    if (sessionToken) {
      config.headers.Authorization = `Bearer ${sessionToken}`;
    }
    return config;
  },
  (requestError) => {
    error('❌ Request Error:', requestError.message, requestError.config);
    return Promise.reject(requestError);
  }
);

axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (apiError) => {
    error('❌ API Error:', {
      url: apiError.config?.url,
      status: apiError.response?.status,
      statusText: apiError.response?.statusText,
      data: apiError.response?.data,
      message: apiError.message
    });
    if (apiError.response) {
      const { status, data } = apiError.response;

      switch (status) {
        case 401:
          if (data.message?.includes("banned")) {
            throw new Error("You have been banned from this platform");
          }
          throw new Error("Session expired. Please refresh the page.");
        case 403:
          throw new Error("Access denied. You don't have permission to perform this action.");
        case 404:
          throw new Error("Resource not found");
        case 422:
          if (data.errors) {
            const firstError = Object.values(data.errors)[0];
            throw new Error(Array.isArray(firstError) ? firstError[0] : firstError);
          }
          throw new Error(data.message || "Validation failed");
        case 429:
          throw new Error("Please slow down. Too many requests.");
        case 500:
          throw new Error("Something went wrong. Please try again later.");
        default:
          throw new Error(data.message || "An error occurred");
      }
    } else if (apiError.request) {
      error('❌ No response received:', apiError.request);
      throw new Error("Connection lost. Please check your internet connection.");
    } else {
      error('❌ Request setup error:', apiError.message);
      throw new Error("An unexpected error occurred");
    }
  }
);

export default axiosInstance;
