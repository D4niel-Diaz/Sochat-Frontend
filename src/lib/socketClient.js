import { io } from "socket.io-client";
import { log, error as logError, warn as logWarn } from "../utils/logger";

const ACK_TIMEOUT_MS = 10000;
const CONNECT_TIMEOUT_MS = 15000;
const MAX_RECONNECT_ATTEMPTS = 10;

const getWebSocketURL = () =>
  import.meta.env.VITE_WEBSOCKET_URL ||
  (import.meta.env.PROD ? "https://sochat-websocket-server.onrender.com" : "http://localhost:3001");

let socket = null;
let connectionPromise = null;
let currentSessionToken = null;
let shouldBeInPresencePool = false;
// Chat to rejoin after a reconnect (the server may have restarted)
let activeChatId = null;

const onReconnect = () => {
  log("Socket reconnected");
  if (shouldBeInPresencePool) socket.emit("presence:join");
  if (activeChatId) socket.emit("chat:rejoin", { chatId: activeChatId });
};

/**
 * Connect (or reuse the connection) for this guest.
 * @returns {Promise<import("socket.io-client").Socket>}
 */
export const connectSocket = (sessionToken, guestId) => {
  if (socket?.connected && currentSessionToken === sessionToken) {
    return Promise.resolve(socket);
  }
  if (connectionPromise && currentSessionToken === sessionToken) {
    return connectionPromise;
  }

  if (socket) {
    socket.removeAllListeners();
    socket.io.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  currentSessionToken = sessionToken;
  socket = io(getWebSocketURL(), {
    transports: ["websocket", "polling"],
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: CONNECT_TIMEOUT_MS,
    auth: { token: sessionToken, guestId },
  });

  socket.on("disconnect", (reason) => log("Socket disconnected:", reason));
  socket.io.on("reconnect", onReconnect);
  socket.io.on("reconnect_failed", () => logError("Reconnection failed. WebSocket server may be unavailable."));

  const thisSocket = socket;
  connectionPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(new Error("Socket connection timeout")), CONNECT_TIMEOUT_MS);

    function finish(err) {
      clearTimeout(timer);
      thisSocket.off("connect", onConnect);
      thisSocket.off("connect_error", onConnectError);
      if (connectionPromise && socket === thisSocket) connectionPromise = null;
      if (err) reject(err);
      else resolve(thisSocket);
    }

    function onConnect() {
      log("Socket connected");
      // A chat restored before the socket was ready (e.g. right after a reload)
      if (activeChatId) thisSocket.emit("chat:rejoin", { chatId: activeChatId });
      finish();
    }

    // Auth and connection-limit errors won't fix themselves; other errors retry
    function onConnectError(err) {
      logError("Socket connection error:", err?.message);
      if (err?.message?.includes("Authentication failed") || err?.message?.includes("Too many")) {
        finish(new Error(err.message));
      }
    }

    thisSocket.on("connect", onConnect);
    thisSocket.on("connect_error", onConnectError);
  });

  return connectionPromise;
};

export const disconnectSocket = () => {
  shouldBeInPresencePool = false;
  activeChatId = null;
  currentSessionToken = null;
  connectionPromise = null;
  if (socket) {
    socket.removeAllListeners();
    socket.io.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};

export const getCurrentSessionToken = () => currentSessionToken;

export const isConnected = () => socket?.connected || false;

/** Remember which chat to rejoin if the connection drops, and make sure the server has it now. */
export const setActiveChat = (chatId) => {
  activeChatId = chatId ? Number(chatId) : null;
  // Harmless when the server already knows; restores membership after a reload
  if (activeChatId && socket?.connected) socket.emit("chat:rejoin", { chatId: activeChatId });
};

export const joinPresencePool = () => {
  if (!socket?.connected) {
    logWarn("Cannot join presence pool: not connected");
    return;
  }
  shouldBeInPresencePool = true;
  socket.emit("presence:join");
};

export const leavePresencePool = () => {
  shouldBeInPresencePool = false;
  socket?.connected && socket.emit("presence:leave");
};

const subscribe = (event, handler) => {
  if (!socket) return () => {};
  const target = socket;
  target.on(event, handler);
  return () => target.off(event, handler);
};

export const onMatchFound = (callback) =>
  subscribe("match:found", (data) => {
    shouldBeInPresencePool = false;
    callback(data);
  });

/** Messages for the given chat only. Callers dedupe by message_id. */
export const onMessage = (chatId, callback) =>
  subscribe("message", (data) => {
    if (Number(data?.chat_id) === Number(chatId)) callback(data);
  });

export const onTyping = (callback) => subscribe("typing", callback);

export const onChatEnded = (callback) =>
  subscribe("chat:ended", (data) => {
    if (Number(data?.chat_id) === activeChatId) activeChatId = null;
    callback(data);
  });

const emitWithAck = (event, payload) => {
  if (!socket?.connected) {
    return Promise.reject(new Error("Socket not connected"));
  }
  return new Promise((resolve, reject) => {
    socket.timeout(ACK_TIMEOUT_MS).emit(event, payload, (err, response) => {
      if (err) return reject(new Error("The server did not respond. Please try again."));
      if (!response?.success) return reject(new Error(response?.error || `Failed: ${event}`));
      resolve(response);
    });
  });
};

export const sendMessage = async (chatId, content) =>
  (await emitWithAck("message:send", { chatId: Number(chatId), content })).message;

export const sendTyping = (chatId, isTyping) => {
  if (!socket?.connected || !chatId) return;
  socket.emit(isTyping ? "typing:start" : "typing:stop", { chatId: Number(chatId) });
};

export const endChat = async (chatId) => {
  await emitWithAck("chat:end", { chatId: Number(chatId) });
  activeChatId = null;
};
