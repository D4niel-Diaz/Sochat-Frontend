import axiosInstance from "../config/axios.config";

export const reportService = {
  submitReport: async (sessionToken, chatId, reason) => {
    const response = await axiosInstance.post(
      "/report",
      { chat_id: chatId, reason },
      {
        metadata: { sessionToken },
      }
    );
    return response;
  },
};
