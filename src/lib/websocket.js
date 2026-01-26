import Pusher from 'pusher-js';
import { log, error, warn } from '../utils/logger';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";
const REVERB_PORT = Number(import.meta.env.VITE_REVERB_PORT || 443);
const REVERB_APP_KEY = import.meta.env.VITE_REVERB_APP_KEY || 'reverb-app-key';

const getApiUrl = () => {
  try {
    return new URL(API_BASE_URL, window.location.origin);
  } catch {
    return new URL('/api/v1', window.location.origin);
  }
};

const getWsOrigin = () => {
  const configured = import.meta.env.VITE_WS_ORIGIN;
  if (configured) {
    try {
      return new URL(configured);
    } catch {
      return new URL(window.location.origin);
    }
  }
  // Use API base URL hostname for WebSocket
  const apiUrl = getApiUrl();
  return new URL(`http://${apiUrl.hostname}`);
};

let pusher = null;
let connectionPromise = null;
let reconnectAttempts = 0;
let maxReconnectAttempts = 10;
let reconnectDelay = 1000;
let isIntentionalDisconnect = false;
let currentSessionToken = null;
let currentGuestId = null;
let subscriptions = new Map();

export const connectWebSocket = (sessionToken, guestId) => {
  if (connectionPromise && pusher?.connection.state === 'connected') {
    return connectionPromise;
  }

  currentSessionToken = sessionToken;
  currentGuestId = guestId;
  isIntentionalDisconnect = false;
  reconnectAttempts = 0;
  reconnectDelay = 1000;

  connectionPromise = new Promise((resolve, reject) => {
    try {
      const wsOrigin = getWsOrigin();
      const apiUrl = getApiUrl();

      pusher = new Pusher(REVERB_APP_KEY, {
        wsHost: wsOrigin.hostname,
        wsPort: REVERB_PORT,
        wssPort: REVERB_PORT,
        forceTLS: wsOrigin.protocol === 'https:',
        enabledTransports: ['ws', 'wss'],
        disableStats: true,
        cluster: 'mt1',
        authEndpoint: `${apiUrl.origin}${apiUrl.pathname.replace(/\/+$/, '')}/broadcasting/auth`,
        auth: {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        },
      });

      pusher.connection.bind('connected', () => {
        if (isIntentionalDisconnect) {
          pusher.disconnect();
          return;
        }
        reconnectAttempts = 0;
        reconnectDelay = 1000;
        resolve(pusher);
      });

      pusher.connection.bind('error', (error) => {
        if (isIntentionalDisconnect) {
          return;
        }
        error("Pusher connection error:", error);
        handleReconnection(reject, error);
      });

      pusher.connection.bind('disconnected', () => {
        if (!isIntentionalDisconnect) {
          handleReconnection();
        }
      });

      pusher.connection.bind('state_change', (states) => {
        // State changes are logged by Pusher internally, no need to log here
      });

    } catch (error) {
      error("Failed to initialize Pusher:", error);
      reject(error);
    }
  });

  return connectionPromise;
};

const handleReconnection = (reject = null, error = null) => {
  if (isIntentionalDisconnect) {
    log("Intentional disconnect, not reconnecting");
    return;
  }

  if (reconnectAttempts >= maxReconnectAttempts) {
    error("Max reconnection attempts reached");
    if (reject) reject(new Error("Max reconnection attempts reached"));
    return;
  }

  reconnectAttempts++;
  const delay = Math.min(reconnectDelay * Math.pow(2, reconnectAttempts - 1), 30000);

  log(`Reconnection attempt ${reconnectAttempts}/${maxReconnectAttempts} in ${delay}ms`);

  setTimeout(() => {
    if (!currentSessionToken || !currentGuestId) {
      error("Missing credentials for reconnection");
      return;
    }

    connectionPromise = null;
    connectWebSocket(currentSessionToken, currentGuestId).catch((err) => {
      error("Reconnection failed:", err);
    });
  }, delay);
};

export const disconnectWebSocket = () => {
  isIntentionalDisconnect = true;
  reconnectAttempts = maxReconnectAttempts;

  if (subscriptions && subscriptions.size > 0) {
    subscriptions.forEach((callback, channelName) => {
      try {
        const channel = pusher?.channel(channelName);
        if (channel) {
          channel.unbind_all();
          if (pusher) {
            pusher.unsubscribe(channelName);
          }
        }
      } catch (error) {
        error("Error unsubscribing from channel:", channelName, error);
      }
    });
    subscriptions.clear();
  }

  if (pusher) {
    try {
      pusher.disconnect();
    } catch (error) {
      error("Error disconnecting Pusher:", error);
    }
    pusher = null;
  }

  connectionPromise = null;
  currentSessionToken = null;
  currentGuestId = null;
};

export const getSocket = () => {
  return pusher;
};

export const isConnected = () => {
  return pusher?.connection.state === 'connected';
};

export const getConnectionStatus = () => {
  return {
    connected: isConnected(),
    reconnecting: reconnectAttempts > 0 && reconnectAttempts < maxReconnectAttempts,
    reconnectAttempts,
    maxReconnectAttempts,
    state: pusher?.connection.state || 'disconnected',
  };
};

export const subscribeToMatch = (callback) => {
  if (!pusher) {
    warn("Pusher not connected, cannot subscribe to match");
    return () => {};
  }

  const channelName = `private-guest.${currentGuestId}`;
  let channel = null;

  try {
    channel = pusher.subscribe(channelName);
  } catch (error) {
    error("Failed to subscribe to match channel:", error);
    return () => {};
  }

  const handler = (data) => {
    log("Match received:", data);
    callback(data);
  };

  channel.bind('App\\Events\\UserMatched', handler);
  subscriptions.set(channelName, handler);

  return () => {
    try {
      channel.unbind('App\\Events\\UserMatched', handler);
      if (pusher && pusher.channel(channelName)) {
        pusher.unsubscribe(channelName);
      }
      subscriptions.delete(channelName);
    } catch (error) {
      error("Error during match subscription cleanup:", error);
    }
  };
};

export const subscribeToMessage = (chatId, callback) => {
  if (!pusher) {
    warn("Pusher not connected, cannot subscribe to messages");
    return () => {};
  }

  const channelName = `private-chat.${chatId}`;
  let channel = null;

  try {
    channel = pusher.subscribe(channelName);
  } catch (error) {
    error("Failed to subscribe to message channel:", error);
    return () => {};
  }

  const handler = (data) => {
    log("Message received:", data);
    callback(data);
  };

  channel.bind('App\\Events\\MessageSent', handler);
  subscriptions.set(channelName, handler);

  return () => {
    try {
      channel.unbind('App\\Events\\MessageSent', handler);
      if (pusher && pusher.channel(channelName)) {
        pusher.unsubscribe(channelName);
      }
      subscriptions.delete(channelName);
    } catch (error) {
      error("Error during message subscription cleanup:", error);
    }
  };
};

export const subscribeToTyping = (chatId, callback) => {
  if (!pusher) {
    warn("Pusher not connected, cannot subscribe to typing");
    return () => {};
  }

  const channelName = `private-chat.${chatId}`;
  let channel = null;

  try {
    channel = pusher.subscribe(channelName);
  } catch (error) {
    error("Failed to subscribe to typing channel:", error);
    return () => {};
  }

  const handler = (data) => {
    log("Typing indicator received:", data);
    callback(data);
  };

  channel.bind('App\\Events\\UserTyping', handler);
  subscriptions.set(`${channelName}-typing`, handler);

  return () => {
    try {
      channel.unbind('App\\Events\\UserTyping', handler);
      if (pusher && pusher.channel(channelName)) {
        pusher.unsubscribe(channelName);
      }
      subscriptions.delete(`${channelName}-typing`);
    } catch (error) {
      error("Error during typing subscription cleanup:", error);
    }
  };
};

export const subscribeToChatEnded = (callback) => {
  if (!pusher) {
    warn("Pusher not connected, cannot subscribe to chat ended");
    return () => {};
  }

  const channelName = `private-guest.${currentGuestId}`;
  let channel = null;

  try {
    channel = pusher.subscribe(channelName);
  } catch (error) {
    error("Failed to subscribe to chat ended channel:", error);
    return () => {};
  }

  const handler = (data) => {
    log("Chat ended event received:", data);
    callback(data);
  };

  channel.bind('chat.ended', handler);
  subscriptions.set(`${channelName}-ended`, handler);

  return () => {
    try {
      channel.unbind('chat.ended', handler);
      if (pusher && pusher.channel(channelName)) {
        pusher.unsubscribe(channelName);
      }
      subscriptions.delete(`${channelName}-ended`);
    } catch (error) {
      error("Error during chat ended subscription cleanup:", error);
    }
  };
};

export const joinChatRoom = (chatId) => {
  if (!pusher) {
    warn("Pusher not connected");
    return;
  }

  const channelName = `private-chat.${chatId}`;
  const channel = pusher.subscribe(channelName);

  channel.bind('pusher:subscription_succeeded', () => {
    log(`Joined chat room: ${chatId}`);
  });

  channel.bind('pusher:subscription_error', (error) => {
    error(`Failed to join chat room ${chatId}:`, error);
  });
};

export const leaveChatRoom = (chatId) => {
  if (!pusher) {
    warn("Pusher not connected");
    return;
  }

  const channelName = `private-chat.${chatId}`;
  pusher.unsubscribe(channelName);
  log(`Left chat room: ${chatId}`);
};

export const sendTyping = (chatId, isTyping) => {
  // Typing is sent via API, not WebSocket
  // This is a placeholder for consistency
};
