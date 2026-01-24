import axiosInstance from "../config/axios.config";

export const adminService = {
  login: async (email, password) => {
    const response = await axiosInstance.post("/admin/login", {
      email,
      password,
    });
    return response;
  },

  getMetrics: async () => {
    const response = await axiosInstance.get("/admin/metrics");
    return response;
  },

  getActiveChats: async () => {
    const response = await axiosInstance.get("/admin/chats");
    return response;
  },

  getReports: async (status = "all") => {
    const response = await axiosInstance.get("/admin/reports", {
      params: { status },
    });
    return response;
  },

  banGuest: async (guestId) => {
    const response = await axiosInstance.post("/admin/ban", {
      guest_id: guestId,
    });
    return response;
  },

  unbanGuest: async (guestId) => {
    const response = await axiosInstance.post("/admin/unban", {
      guest_id: guestId,
    });
    return response;
  },

  resolveReport: async (reportId) => {
    const response = await axiosInstance.post("/admin/report/resolve", {
      report_id: reportId,
    });
    return response;
  },

  getBannedGuests: async () => {
    const response = await axiosInstance.get("/admin/banned-guests");
    return response;
  },

  getFlaggedMessages: async () => {
    const response = await axiosInstance.get("/admin/flagged-messages");
    return response;
  },
};
