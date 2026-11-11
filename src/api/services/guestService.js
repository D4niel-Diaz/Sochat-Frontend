import axiosInstance from "../config/axios.config";

export const guestService = {
  createSession: () => axiosInstance.post("/guest/create"),

  refreshSession: (sessionToken) =>
    axiosInstance.post("/guest/refresh", null, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    }),
};
