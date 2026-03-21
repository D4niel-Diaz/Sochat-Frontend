import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { chatService }     from "../api/services/chatService";
import { presenceService } from "../api/services/presenceService";
import { useGuest }        from "./GuestContext";
import toast               from "react-hot-toast";
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
  getSocket,
} from "../lib/socketClient";

const ChatContext = createContext(null);

const POLLING_INTERVAL_MATCHING  = Number(import.meta.env.VITE_POLLING_INTERVAL_MATCHING  || 3000);
const POLLING_INTERVAL_MESSAGES  = Number(import.meta.env.VITE_POLLING_INTERVAL_MESSAGES  || 2000);

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within a ChatProvider");
  return ctx;
};

export const ChatProvider = ({ children }) => {
  const { sessionToken, guestId } = useGuest();

  const [chatId,               setChatId]               = useState(null);
  const [partnerId,            setPartnerId]             = useState(null);
  const [status,               setStatus]               = useState("idle");
  const [messages,             setMessages]             = useState([]);
  const [isPolling,            setIsPolling]            = useState(false);
  const [isLoading,            setIsLoading]            = useState(false);
  const [error,                setError]                = useState(null);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const [isPartnerTyping,      setIsPartnerTyping]      = useState(false);

  // FIX: Use separate refs for each async operation to avoid the shared lock
  // causing one operation to silently block the other.
  const isFetchingMatchRef    = useRef(false);
  const isFetchingMessagesRef = useRef(false);

  const pollingIntervalRef    = useRef(null);
  const unsubscribeMatchRef   = useRef(null);
  const unsubscribeMessageRef = useRef(null);
  const previousChatIdRef     = useRef(null);
  const heartbeatIntervalRef  = useRef(null);

  // Stable refs for values accessed inside intervals/callbacks
  const statusRef              = useRef(status);
  const chatIdRef              = useRef(chatId);
  const isWebSocketConnectedRef= useRef(isWebSocketConnected);

  useEffect(() => { statusRef.current              = status;               }, [status]);
  useEffect(() => { chatIdRef.current              = chatId;               }, [chatId]);
  useEffect(() => { isWebSocketConnectedRef.current= isWebSocketConnected; }, [isWebSocketConnected]);

  // ── Polling ────────────────────────────────────────────────────────────────

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  // ── Core chat actions ──────────────────────────────────────────────────────

  const startChat = useCallback(async (
    role         = "learner",
    subject      = "General",
    availability = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18]
  ) => {
    if (!sessionToken || isFetchingMatchRef.current) return;

    try {
      isFetchingMatchRef.current = true;
      setIsLoading(true);
      setError(null);

      // Opt in to the matching pool
      await presenceService.optIn(sessionToken, role, subject, availability);

      // If socket is live, let the WS server handle matching via presence events
      if (isWebSocketConnectedRef.current) {
        setStatus("waiting");
        setChatId(null);
        setPartnerId(null);
        setMessages([]);
        joinPresencePool();
        return;
      }

      // Fallback: HTTP polling for matching
      const response    = await chatService.startChat(sessionToken);
      const responseData= response.data?.data || response.data;

      if (!responseData?.status) {
        throw new Error("Invalid response from server");
      }

      const handleMatchedData = (d) => {
        if (d.chat_id && d.partner_id) {
          setChatId(d.chat_id);
          setPartnerId(d.partner_id);
          setStatus("matched");
          setMessages([]);
          if (!previousChatIdRef.current) toast.success("You've been matched with someone!");
        } else {
          setStatus("waiting");
          setChatId(null);
          setPartnerId(null);
        }
      };

      if (responseData.status === "waiting") {
        setStatus("waiting");
        setChatId(null);
        setPartnerId(null);
      } else if (responseData.status === "matched" || responseData.status === "already_matched") {
        handleMatchedData(responseData);
      }
    } catch (err) {
      setError(err.message);
      if (statusRef.current !== "waiting") toast.error(err.message);
    } finally {
      setIsLoading(false);
      isFetchingMatchRef.current = false;
    }
  }, [sessionToken]);  // removed `status` dep — stale closure risk eliminated via statusRef

  const fetchMessages = useCallback(async () => {
    if (!sessionToken || !chatIdRef.current || isFetchingMessagesRef.current) return;

    try {
      isFetchingMessagesRef.current = true;
      const response    = await chatService.getMessages(sessionToken, chatIdRef.current);
      const responseData= response.data?.data || response.data;
      const newMessages = responseData?.messages || [];

      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.message_id));
        const unique      = newMessages.filter((m) => !existingIds.has(m.message_id));
        return unique.length ? [...prev, ...unique] : prev;
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
      isFetchingMessagesRef.current = false;
    }
  }, [sessionToken, stopPolling]);

  const endChat = useCallback(async () => {
    if (!sessionToken || !chatIdRef.current) return;
    if (statusRef.current !== "matched" && statusRef.current !== "active") {
      logWarn("Cannot end chat: not in active chat", { status: statusRef.current });
      return;
    }

    try {
      setIsLoading(true);
      await presenceService.optOut(sessionToken);

      // Try WebSocket first; fall back to HTTP if disconnected
      if (isWebSocketConnectedRef.current) {
        await endSocketChat(chatIdRef.current);
      } else {
        await chatService.endChat(sessionToken, chatIdRef.current);
      }

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
      // Reset state regardless so UI doesn't get stuck
      setChatId(null);
      setPartnerId(null);
      setStatus("ended");
      setMessages([]);
      previousChatIdRef.current = null;
      stopPolling();
    } finally {
      setIsLoading(false);
    }
  }, [sessionToken, stopPolling]);

  const findNewMatch = useCallback(async () => {
    if (!sessionToken) return;
    try {
      setIsLoading(true);
      setError(null);
      setStatus("idle");
      setChatId(null);
      setPartnerId(null);
      setMessages([]);
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
      await presenceService.optOut(sessionToken);
      leavePresencePool();
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
    if (!sessionToken || !chatIdRef.current || !content.trim()) return;

    try {
      let message;

      if (isWebSocketConnectedRef.current) {
        try {
          message = await sendSocketMessage(chatIdRef.current, content.trim());
        } catch (socketErr) {
          logWarn("WebSocket send failed, falling back to HTTP:", socketErr);
          const r = await chatService.sendMessage(sessionToken, chatIdRef.current, content.trim());
          message = r.data?.data || r.data;
        }
      } else {
        const r = await chatService.sendMessage(sessionToken, chatIdRef.current, content.trim());
        message = r.data?.data || r.data;
      }

      const newMessage = {
        message_id: message.message_id,
        sender:     "you",
        content:    message.content,
        created_at: message.created_at,
        is_flagged: message.is_flagged,
      };

      setMessages((prev) => {
        if (prev.some((m) => m.message_id === newMessage.message_id)) return prev;
        return [...prev, newMessage];
      });

      if (message.is_flagged) {
        toast("Your message was flagged for review.", { icon: "⚠️" });
      }
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
      throw err;
    }
  }, [sessionToken]);  // removed chatId/isWebSocketConnected deps — use refs

  // ── Polling manager ────────────────────────────────────────────────────────
  // FIX: startPolling reads status/chatId via refs inside the interval callback
  // to avoid capturing stale closure values. The interval itself is unified —
  // one interval that decides what to do each tick.
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return;
    setIsPolling(true);

    pollingIntervalRef.current = setInterval(() => {
      const currentStatus = statusRef.current;
      const currentChatId = chatIdRef.current;
      const wsConnected   = isWebSocketConnectedRef.current;

      // Stop polling as soon as WS takes over
      if (wsConnected) { stopPolling(); return; }

      if (currentStatus === "waiting") {
        startChat();
      } else if ((currentStatus === "matched" || currentStatus === "active") && currentChatId) {
        fetchMessages();
      } else {
        stopPolling();
      }
    }, Math.min(POLLING_INTERVAL_MATCHING, POLLING_INTERVAL_MESSAGES));
  }, [startChat, fetchMessages, stopPolling]);

  // ── Side effects ──────────────────────────────────────────────────────────

  // Manage polling based on status & WS connection
  useEffect(() => {
    const shouldPoll = ["waiting", "matched", "active"].includes(status) && !isWebSocketConnected;
    if (shouldPoll) {
      startPolling();
    } else {
      stopPolling();
    }
    return () => stopPolling();
  }, [status, isWebSocketConnected, startPolling, stopPolling]);

  // WebSocket connection lifecycle
  useEffect(() => {
    if (!sessionToken || !guestId) return;

    let isMounted         = true;
    let connectionAborted = false;

    const connectionTimeout = setTimeout(() => {
      if (connectionAborted) return;

      // Reuse if already connected with same token
      if (isConnected() && getCurrentSessionToken() === sessionToken) {
        if (isMounted) setIsWebSocketConnected(true);
        return;
      }

      connectSocket(sessionToken, guestId)
        .then(() => {
          if (isMounted && !connectionAborted) setIsWebSocketConnected(true);
        })
        .catch((err) => {
          if (!isMounted || connectionAborted) return;
          logError("Socket connection failed:", err);
          setIsWebSocketConnected(false);
          if (err.message?.includes("Too many connections")) {
            logWarn("Too many connections — user should close other tabs");
          } else if (err.message?.includes("Invalid session") || err.message?.includes("Authentication failed")) {
            toast.error("Session expired. Please refresh the page.");
          } else {
            toast.error("Real-time features unavailable. Using polling fallback.");
          }
        });
    }, 100);

    // FIX: Use Socket.IO events instead of 1-second setInterval to avoid
    // triggering React re-renders (and thus re-renders of all consumers)
    // every second when the connection state hasn't changed.
    const attachSocketStatusListeners = () => {
      const sock = getSocket();
      if (!sock) return;
      const onConnect    = () => { if (isMounted) setIsWebSocketConnected(true);  };
      const onDisconnect = () => { if (isMounted) setIsWebSocketConnected(false); };
      sock.on('connect',    onConnect);
      sock.on('disconnect', onDisconnect);
      return () => { sock.off('connect', onConnect); sock.off('disconnect', onDisconnect); };
    };

    // Give socket a moment to be created, then attach listeners
    const listenerTimeout = setTimeout(() => {
      if (!connectionAborted) attachSocketStatusListeners?.();
    }, 200);

    // Heartbeat to keep presence alive
    const heartbeat = async () => {
      if (connectionAborted) return;
      try { await presenceService.heartbeat(sessionToken); } catch (_) {}
    };
    heartbeatIntervalRef.current = setInterval(heartbeat, 30000);
    heartbeat();

    return () => {
      isMounted         = false;
      connectionAborted = true;
      clearTimeout(connectionTimeout);
      clearTimeout(listenerTimeout);
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      presenceService.disconnect(sessionToken).catch(() => {});
    };
  }, [sessionToken, guestId]);

  // WebSocket: match found
  useEffect(() => {
    if (!sessionToken || !guestId || !isWebSocketConnected) return;

    unsubscribeMatchRef.current = onMatchFound((data) => {
      if (statusRef.current === "waiting" && !chatIdRef.current) {
        if (!data.chat_id || !data.partner_id) return;
        if (data.partner_id === guestId) { logWarn("Ignoring self-match"); return; }

        setChatId(data.chat_id);
        setPartnerId(data.partner_id);
        setStatus("matched");
        setMessages([]);
        if (!previousChatIdRef.current) toast.success("You've been matched with someone!");
      }
    });

    return () => { unsubscribeMatchRef.current?.(); };
  }, [sessionToken, guestId, isWebSocketConnected]);

  // WebSocket: incoming messages
  useEffect(() => {
    if (!sessionToken || !guestId || !chatId || !isWebSocketConnected) return;

    unsubscribeMessageRef.current = onMessage(chatId, (data) => {
      setMessages((prev) => {
        if (prev.some((m) => m.message_id === data.message_id)) return prev;
        return [
          ...prev,
          {
            message_id: data.message_id,
            sender:     data.sender_guest_id === guestId ? "you" : "partner",
            content:    data.content,
            created_at: data.created_at,
            is_flagged: data.is_flagged || false,
          },
        ];
      });
    });

    return () => { unsubscribeMessageRef.current?.(); };
  }, [sessionToken, guestId, chatId, isWebSocketConnected]);

  // WebSocket: typing indicator
  useEffect(() => {
    if (!sessionToken || !guestId || !chatId || !isWebSocketConnected) return;

    const typingTimeout = { current: null };

    const unsub = onTyping(chatId, (data) => {
      if (data.sender_guest_id === guestId) return; // own typing event — ignore
      setIsPartnerTyping(data.is_typing);

      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      if (data.is_typing) {
        typingTimeout.current = setTimeout(() => setIsPartnerTyping(false), 3000);
      }
    });

    return () => {
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      unsub?.();
    };
  }, [sessionToken, guestId, chatId, isWebSocketConnected]);

  // WebSocket: chat ended by partner
  useEffect(() => {
    if (!sessionToken || !guestId || !isWebSocketConnected) return;

    const unsub = onChatEnded((data) => {
      const currentChatId = chatIdRef.current;
      if (!currentChatId || data.chat_id !== currentChatId) return;
      if (statusRef.current === "ended") return; // already handled

      setChatId(null);
      setPartnerId(null);
      setStatus("ended");
      setMessages([]);
      setError(null);
      previousChatIdRef.current = null;
      stopPolling();

      toast("Your chat partner has ended the conversation.", { icon: "ℹ️" });
    });

    return () => { unsub?.(); };
  }, [sessionToken, guestId, isWebSocketConnected, stopPolling]);

  // Track previousChatId for toast deduplication
  useEffect(() => {
    if (chatId && chatId !== previousChatIdRef.current) {
      previousChatIdRef.current = chatId;
    }
  }, [chatId]);

  useEffect(() => {
    if (!chatId) previousChatIdRef.current = null;
  }, [chatId]);

  // ── Context value ─────────────────────────────────────────────────────────

  const value = {
    chatId,
    partnerId,
    status,
    messages,
    isPolling,
    isLoading,
    error,
    isPartnerTyping,
    isChatEnded:          status === "ended",
    isWebSocketConnected,
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
