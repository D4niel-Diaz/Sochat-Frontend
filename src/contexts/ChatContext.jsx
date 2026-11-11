import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { chatService } from "../api/services/chatService";
import { presenceService, DEFAULT_MATCH_PREFERENCES } from "../api/services/presenceService";
import { useGuest } from "./GuestContext";
import toast from "react-hot-toast";
import { error as logError, warn as logWarn } from "../utils/logger";
import {
  connectSocket,
  onMatchFound,
  onMessage,
  onTyping,
  onChatEnded,
  joinPresencePool,
  leavePresencePool,
  setActiveChat,
  sendMessage as sendSocketMessage,
  endChat as endSocketChat,
  isConnected,
} from "../lib/socketClient";

const ChatContext = createContext(null);

const POLLING_INTERVAL_MATCHING = Number(import.meta.env.VITE_POLLING_INTERVAL_MATCHING || 3000);
const POLLING_INTERVAL_MESSAGES = Number(import.meta.env.VITE_POLLING_INTERVAL_MESSAGES || 2000);
const HEARTBEAT_INTERVAL = 30000;
const TYPING_DISPLAY_MS = 3000;

// eslint-disable-next-line react-refresh/only-export-components
export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};

/** Append messages that aren't already in the list (dedupe by message_id). */
const mergeMessages = (prev, incoming) => {
  const ids = new Set(prev.map((m) => m.message_id));
  const fresh = incoming.filter((m) => m.message_id && !ids.has(m.message_id));
  return fresh.length ? [...prev, ...fresh] : prev;
};

export const ChatProvider = ({ children }) => {
  const { sessionToken, guestId } = useGuest();

  const [chatId, setChatId] = useState(null);
  const [partnerId, setPartnerId] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | waiting | matched | ended
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);

  const statusRef = useRef(status);
  const chatIdRef = useRef(chatId);
  const busyRef = useRef(false);
  statusRef.current = status;
  chatIdRef.current = chatId;

  const enterChat = useCallback((newChatId, newPartnerId, { announce = true } = {}) => {
    setChatId(Number(newChatId));
    setPartnerId(newPartnerId ?? null);
    setStatus("matched");
    setMessages([]);
    setActiveChat(newChatId);
    if (announce) toast.success("You've been matched with someone!");
  }, []);

  const resetChat = useCallback((nextStatus) => {
    setChatId(null);
    setPartnerId(null);
    setStatus(nextStatus);
    setMessages([]);
    setIsPartnerTyping(false);
    setActiveChat(null);
  }, []);

  const handlePartnerEnded = useCallback(() => {
    if (statusRef.current !== "matched") return;
    resetChat("ended");
    toast("The other person left the chat.");
  }, [resetChat]);

  /** Handle a /chat/start response (REST fallback path). */
  const applyStartResult = useCallback((data) => {
    if ((data?.status === "matched" || data?.status === "already_matched") && data.chat_id) {
      enterChat(data.chat_id, data.partner_id, { announce: data.status === "matched" });
    }
  }, [enterChat]);

  const startChat = useCallback(async (preferences = DEFAULT_MATCH_PREFERENCES) => {
    if (!sessionToken || busyRef.current) return;
    busyRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      try {
        await presenceService.optIn(sessionToken, preferences);
      } catch (err) {
        // Already in a chat (e.g. after a reload): go back into it
        if (err?.status === 409 && err.data?.data?.chat_id) {
          enterChat(err.data.data.chat_id, err.data.data.partner_id, { announce: false });
          return;
        }
        throw err;
      }

      resetChat("waiting");

      if (isConnected()) {
        joinPresencePool();
      } else {
        const response = await chatService.startChat(sessionToken);
        applyStartResult(response.data?.data);
      }
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
      throw err;
    } finally {
      setIsLoading(false);
      busyRef.current = false;
    }
  }, [sessionToken, enterChat, resetChat, applyStartResult]);

  /** End the current chat: WebSocket when connected, REST otherwise. */
  const endCurrentChat = useCallback(async () => {
    const currentChatId = chatIdRef.current;
    if (!currentChatId) return;

    if (isConnected()) {
      try {
        await endSocketChat(currentChatId);
        return;
      } catch (err) {
        logWarn("WebSocket end failed, falling back to HTTP:", err.message);
      }
    }
    await chatService.endChat(sessionToken, currentChatId);
  }, [sessionToken]);

  const endChat = useCallback(async () => {
    if (!sessionToken || statusRef.current !== "matched") return;
    setIsLoading(true);
    try {
      await endCurrentChat();
      toast.success("Chat ended");
    } catch (err) {
      // 404: already ended on the server. Anything else: still leave the chat locally.
      if (err?.status !== 404) toast.error(err.message);
    } finally {
      resetChat("ended");
      setIsLoading(false);
    }
  }, [sessionToken, endCurrentChat, resetChat]);

  const findNewMatch = useCallback(async (preferences) => {
    if (!sessionToken) return;
    if (statusRef.current === "matched") {
      try {
        await endCurrentChat();
      } catch (err) {
        if (err?.status !== 404) {
          toast.error(err.message);
          return;
        }
      }
      resetChat("idle");
    }
    await startChat(preferences);
  }, [sessionToken, endCurrentChat, resetChat, startChat]);

  const cancelSearch = useCallback(async () => {
    if (!sessionToken) return;
    setIsLoading(true);
    try {
      leavePresencePool();
      await presenceService.optOut(sessionToken);
      toast("Search cancelled");
    } catch (err) {
      toast.error(err.message);
    } finally {
      resetChat("idle");
      setIsLoading(false);
    }
  }, [sessionToken, resetChat]);

  const returnToLobby = useCallback(() => {
    setError(null);
    resetChat("idle");
  }, [resetChat]);

  const sendMessage = useCallback(async (content) => {
    const text = content.trim();
    if (!sessionToken || !chatIdRef.current || !text) return;

    try {
      let message;
      if (isConnected()) {
        message = await sendSocketMessage(chatIdRef.current, text);
      } else {
        const response = await chatService.sendMessage(sessionToken, chatIdRef.current, text);
        message = response.data?.data;
      }

      setMessages((prev) => mergeMessages(prev, [{
        message_id: message.message_id,
        sender: "you",
        content: message.content,
        created_at: message.created_at,
        is_flagged: message.is_flagged,
      }]));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [sessionToken]);

  const fetchMessages = useCallback(async () => {
    const currentChatId = chatIdRef.current;
    if (!sessionToken || !currentChatId) return;

    try {
      const response = await chatService.getMessages(sessionToken, currentChatId);
      const data = response.data?.data;
      if (chatIdRef.current !== currentChatId) return; // chat changed while loading

      setMessages((prev) => mergeMessages(prev, data?.messages || []));
      if (data?.chat_status === "ended") handlePartnerEnded();
    } catch (err) {
      if (err?.status === 404) handlePartnerEnded();
      else logError("Failed to fetch messages:", err.message);
    }
  }, [sessionToken, handlePartnerEnded]);

  // Load history when entering a chat (also restores messages after a reload)
  useEffect(() => {
    if (chatId) fetchMessages();
  }, [chatId, fetchMessages]);

  // ── Connection, heartbeat and reload recovery ──────────────────────────────
  useEffect(() => {
    if (!sessionToken || !guestId) return;
    let cancelled = false;

    connectSocket(sessionToken, guestId)
      .then(() => !cancelled && setIsWebSocketConnected(true))
      .catch((err) => {
        if (cancelled) return;
        logError("Failed to connect socket:", err.message);
        setIsWebSocketConnected(false);
        if (!err.message?.includes("Too many")) {
          toast.error("Real-time connection unavailable. Using slower updates.");
        }
      });

    const connectionCheck = setInterval(() => setIsWebSocketConnected(isConnected()), 1000);

    const heartbeat = async () => {
      try {
        const response = await presenceService.heartbeat(sessionToken);
        const data = response.data?.data;
        // After a reload the server still has our chat: go back into it
        if (!cancelled && data?.has_active_chat && data.chat_id && statusRef.current !== "matched") {
          enterChat(data.chat_id, null, { announce: false });
        }
      } catch (err) {
        logError("Heartbeat failed:", err.message);
      }
    };
    heartbeat();
    const heartbeatInterval = setInterval(heartbeat, HEARTBEAT_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(connectionCheck);
      clearInterval(heartbeatInterval);
    };
  }, [sessionToken, guestId, enterChat]);

  // ── REST polling fallback when the WebSocket is down ───────────────────────
  useEffect(() => {
    if (isWebSocketConnected || !sessionToken) return;

    if (status === "waiting") {
      const id = setInterval(async () => {
        try {
          const response = await chatService.startChat(sessionToken);
          if (statusRef.current === "waiting") applyStartResult(response.data?.data);
        } catch (err) {
          logError("Match polling failed:", err.message);
        }
      }, POLLING_INTERVAL_MATCHING);
      return () => clearInterval(id);
    }

    if (status === "matched") {
      const id = setInterval(fetchMessages, POLLING_INTERVAL_MESSAGES);
      return () => clearInterval(id);
    }
  }, [status, isWebSocketConnected, sessionToken, applyStartResult, fetchMessages]);

  // If the socket comes up while waiting (e.g. after REST fallback), join the pool
  useEffect(() => {
    if (isWebSocketConnected && status === "waiting") joinPresencePool();
  }, [isWebSocketConnected, status]);

  // ── WebSocket subscriptions ────────────────────────────────────────────────
  useEffect(() => {
    if (!isWebSocketConnected) return;

    const unsubscribeMatch = onMatchFound((data) => {
      if (statusRef.current !== "waiting" || chatIdRef.current) return;
      if (!data?.chat_id || data.partner_id === guestId) return;
      enterChat(data.chat_id, data.partner_id);
    });

    const unsubscribeEnded = onChatEnded((data) => {
      if (Number(data?.chat_id) === chatIdRef.current && data.ended_by !== guestId) {
        handlePartnerEnded();
      }
    });

    let typingTimer = null;
    const unsubscribeTyping = onTyping((data) => {
      if (data?.sender_guest_id === guestId) return;
      setIsPartnerTyping(Boolean(data.is_typing));
      clearTimeout(typingTimer);
      if (data.is_typing) typingTimer = setTimeout(() => setIsPartnerTyping(false), TYPING_DISPLAY_MS);
    });

    return () => {
      unsubscribeMatch();
      unsubscribeEnded();
      unsubscribeTyping();
      clearTimeout(typingTimer);
    };
  }, [isWebSocketConnected, guestId, enterChat, handlePartnerEnded]);

  useEffect(() => {
    if (!isWebSocketConnected || !chatId) return;

    return onMessage(chatId, (data) => {
      setIsPartnerTyping(false);
      setMessages((prev) => mergeMessages(prev, [{
        message_id: data.message_id,
        sender: data.sender_guest_id === guestId ? "you" : "partner",
        content: data.content,
        created_at: data.created_at,
        is_flagged: data.is_flagged || false,
      }]));
    });
  }, [isWebSocketConnected, chatId, guestId]);

  const value = {
    chatId,
    partnerId,
    status,
    messages,
    isLoading,
    error,
    isPartnerTyping,
    isWebSocketConnected,
    isChatEnded: status === "ended",
    startChat,
    endChat,
    cancelSearch,
    findNewMatch,
    returnToLobby,
    sendMessage,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
