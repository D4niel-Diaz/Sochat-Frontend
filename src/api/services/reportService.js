import axiosInstance from "../config/axios.config";

export const reportService = {
  submitReport: (sessionToken, chatId, reason) =>
    axiosInstance.post(
      "/report",
      { chat_id: chatId, reason },
      { headers: { Authorization: `Bearer ${sessionToken}` } }
    ),
};
