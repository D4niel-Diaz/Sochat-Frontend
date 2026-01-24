import axiosInstance from "../config/axios.config";

export const chatService = {
  startChat: async (sessionToken) => {
    const response = await axiosInstance.post("/chat/start", null, {
      metadata: { sessionToken },
    });
    return response;
  },

  endChat: async (sessionToken, chatId) => {
    const response = await axiosInstance.post(
      "/chat/end",
      { chat_id: chatId },
      {
        metadata: { sessionToken },
      }
    );
    return response;
  },

  getMessages: async (sessionToken, chatId, limit = 100) => {
    const response = await axiosInstance.get(`/chat/${chatId}/messages`, {
      params: { limit },
      metadata: { sessionToken },
    });
    return response;
  },

  sendMessage: async (sessionToken, chatId, content) => {
    const response = await axiosInstance.post(
      "/chat/message",
      { chat_id: chatId, content },
      {
        metadata: { sessionToken },
      }
    );
    return response;
  },

  sendTyping: async (sessionToken, chatId, isTyping) => {
    const response = await axiosInstance.post(
      "/chat/typing",
      { chat_id: chatId, is_typing: isTyping },
      {
        metadata: { sessionToken },
      }
    );
    return response;
  },
};
