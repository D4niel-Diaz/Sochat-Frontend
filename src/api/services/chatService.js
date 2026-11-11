import axiosInstance from "../config/axios.config";

const auth = (sessionToken) => ({ headers: { Authorization: `Bearer ${sessionToken}` } });

export const chatService = {
  startChat: (sessionToken) => axiosInstance.post("/chat/start", null, auth(sessionToken)),

  endChat: (sessionToken, chatId) =>
    axiosInstance.post("/chat/end", { chat_id: chatId }, auth(sessionToken)),

  getMessages: (sessionToken, chatId, limit = 100) =>
    axiosInstance.get(`/chat/${chatId}/messages`, { ...auth(sessionToken), params: { limit } }),

  sendMessage: (sessionToken, chatId, content) =>
    axiosInstance.post("/chat/message", { chat_id: chatId, content }, auth(sessionToken)),
};
