import { io } from 'socket.io-client';
import { log, error, warn } from '../utils/logger';

// WebSocket URL - use environment variable or default
// In production, this should be set to your WebSocket server URL
// Convert https:// to wss:// and http:// to ws:// automatically
const getWebSocketURL = () => {
  // Default production WebSocket URL
  const defaultProdUrl = 'https://sochat-websocket-server.onrender.com';
  const defaultDevUrl = 'http://localhost:3001';
  
  const url = import.meta.env.VITE_WEBSOCKET_URL || 
    (import.meta.env.PROD ? defaultProdUrl : defaultDevUrl);
  
  // Convert https:// to wss:// and http:// to ws://
  if (url.startsWith('https://')) {
    return url.replace('https://', 'wss://');
  }
  if (url.startsWith('http://')) {
    return url.replace('http://', 'ws://');
  }
  // If already ws:// or wss://, return as is
  return url;
};

const WEBSOCKET_URL = getWebSocketURL();

// Singleton socket instance
let socket = null;
let connectionPromise = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 1000;
const CONNECT_TIMEOUT_MS = 10000;

// State tracking
let currentSessionToken = null;
let currentGuestId = null;
let isIntentionalDisconnect = false;
let messageSequenceNumbers = new Map(); // chatId -> last sequence number
let pendingMessages = new Map(); // chatId -> array of pending messages
let messageBuffer = new Map(); // chatId -> buffer for out-of-order messages
let shouldBeInPresencePool = false;

// Event handlers storage
const eventHandlers = new Map();

/**
 * Initialize Socket.IO connection
 * @param {string} sessionToken - Guest session token
 * @param {string} guestId - Guest ID
 * @returns {Promise<Socket>}
 */
export const connectSocket = async (sessionToken, guestId) => {
  currentSessionToken = sessionToken;
  currentGuestId = guestId;

  if (socket && socket.connected) {
    return socket;
  }

  if (!socket) {
    socket = io(WEBSOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: RECONNECT_DELAY,
      reconnectionDelayMax: 10000,
      timeout: 20000,
      auth: {
        token: sessionToken,
        guestId: guestId
      }
    });

    socket.on('disconnect', (reason) => {
      log('Socket disconnected:', reason);
    });

    socket.io.on('reconnect_attempt', (attemptNumber) => {
      reconnectAttempts = attemptNumber;
      log(`Reconnection attempt ${attemptNumber}/${MAX_RECONNECT_ATTEMPTS}`);
    });

    socket.io.on('reconnect', (attemptNumber) => {
      log(`Reconnected after ${attemptNumber} attempts`);
      reconnectAttempts = 0;
      resubscribeEvents();
    });

    socket.io.on('reconnect_failed', () => {
      error('Reconnection failed. WebSocket server may be unavailable.');
    });

    // Handle connection errors more gracefully
    socket.io.on('error', (err) => {
      error('Socket.IO error:', err);
    });

    // Handle transport errors
    socket.io.on('reconnect_error', (err) => {
      error('Reconnection error:', err);
    });
  } else {
    socket.auth = {
      token: sessionToken,
      guestId: guestId
    };

    if (!socket.connected) {
      socket.connect();
    }
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      connectionPromise = null;
      reject(new Error('Socket connection timeout'));
    }, CONNECT_TIMEOUT_MS);

    const onConnect = () => {
      clearTimeout(timeoutId);
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);

      log('Socket connected');
      reconnectAttempts = 0;
      isIntentionalDisconnect = false;
      connectionPromise = null;
      resolve(socket);
    };

    const onConnectError = (err) => {
      error('Socket connection error:', err);

      // Handle specific error types
      if (err?.message?.includes('Authentication failed')) {
        clearTimeout(timeoutId);
        socket.off('connect', onConnect);
        socket.off('connect_error', onConnectError);
        connectionPromise = null;
        reject(new Error('Authentication failed. Check session token.'));
      } else if (err?.message?.includes('timeout') || err?.type === 'TransportError') {
        // Don't reject on timeout/transport errors - let reconnection handle it
        warn('Connection timeout/transport error. Will retry...');
      } else {
        // For other errors, log but don't reject immediately
        warn('Connection error, will retry:', err?.message || err);
      }
    };

    if (socket.connected) {
      onConnect();
      return;
    }

    socket.on('connect', onConnect);
    socket.on('connect_error', onConnectError);
  });

  return connectionPromise;
};

/**
 * Resubscribe to all events after reconnection
 */
const resubscribeEvents = () => {
  // Re-join presence pool if was waiting
  if (shouldBeInPresencePool) {
    socket.emit('presence:join');
  }

  // Re-join chat rooms
  messageSequenceNumbers.forEach((_, chatId) => {
    // Chat rooms are auto-managed by Socket.IO rooms
    // Just need to ensure we're connected
  });
};

/**
 * Disconnect socket intentionally
 */
export const disconnectSocket = () => {
  isIntentionalDisconnect = true;
  reconnectAttempts = MAX_RECONNECT_ATTEMPTS;
  shouldBeInPresencePool = false;

  // Remove all event listeners
  eventHandlers.forEach((handlers, event) => {
    handlers.forEach(handler => {
      socket?.off(event, handler);
    });
  });
  eventHandlers.clear();

  // Disconnect socket
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  // Clear state
  connectionPromise = null;
  currentSessionToken = null;
  currentGuestId = null;
  messageSequenceNumbers.clear();
  pendingMessages.clear();
  messageBuffer.clear();
};

/**
 * Get socket instance
 */
export const getSocket = () => socket;

/**
 * Check if socket is connected
 */
export const isConnected = () => socket?.connected || false;

/**
 * Get connection status
 */
export const getConnectionStatus = () => ({
  connected: isConnected(),
  reconnecting: reconnectAttempts > 0 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS,
  reconnectAttempts,
  maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS,
  state: socket?.connected ? 'connected' : 'disconnected'
});

/**
 * Join presence pool for matching
 */
export const joinPresencePool = () => {
  if (!socket || !socket.connected) {
    warn('Cannot join presence pool: not connected');
    return;
  }

  shouldBeInPresencePool = true;
  socket.emit('presence:join');
  log('Joined presence pool');
};

/**
 * Leave presence pool
 */
export const leavePresencePool = () => {
  if (!socket || !socket.connected) {
    warn('Cannot leave presence pool: not connected');
    return;
  }

  shouldBeInPresencePool = false;
  socket.emit('presence:leave');
  log('Left presence pool');
};

/**
 * Subscribe to match found event
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
export const onMatchFound = (callback) => {
  if (!socket) return () => {};

  const handler = (data) => {
    log('Match found:', data);
    callback(data);
  };

  socket.on('match:found', handler);

  // Store handler for resubscription
  if (!eventHandlers.has('match:found')) {
    eventHandlers.set('match:found', []);
  }
  eventHandlers.get('match:found').push(handler);

  return () => {
    socket.off('match:found', handler);
    const handlers = eventHandlers.get('match:found') || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  };
};

/**
 * Subscribe to message event
 * @param {string} chatId - Chat ID
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
export const onMessage = (chatId, callback) => {
  if (!socket) return () => {};

  const handler = (data) => {
    log('Message received:', data);

    // Handle message ordering
    const lastSequence = messageSequenceNumbers.get(chatId) || 0;
    const currentSequence = data.sequence_number || 0;

    if (currentSequence === lastSequence + 1) {
      // In-order message
      messageSequenceNumbers.set(chatId, currentSequence);
      callback(data);

      // Process any buffered messages
      processBufferedMessages(chatId, callback);
    } else if (currentSequence > lastSequence + 1) {
      // Out-of-order message - buffer it
      log(`Buffering out-of-order message (expected ${lastSequence + 1}, got ${currentSequence})`);
      bufferMessage(chatId, data, callback);
    } else {
      // Duplicate or old message - ignore
      log(`Ignoring duplicate/old message (expected ${lastSequence + 1}, got ${currentSequence})`);
    }
  };

  socket.on('message', handler);

  // Store handler for resubscription
  const key = `message:${chatId}`;
  if (!eventHandlers.has(key)) {
    eventHandlers.set(key, []);
  }
  eventHandlers.get(key).push(handler);

  return () => {
    socket.off('message', handler);
    const handlers = eventHandlers.get(key) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  };
};

/**
 * Buffer out-of-order message
 */
const bufferMessage = (chatId, message, callback) => {
  if (!messageBuffer.has(chatId)) {
    messageBuffer.set(chatId, []);
  }

  const buffer = messageBuffer.get(chatId);
  buffer.push(message);
  messageBuffer.set(chatId, buffer);
};

/**
 * Process buffered messages in order
 */
const processBufferedMessages = (chatId, callback) => {
  const buffer = messageBuffer.get(chatId) || [];
  if (buffer.length === 0) return;

  const lastSequence = messageSequenceNumbers.get(chatId) || 0;

  // Find next expected message
  const nextMessage = buffer.find(msg => msg.sequence_number === lastSequence + 1);

  if (nextMessage) {
    // Remove from buffer
    const index = buffer.indexOf(nextMessage);
    buffer.splice(index, 1);
    messageBuffer.set(chatId, buffer);

    // Process message
    messageSequenceNumbers.set(chatId, nextMessage.sequence_number);
    callback(nextMessage);

    // Recursively process more
    processBufferedMessages(chatId, callback);
  }
};

/**
 * Send message with acknowledgment
 * @param {string} chatId - Chat ID
 * @param {string} content - Message content
 * @returns {Promise<Object>} Response from server
 */
export const sendMessage = async (chatId, content) => {
  if (!socket || !socket.connected) {
    throw new Error('Socket not connected');
  }

  return new Promise((resolve, reject) => {
    socket.emit('message:send', { chatId, content }, (response) => {
      if (response.success) {
        resolve(response.message);
      } else {
        reject(new Error(response.error || 'Failed to send message'));
      }
    });
  });
};

/**
 * Send typing indicator
 * @param {string} chatId - Chat ID
 * @param {boolean} isTyping - Whether user is typing
 */
export const sendTyping = (chatId, isTyping) => {
  if (!socket || !socket.connected) {
    warn('Cannot send typing indicator: not connected');
    return;
  }

  const event = isTyping ? 'typing:start' : 'typing:stop';
  socket.emit(event, { chatId });
};

/**
 * Subscribe to typing indicator
 * @param {string} chatId - Chat ID
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
export const onTyping = (chatId, callback) => {
  if (!socket) return () => {};

  const handler = (data) => {
    log('Typing indicator:', data);
    callback(data);
  };

  socket.on('typing', handler);

  // Store handler for resubscription
  const key = `typing:${chatId}`;
  if (!eventHandlers.has(key)) {
    eventHandlers.set(key, []);
  }
  eventHandlers.get(key).push(handler);

  return () => {
    socket.off('typing', handler);
    const handlers = eventHandlers.get(key) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  };
};

/**
 * Subscribe to chat ended event
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
export const onChatEnded = (callback) => {
  if (!socket) return () => {};

  const handler = (data) => {
    log('Chat ended:', data);
    callback(data);

    // Clean up state for this chat
    if (data.chat_id) {
      messageSequenceNumbers.delete(data.chat_id);
      pendingMessages.delete(data.chat_id);
      messageBuffer.delete(data.chat_id);
    }
  };

  socket.on('chat:ended', handler);

  // Store handler for resubscription
  if (!eventHandlers.has('chat:ended')) {
    eventHandlers.set('chat:ended', []);
  }
  eventHandlers.get('chat:ended').push(handler);

  return () => {
    socket.off('chat:ended', handler);
    const handlers = eventHandlers.get('chat:ended') || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  };
};

/**
 * End chat
 * @param {string} chatId - Chat ID
 * @returns {Promise<Object>} Response from server
 */
export const endChat = async (chatId) => {
  if (!socket || !socket.connected) {
    throw new Error('Socket not connected');
  }

  return new Promise((resolve, reject) => {
    socket.emit('chat:end', { chatId }, (response) => {
      if (response.success) {
        // Clean up state
        messageSequenceNumbers.delete(chatId);
        pendingMessages.delete(chatId);
        messageBuffer.delete(chatId);
        resolve();
      } else {
        reject(new Error(response.error || 'Failed to end chat'));
      }
    });
  });
};
