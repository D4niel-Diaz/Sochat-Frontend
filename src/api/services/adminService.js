import axiosInstance from "../config/axios.config";

// Admin token is kept separate from the guest session token
let adminToken = null;

export const setAdminToken = (token) => {
  adminToken = token;
};

const auth = () => ({ headers: { Authorization: `Bearer ${adminToken}` } });

export const adminService = {
  login: (email, password) => axiosInstance.post("/admin/login", { email, password }),
  logout: () => axiosInstance.post("/admin/logout", null, auth()),
  getMetrics: () => axiosInstance.get("/admin/metrics", auth()),
  getActiveChats: () => axiosInstance.get("/admin/chats", auth()),
  getReports: (status = "all") => axiosInstance.get("/admin/reports", { ...auth(), params: { status } }),
  banGuest: (guestId) => axiosInstance.post("/admin/ban", { guest_id: guestId }, auth()),
  unbanGuest: (guestId) => axiosInstance.post("/admin/unban", { guest_id: guestId }, auth()),
  resolveReport: (reportId) => axiosInstance.post("/admin/report/resolve", { report_id: reportId }, auth()),
  getBannedGuests: () => axiosInstance.get("/admin/banned-guests", auth()),
  getFlaggedMessages: () => axiosInstance.get("/admin/flagged-messages", auth()),
};
