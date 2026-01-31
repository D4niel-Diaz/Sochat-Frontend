import axiosInstance, { setSessionToken } from "../config/axios.config";

export const guestService = {
  createSession: async () => {
    const response = await axiosInstance.post("/guest/create");
    return response;
  },

  refreshSession: async (sessionToken) => {
    setSessionToken(sessionToken);
    const response = await axiosInstance.post(
      "/guest/refresh",
      null,
      {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      }
    );
    return response;
  },
};
