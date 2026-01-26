import Pusher from 'pusher-js';
import { log, error, warn } from '../utils/logger';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";
const REVERB_APP_KEY = import.meta.env.VITE_REVERB_APP_KEY || 'reverb-app-key';
const REVERB_CLUSTER = import.meta.env.VITE_REVERB_CLUSTER || 'mt1'; // Add your cluster if using Pusher
let pusher = null;
let connectionPromise = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 10;
const reconnectDelay = 1000;
let isIntentionalDisconnect = false;
let currentSessionToken = null;
let currentGuestId = null;
let subscriptions = new Map();

/**
 * Initialize Pusher and connect to the WebSocket server
 */
export const connectWebSocket = (sessionToken, guestId) => {
  currentSessionToken = sessionToken;
  currentGuestId = guestId;

  if (pusher) return Promise.resolve(pusher);

  connectionPromise = new Promise((resolve, reject) => {
    pusher = new Pusher(REVERB_APP_KEY, {
      cluster: REVERB_CLUSTER,
      forceTLS: true,
      authEndpoint: `${API_BASE_URL}/broadcasting/auth`, // Laravel private channel auth
      auth: {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      },
    });

    pusher.connection.bind('connected', () => {
      reconnectAttempts = 0;
      log('WebSocket connected');
      resolve(pusher);
    });

    pusher.connection.bind('error', (err) => {
      error('Pusher connection error:', err);
      if (err.error && err.error.data?.code === 4004) {
        // Authentication failure
        reject(new Error('WebSocket auth failed. Check session token.'));
      } else if (reconnectAttempts < maxReconnectAttempts) {
        handleReconnection();
      } else {
        reject(err);
      }
    });

    pusher.connection.bind('disconnected', () => {
      log('WebSocket disconnected');
      if (!isIntentionalDisconnect) handleReconnection();
    });
  });

  return connectionPromise;
};

/**
 * Handle automatic reconnection with exponential backoff
 */
const handleReconnection = () => {
  if (isIntentionalDisconnect) return;

  reconnectAttempts++;
  if (reconnectAttempts > maxReconnectAttempts) {
    error('Max reconnection attempts reached');
    return;
  }

  const delay = Math.min(reconnectDelay * Math.pow(2, reconnectAttempts - 1), 30000);
  log(`Reconnection attempt ${reconnectAttempts}/${maxReconnectAttempts} in ${delay}ms`);

  setTimeout(() => {
    if (!currentSessionToken || !currentGuestId) {
      error('Missing credentials for reconnection');
      return;
    }
    connectionPromise = null;
    connectWebSocket(currentSessionToken, currentGuestId).catch((err) => {
      error('Reconnection failed:', err);
    });
  }, delay);
};

/**
 * Disconnect WebSocket intentionally
 */
export const disconnectWebSocket = () => {
  isIntentionalDisconnect = true;
  reconnectAttempts = maxReconnectAttempts;

  subscriptions.forEach((callback, channelName) => {
    try {
      const channel = pusher?.channel(channelName);
      if (channel) {
        channel.unbind_all();
        if (pusher) pusher.unsubscribe(channelName);
      }
    } catch (err) {
      error('Error unsubscribing from channel:', channelName, err);
    }
  });
  subscriptions.clear();

  if (pusher) {
    try {
      pusher.disconnect();
    } catch (err) {
      error('Error disconnecting Pusher:', err);
    }
    pusher = null;
  }

  connectionPromise = null;
  currentSessionToken = null;
  currentGuestId = null;
};

/**
 * Utility functions
 */
export const getSocket = () => pusher;
export const isConnected = () => pusher?.connection.state === 'connected';
export const getConnectionStatus = () => ({
  connected: isConnected(),
  reconnecting: reconnectAttempts > 0 && reconnectAttempts < maxReconnectAttempts,
  reconnectAttempts,
  maxReconnectAttempts,
  state: pusher?.connection.state || 'disconnected',
});

/**
 * Subscribe to a private guest match channel
 */
export const subscribeToMatch = (callback) => {
  if (!pusher) {
    warn('Pusher not connected, cannot subscribe to match');
    return () => {};
  }

  const channelName = `private-guest.${currentGuestId}`;
  let channel = pusher.subscribe(channelName);

  const handler = (data) => {
    log('Match received:', data);
    callback(data);
  };

  channel.bind('App\\Events\\UserMatched', handler);
  subscriptions.set(channelName, handler);

  return () => {
    channel.unbind('App\\Events\\UserMatched', handler);
    if (pusher.channel(channelName)) pusher.unsubscribe(channelName);
    subscriptions.delete(channelName);
  };
};

/**
 * Subscribe to a private chat messages
 */
export const subscribeToMessage = (chatId, callback) => {
  if (!pusher) return () => {};

  const channelName = `private-chat.${chatId}`;
  let channel = pusher.subscribe(channelName);

  const handler = (data) => {
    log('Message received:', data);
    callback(data);
  };

  channel.bind('App\\Events\\MessageSent', handler);
  subscriptions.set(channelName, handler);

  return () => {
    channel.unbind('App\\Events\\MessageSent', handler);
    if (pusher.channel(channelName)) pusher.unsubscribe(channelName);
    subscriptions.delete(channelName);
  };
};

/**
 * Subscribe to typing indicator
 */
export const subscribeToTyping = (chatId, callback) => {
  if (!pusher) return () => {};

  const channelName = `private-chat.${chatId}`;
  let channel = pusher.subscribe(channelName);

  const handler = (data) => {
    log('Typing indicator received:', data);
    callback(data);
  };

  channel.bind('App\\Events\\UserTyping', handler);
  subscriptions.set(`${channelName}-typing`, handler);

  return () => {
    channel.unbind('App\\Events\\UserTyping', handler);
    if (pusher.channel(channelName)) pusher.unsubscribe(channelName);
    subscriptions.delete(`${channelName}-typing`);
  };
};

/**
 * Subscribe to chat ended
 */
export const subscribeToChatEnded = (callback) => {
  if (!pusher) return () => {};

  const channelName = `private-guest.${currentGuestId}`;
  let channel = pusher.subscribe(channelName);

  const handler = (data) => {
    log('Chat ended event received:', data);
    callback(data);
  };

  channel.bind('chat.ended', handler);
  subscriptions.set(`${channelName}-ended`, handler);

  return () => {
    channel.unbind('chat.ended', handler);
    if (pusher.channel(channelName)) pusher.unsubscribe(channelName);
    subscriptions.delete(`${channelName}-ended`);
  };
};

/**
 * Chat room helpers
 */
export const joinChatRoom = (chatId) => {
  if (!pusher) return;

  const channelName = `private-chat.${chatId}`;
  const channel = pusher.subscribe(channelName);

  channel.bind('pusher:subscription_succeeded', () => {
    log(`Joined chat room: ${chatId}`);
  });

  channel.bind('pusher:subscription_error', (err) => {
    error(`Failed to join chat room ${chatId}:`, err);
  });
};

export const leaveChatRoom = (chatId) => {
  if (!pusher) return;
  pusher.unsubscribe(`private-chat.${chatId}`);
  log(`Left chat room: ${chatId}`);
};

export const sendTyping = (chatId, isTyping) => {
  // Placeholder: typing is sent via API
};