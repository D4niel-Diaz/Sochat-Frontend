import axiosInstance, { setSessionToken } from "../config/axios.config";

export const chatService = {
  startChat: async (sessionToken) => {
    setSessionToken(sessionToken);
    const response = await axiosInstance.post(
      "/chat/start",
      null,
      {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      }
    );
    return response;
  },

  endChat: async (sessionToken, chatId) => {
    setSessionToken(sessionToken);
    const response = await axiosInstance.post(
      "/chat/end",
      { chat_id: chatId },
      {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      }
    );
    return response;
  },

  getMessages: async (sessionToken, chatId, limit = 100) => {
    setSessionToken(sessionToken);
    const response = await axiosInstance.get(`/chat/${chatId}/messages`, {
      params: { limit },
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
    });
    return response;
  },

  sendMessage: async (sessionToken, chatId, content) => {
    setSessionToken(sessionToken);
    const response = await axiosInstance.post(
      "/chat/message",
      { chat_id: chatId, content },
      {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      }
    );
    return response;
  },

  sendTyping: async (sessionToken, chatId, isTyping) => {
    setSessionToken(sessionToken);
    const response = await axiosInstance.post(
      "/chat/typing",
      { chat_id: chatId, is_typing: isTyping },
      {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      }
    );
    return response;
  },
};
