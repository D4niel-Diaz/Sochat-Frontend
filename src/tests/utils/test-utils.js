import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-hot-toast';
import { GuestProvider } from '../../contexts/GuestContext';
import { ChatProvider } from '../../contexts/ChatContext';
import { AdminProvider } from '../../contexts/AdminContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

export function renderWithProviders(ui, options = {}) {
  const Wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <GuestProvider>
          <ChatProvider>
            <AdminProvider>
              {children}
              <ToastContainer position="top-right" />
            </AdminProvider>
          </ChatProvider>
        </GuestProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );

  return render(ui, { wrapper: Wrapper, ...options });
}

export function waitForLoadingToFinish() {
  return waitFor(
    () => {
      const loaders = screen.queryAllByTestId(/loading/i);
      if (loaders.length > 0) {
        throw new Error('Loading indicators still present');
      }
    },
    { timeout: 5000 }
  );
}

export function createMockGuest(overrides = {}) {
  return {
    guest_id: 'test-guest-id',
    session_token: 'test-session-token',
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    ...overrides,
  };
}

export function createMockChat(overrides = {}) {
  return {
    chat_id: 1,
    guest_id_1: 'guest-1',
    guest_id_2: 'guest-2',
    status: 'active',
    started_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockMessage(overrides = {}) {
  return {
    message_id: 1,
    chat_id: 1,
    sender_guest_id: 'guest-1',
    content: 'Hello',
    created_at: new Date().toISOString(),
    is_flagged: false,
    ...overrides,
  };
}

export function mockApiCall(data, delay = 100) {
  return new Promise((resolve) => setTimeout(() => resolve({ data }), delay));
}

export function mockApiError(message = 'API Error', status = 500) {
  return Promise.reject({
    response: {
      status,
      data: {
        success: false,
        message,
      },
    },
  });
}
