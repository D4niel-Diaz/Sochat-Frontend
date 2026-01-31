import axiosInstance, { setSessionToken } from "../config/axios.config";

export const presenceService = {
  optIn: async (sessionToken, role = "learner", subject = "General", availability = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18]) => {
    // Set token for this request
    setSessionToken(sessionToken);
    const response = await axiosInstance.post(
      "/presence/opt-in",
      {
        role,
        subject,
        availability,
      },
      {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      }
    );
    return response;
  },

  optOut: async (sessionToken) => {
    setSessionToken(sessionToken);
    const response = await axiosInstance.post(
      "/presence/opt-out",
      null,
      {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      }
    );
    return response;
  },

  heartbeat: async (sessionToken) => {
    setSessionToken(sessionToken);
    const response = await axiosInstance.post(
      "/presence/heartbeat",
      null,
      {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      }
    );
    return response;
  },

  disconnect: async (sessionToken) => {
    setSessionToken(sessionToken);
    const response = await axiosInstance.post(
      "/presence/disconnect",
      null,
      {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      }
    );
    return response;
  },

  getStatus: async (sessionToken) => {
    setSessionToken(sessionToken);
    const response = await axiosInstance.get("/presence/status", {
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
    });
    return response;
  },
};
