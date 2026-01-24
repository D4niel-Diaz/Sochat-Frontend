import axiosInstance from "../config/axios.config";

export const guestService = {
  createSession: async () => {
    const response = await axiosInstance.post("/guest/create");
    return response;
  },

  refreshSession: async (sessionToken) => {
    const response = await axiosInstance.post("/guest/refresh", null, {
      metadata: { sessionToken },
    });
    return response;
  },
};
