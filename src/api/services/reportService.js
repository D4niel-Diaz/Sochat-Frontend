import axiosInstance, { setSessionToken } from "../config/axios.config";

export const reportService = {
  submitReport: async (sessionToken, chatId, reason) => {
    setSessionToken(sessionToken);
    const response = await axiosInstance.post(
      "/report",
      { chat_id: chatId, reason },
      {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      }
    );
    return response;
  },
};
