import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { chatService } from "../api/services/chatService";
import { presenceService } from "../api/services/presenceService";
import { useGuest } from "./GuestContext";
import toast from "react-hot-toast";
import { log, error as logError, warn as logWarn } from "../utils/logger";
import {
  connectSocket,
  disconnectSocket,
  onMatchFound,
  onMessage,
  onTyping,
  onChatEnded,
  joinPresencePool,
  leavePresencePool,
  sendMessage as sendSocketMessage,
  endChat as endSocketChat,
  isConnected,
  getCurrentSessionToken,
} from "../lib/socketClient";

const ChatContext = createContext(null);

const POLLING_INTERVAL_MATCHING = Number(import.meta.env.VITE_POLLING_INTERVAL_MATCHING || 3000);
const POLLING_INTERVAL_MESSAGES = Number(import.meta.env.VITE_POLLING_INTERVAL_MESSAGES || 2000);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const { sessionToken, guestId } = useGuest();

  const [chatId, setChatId] = useState(null);
  const [partnerId, setPartnerId] = useState(null);
  const [status, setStatus] = useState("idle");
  const [messages, setMessages] = useState([]);
  const [isPolling, setIsPolling] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);

  const pollingIntervalRef = useRef(null);
  const isFetchingRef = useRef(false);
  const unsubscribeMatchRef = useRef(null);
  const unsubscribeMessageRef = useRef(null);
  const previousChatIdRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const statusRef = useRef(status);
  const chatIdRef = useRef(chatId);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    chatIdRef.current = chatId;
  }, [chatId]);

  const startChat = useCallback(async () => {
    if (!sessionToken || isFetchingRef.current) return;

    try {
      isFetchingRef.current = true;
      setIsLoading(true);
      setError(null);

      // CRITICAL: Opt in to matching (mutual intent)
      await presenceService.optIn(sessionToken);

      if (isWebSocketConnected) {
        setStatus("waiting");
        setChatId(null);
        setPartnerId(null);
        setMessages([]);
        joinPresencePool();
        return;
      }

      const response = await chatService.startChat(sessionToken);

      log('🔍 Start chat response:', response.data);

      // Handle both response formats
      const responseData = response.data.data || response.data;
      if (!responseData || !responseData.status) {
        logError('❌ Invalid start chat response structure:', response.data);
        throw new Error('Invalid response from server');
      }

      if (responseData.status === "waiting") {
        setStatus("waiting");
        setChatId(null);
        setPartnerId(null);
      } else if (responseData.status === "matched") {
        // Only set matched state if we have valid chat data
        if (responseData.chat_id && responseData.partner_id) {
          setChatId(responseData.chat_id);
          setPartnerId(responseData.partner_id);
          setStatus("matched");
          setMessages([]);
          // Only show toast if this is a new match (not re-entering existing chat)
          if (!previousChatIdRef.current) {
            toast.success("You've been matched with someone!");
          }
        } else {
          // Invalid match data, treat as waiting
          setStatus("waiting");
          setChatId(null);
          setPartnerId(null);
        }
      } else if (responseData.status === "already_matched") {
        // Only set matched state if we have valid chat data
        if (responseData.chat_id && responseData.partner_id) {
          setChatId(responseData.chat_id);
          setPartnerId(responseData.partner_id);
          setStatus("matched");
          setMessages([]);
          // Only show toast if this is a new match
          if (!previousChatIdRef.current) {
            toast.success("You've been matched with someone!");
          }
        } else {
          // Invalid match data, treat as waiting
          setStatus("waiting");
          setChatId(null);
          setPartnerId(null);
        }
      }
    } catch (err) {
      setError(err.message);
      // Only show error toast if not already waiting (to avoid spam during polling)
      if (status !== "waiting") {
        toast.error(err.message);
      }
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [sessionToken, status, isWebSocketConnected]);

  const fetchMessages = useCallback(async () => {
    if (!sessionToken || !chatId || isFetchingRef.current) return;

    try {
      isFetchingRef.current = true;
      const response = await chatService.getMessages(sessionToken, chatId);

      log('🔍 Get messages response:', response.data);

      // Handle both response formats
      const responseData = response.data.data || response.data;
      const newMessages = responseData?.messages || [];

      // Enhanced deduplication with time window (5 seconds)
      const now = Date.now();
      const DEDUP_WINDOW = 5000; // 5 seconds

      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.message_id));
        const recentMessages = new Map(
          prev
            .filter((m) => now - new Date(m.created_at).getTime() < DEDUP_WINDOW)
            .map((m) => [m.message_id, m])
        );

        const uniqueNewMessages = newMessages.filter((m) => {
          // Skip if already exists
          if (existingIds.has(m.message_id)) return false;

          // Skip if similar message exists in recent window (possible duplicate)
          const similarRecent = Array.from(recentMessages.values()).find(
            (recent) =>
              recent.content === m.content &&
              recent.sender === m.sender &&
              Math.abs(new Date(recent.created_at).getTime() - new Date(m.created_at).getTime()) < DEDUP_WINDOW
          );

          return !similarRecent;
        });

        return [...prev, ...uniqueNewMessages];
      });
    } catch (err) {
      if (err.message.includes("not found") || err.message.includes("ended")) {
        setStatus("ended");
        setChatId(null);
        setPartnerId(null);
        setMessages([]);
        stopPolling();
      } else {
        setError(err.message);
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, [sessionToken, chatId]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return;

    setIsPolling(true);

    // CRITICAL: Only poll if WebSocket is NOT connected
    if (status === "waiting" && !isWebSocketConnected) {
      pollingIntervalRef.current = setInterval(() => {
        // Don't poll if already matched
        if (statusRef.current !== "waiting") {
          stopPolling();
          return;
        }
        startChat();
      }, POLLING_INTERVAL_MATCHING);
    } else if ((status === "matched" || status === "active") && !isWebSocketConnected) {
      pollingIntervalRef.current = setInterval(() => {
        // Don't poll if no longer in chat
        if (!chatIdRef.current || (statusRef.current !== "matched" && statusRef.current !== "active")) {
          stopPolling();
          return;
        }
        fetchMessages();
      }, POLLING_INTERVAL_MESSAGES);
    }
  }, [status, startChat, fetchMessages, isWebSocketConnected]);

  const endChat = useCallback(async () => {
    if (!sessionToken || !chatId) return;

    try {
      setIsLoading(true);

      // CRITICAL: Verify chat is still active before ending
      if (status !== "matched" && status !== "active") {
        logWarn('Cannot end chat: not in active chat', { status, chatId });
        return;
      }

      // CRITICAL: Opt out from matching when ending chat
      await presenceService.optOut(sessionToken);

      // End chat via WebSocket server
      await endSocketChat(chatId);

      // Clear all match state completely
      setChatId(null);
      setPartnerId(null);
      setStatus("ended");
      setMessages([]);
      setError(null);
      previousChatIdRef.current = null;
      stopPolling();

      toast.success("Chat ended");
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
      // Still clear state on error to prevent stuck UI
      setChatId(null);
      setPartnerId(null);
      setStatus("ended");
      setMessages([]);
      previousChatIdRef.current = null;
      stopPolling();
    } finally {
      setIsLoading(false);
    }
  }, [sessionToken, chatId, status, stopPolling]);

  const findNewMatch = useCallback(async () => {
    if (!sessionToken) return;

    try {
      setIsLoading(true);
      setError(null);

      // Clear ended state
      setStatus("idle");
      setChatId(null);
      setPartnerId(null);
      setMessages([]);

      // Start new matching process
      await startChat();
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [sessionToken, startChat]);

  const returnToLobby = useCallback(() => {
    setChatId(null);
    setPartnerId(null);
    setStatus("idle");
    setMessages([]);
    setError(null);
    previousChatIdRef.current = null;
    stopPolling();
  }, [stopPolling]);

  const cancelSearch = useCallback(async () => {
    if (!sessionToken) return;

    try {
      setIsLoading(true);

      // Opt out from matching
      await presenceService.optOut(sessionToken);
      leavePresencePool();

      // Clear all match state
      setChatId(null);
      setPartnerId(null);
      setStatus("idle");
      setMessages([]);
      setError(null);
      previousChatIdRef.current = null;
      stopPolling();

      toast("Search cancelled", { icon: "ℹ️" });
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [sessionToken, stopPolling]);

  const sendMessage = useCallback(async (content) => {
    if (!sessionToken || !chatId || !content.trim()) return;

    try {
      let message;
      
      // Try WebSocket first, fallback to HTTP API if not connected
      if (isWebSocketConnected) {
        try {
          message = await sendSocketMessage(chatId, content.trim());
        } catch (socketErr) {
          // If WebSocket fails, fallback to HTTP API
          logWarn("WebSocket send failed, falling back to HTTP API:", socketErr);
          const response = await chatService.sendMessage(sessionToken, chatId, content.trim());
          message = response.data.data || response.data;
        }
      } else {
        // Use HTTP API when WebSocket is not connected
        log("WebSocket not connected, using HTTP API to send message");
        const response = await chatService.sendMessage(sessionToken, chatId, content.trim());
        message = response.data.data || response.data;
      }

      const newMessage = {
        message_id: message.message_id,
        sender: "you",
        content: message.content,
        created_at: message.created_at,
        is_flagged: message.is_flagged,
      };

      setMessages((prev) => [...prev, newMessage]);

      if (message.is_flagged) {
        toast.warning("Your message was flagged for inappropriate content");
      }
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
      throw err;
    }
  }, [sessionToken, chatId, isWebSocketConnected]);

  useEffect(() => {
    if (status === "waiting" || status === "matched" || status === "active") {
      if (!isWebSocketConnected) {
        startPolling();
      } else {
        stopPolling();
      }
    } else {
      stopPolling();
    }

    return () => stopPolling();
  }, [status, isWebSocketConnected, startPolling, stopPolling]);

  useEffect(() => {
    if (!sessionToken || !guestId) return;

    // CRITICAL: Use refs to track if component is still mounted
    let isMounted = true;
    let connectionAborted = false;

    // CRITICAL: Debounce connection to prevent rapid reconnections
    const connectionTimeout = setTimeout(() => {
      if (connectionAborted) return;

      // Check if already connected before attempting new connection
      if (isConnected() && getCurrentSessionToken() === sessionToken) {
        if (isMounted) {
          setIsWebSocketConnected(true);
        }
        return;
      }

      connectSocket(sessionToken, guestId)
        .then(() => {
          if (isMounted && !connectionAborted) {
            setIsWebSocketConnected(true);
          }
        })
        .catch((err) => {
          if (isMounted && !connectionAborted) {
            logError("Failed to connect socket:", err);
            setIsWebSocketConnected(false);
            
            // Only show error toast for actual failures, not user-actionable errors
            if (err.message?.includes('Too many connections')) {
              // User needs to close tabs - don't spam with toasts
              logWarn("Too many connections - user should close other tabs");
            } else {
              toast.error("Real-time features unavailable. Some features may not work.");
            }
          }
        });
    }, 100); // Small delay to batch rapid dependency changes

    const checkConnectionInterval = setInterval(() => {
      if (isMounted) {
        setIsWebSocketConnected(isConnected());
      }
    }, 1000);

    // CRITICAL: Start heartbeat to maintain presence
    const startHeartbeat = async () => {
      if (connectionAborted) return;
      try {
        await presenceService.heartbeat(sessionToken);
      } catch (err) {
        if (isMounted) {
          logError("Heartbeat failed:", err);
        }
      }
    };

    // Send heartbeat every 30 seconds
    heartbeatIntervalRef.current = setInterval(startHeartbeat, 30000);
    // Initial heartbeat
    startHeartbeat();

    // Cleanup function
    return () => {
      isMounted = false;
      connectionAborted = true;
      clearTimeout(connectionTimeout);
      clearInterval(checkConnectionInterval);
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      // CRITICAL: Only disconnect if this is the last component using the socket
      // Don't disconnect on every unmount - let the singleton manage it
      // Only notify backend of disconnect
      presenceService.disconnect(sessionToken).catch((err) => {
        logError("Failed to notify backend of disconnect:", err);
      });
    };
  }, [sessionToken, guestId]);

  useEffect(() => {
    if (!sessionToken || !guestId || !isWebSocketConnected) return;

    unsubscribeMatchRef.current = onMatchFound((data) => {
      // Only process match if we're currently waiting and don't have a chat
      if (statusRef.current === "waiting" && !chatIdRef.current) {
        if (data.chat_id && data.partner_id) {
          // Don't match with self
          if (data.partner_id === guestId) {
            logWarn("Ignoring self-match attempt");
            return;
          }

          setChatId(data.chat_id);
          setPartnerId(data.partner_id);
          setStatus("matched");
          setMessages([]);
          // Only show toast for new matches from WebSocket
          if (!previousChatIdRef.current) {
            toast.success("You've been matched with someone!");
          }
        }
      }
    });

    return () => {
      if (unsubscribeMatchRef.current) {
        unsubscribeMatchRef.current();
      }
    };
  }, [sessionToken, guestId, isWebSocketConnected]);

  useEffect(() => {
    if (!sessionToken || !guestId || !chatId || !isWebSocketConnected) return;

    unsubscribeMessageRef.current = onMessage(chatId, (data) => {
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.message_id));
        if (existingIds.has(data.message_id)) {
          return prev;
        }
        return [
          ...prev,
          {
            message_id: data.message_id,
            sender: data.sender_guest_id === guestId ? "you" : "partner",
            content: data.content,
            created_at: data.created_at,
            is_flagged: data.is_flagged || false,
          },
        ];
      });
    });

    return () => {
      if (unsubscribeMessageRef.current) {
        unsubscribeMessageRef.current();
      }
    };
  }, [sessionToken, guestId, chatId, isWebSocketConnected]);

  useEffect(() => {
    if (!sessionToken || !guestId || !chatId || !isWebSocketConnected) return;

    const typingTimeoutRef = { current: null };

    const unsubscribeTyping = onTyping(chatId, (data) => {
      if (data.sender_guest_id !== guestId) {
        setIsPartnerTyping(data.is_typing);

        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        if (data.is_typing) {
          typingTimeoutRef.current = setTimeout(() => {
            setIsPartnerTyping(false);
          }, 3000);
        }
      }
    });

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (unsubscribeTyping) {
        unsubscribeTyping();
      }
    };
  }, [sessionToken, guestId, chatId, isWebSocketConnected]);

  useEffect(() => {
    if (!sessionToken || !guestId || !isWebSocketConnected) return;

    const unsubscribeChatEnded = onChatEnded((data) => {
      // Use ref to get current chatId value
      const currentChatId = chatIdRef.current;

      // Handle chat ended event
      // Only process if we're in this chat, or we just need to clear state
      if (currentChatId && data.chat_id === currentChatId) {
        // CRITICAL: Prevent duplicate processing
        if (statusRef.current === 'ended') {
          return;
        }

        setChatId(null);
        setPartnerId(null);
        setStatus("ended");
        setMessages([]);
        setError(null);
        previousChatIdRef.current = null;
        stopPolling();

        // Show notification
        toast("Your chat partner has ended the conversation.", { icon: "ℹ️" });
      } else if (!currentChatId && data.ended_by !== guestId) {
        // We received a chat ended event but we're not in a chat
        // This means we were the one who ended it, or it's an old event
        // Ignore silently
      }
    });

    return () => {
      if (unsubscribeChatEnded) {
        unsubscribeChatEnded();
      }
    };
  }, [sessionToken, guestId, isWebSocketConnected]);

  useEffect(() => {
    if (chatId && chatId !== previousChatIdRef.current) {
      // Join presence pool when entering waiting state
      if (status === "waiting") {
        joinPresencePool();
      }
      previousChatIdRef.current = chatId;
    }
  }, [chatId, status]);

  // Update previousChatIdRef when chatId changes to null (chat ended)
  useEffect(() => {
    if (!chatId && previousChatIdRef.current) {
      previousChatIdRef.current = null;
    }
  }, [chatId]);

  const value = {
    chatId,
    partnerId,
    status,
    messages,
    isPolling,
    isLoading,
    error,
    isPartnerTyping,
    isChatEnded: status === "ended",
    startChat,
    endChat,
    cancelSearch,
    findNewMatch,
    returnToLobby,
    sendMessage,
    fetchMessages,
    setStatus,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
