import axiosInstance from "../config/axios.config";

export const DEFAULT_MATCH_PREFERENCES = {
  role: "learner",
  subject: "General",
  availability: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
};

const auth = (sessionToken) => ({ headers: { Authorization: `Bearer ${sessionToken}` } });

export const presenceService = {
  optIn: (sessionToken, { role, subject, availability } = DEFAULT_MATCH_PREFERENCES) =>
    axiosInstance.post("/presence/opt-in", { role, subject, availability }, auth(sessionToken)),

  optOut: (sessionToken) => axiosInstance.post("/presence/opt-out", null, auth(sessionToken)),

  heartbeat: (sessionToken) => axiosInstance.post("/presence/heartbeat", null, auth(sessionToken)),

  disconnect: (sessionToken) => axiosInstance.post("/presence/disconnect", null, auth(sessionToken)),
};
