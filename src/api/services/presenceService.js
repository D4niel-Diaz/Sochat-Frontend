import axiosInstance from "../config/axios.config";

export const presenceService = {
  optIn: async (sessionToken, role = "learner", subject = "General", availability = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18]) => {
    const response = await axiosInstance.post(
      "/presence/opt-in",
      {
        role,
        subject,
        availability,
      },
      {
        metadata: { sessionToken },
      }
    );
    return response;
  },

  optOut: async (sessionToken) => {
    const response = await axiosInstance.post("/presence/opt-out", null, {
      metadata: { sessionToken },
    });
    return response;
  },

  heartbeat: async (sessionToken) => {
    const response = await axiosInstance.post("/presence/heartbeat", null, {
      metadata: { sessionToken },
    });
    return response;
  },

  disconnect: async (sessionToken) => {
    const response = await axiosInstance.post("/presence/disconnect", null, {
      metadata: { sessionToken },
    });
    return response;
  },

  getStatus: async (sessionToken) => {
    const response = await axiosInstance.get("/presence/status", {
      metadata: { sessionToken },
    });
    return response;
  },
};
