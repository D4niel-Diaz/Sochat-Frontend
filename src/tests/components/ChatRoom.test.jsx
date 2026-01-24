import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatRoom } from '../../components/chat/ChatRoom';
import { renderWithProviders, createMockGuest, createMockChat, createMockMessage, mockApiCall, mockApiError } from '../utils/test-utils';

describe('ChatRoom', () => {
  const mockGuest = createMockGuest();
  const mockChat = createMockChat();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows waiting state when status is waiting', () => {
    renderWithProviders(
      <ChatRoom />,
      {
        initialChatState: {
          status: 'waiting',
          chatId: null,
          partnerId: null,
          messages: [],
          isLoading: false,
        },
      }
    );

    expect(screen.getByText(/Finding a Match/i)).toBeInTheDocument();
  });

  it('shows chat interface when matched', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <ChatRoom />,
      {
        initialChatState: {
          status: 'matched',
          chatId: mockChat.chat_id,
          partnerId: mockChat.guest_id_2,
          messages: [],
          isLoading: false,
        },
      }
    );

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  it('sends message when user submits form', async () => {
    const user = userEvent.setup();
    const mockMessage = createMockMessage();

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: mockMessage,
      }),
    });

    renderWithProviders(
      <ChatRoom />,
      {
        initialChatState: {
          status: 'matched',
          chatId: mockChat.chat_id,
          partnerId: mockChat.guest_id_2,
          messages: [],
          isLoading: false,
        },
        initialGuestState: {
          guestId: mockGuest.guest_id,
          sessionToken: mockGuest.session_token,
          expiresAt: mockGuest.expires_at,
          isBanned: false,
        },
      }
    );

    const input = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: /send/i });

    await user.type(input, 'Hello world');
    await user.click(sendButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/chat/message'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockGuest.session_token}`,
          }),
        })
      );
    });
  });

  it('displays messages when received', async () => {
    renderWithProviders(
      <ChatRoom />,
      {
        initialChatState: {
          status: 'matched',
          chatId: mockChat.chat_id,
          partnerId: mockChat.guest_id_2,
          messages: [
            createMockMessage({ content: 'Hello from partner', sender: 'partner' }),
          ],
          isLoading: false,
        },
      }
    );

    await waitFor(() => {
      expect(screen.getByText('Hello from partner')).toBeInTheDocument();
    });
  });

  it('shows typing indicator when partner is typing', async () => {
    renderWithProviders(
      <ChatRoom />,
      {
        initialChatState: {
          status: 'matched',
          chatId: mockChat.chat_id,
          partnerId: mockChat.guest_id_2,
          messages: [],
          isLoading: false,
          isPartnerTyping: true,
        },
      }
    );

    await waitFor(() => {
      expect(screen.getByText(/partner is typing/i)).toBeInTheDocument();
    });
  });

  it('clears typing indicator after timeout', async () => {
    renderWithProviders(
      <ChatRoom />,
      {
        initialChatState: {
          status: 'matched',
          chatId: mockChat.chat_id,
          partnerId: mockChat.guest_id_2,
          messages: [],
          isLoading: false,
          isPartnerTyping: true,
        },
      }
    );

    await waitFor(
      () => {
        expect(screen.queryByText(/partner is typing/i)).not.toBeInTheDocument();
      },
      { timeout: 3500 }
    );
  });

  it('shows error message when API fails', async () => {
    const user = userEvent.setup();

    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    renderWithProviders(
      <ChatRoom />,
      {
        initialChatState: {
          status: 'matched',
          chatId: mockChat.chat_id,
          partnerId: mockChat.guest_id_2,
          messages: [],
          isLoading: false,
        },
        initialGuestState: {
          guestId: mockGuest.guest_id,
          sessionToken: mockGuest.session_token,
          expiresAt: mockGuest.expires_at,
          isBanned: false,
        },
      }
    );

    const input = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: /send/i });

    await user.type(input, 'Hello');
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('ends chat when user clicks end button', async () => {
    const user = userEvent.setup();

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        message: 'Chat ended',
      }),
    });

    renderWithProviders(
      <ChatRoom />,
      {
        initialChatState: {
          status: 'matched',
          chatId: mockChat.chat_id,
          partnerId: mockChat.guest_id_2,
          messages: [],
          isLoading: false,
        },
        initialGuestState: {
          guestId: mockGuest.guest_id,
          sessionToken: mockGuest.session_token,
          expiresAt: mockGuest.expires_at,
          isBanned: false,
        },
      }
    );

    const endButton = screen.getByRole('button', { name: /end chat/i });

    await user.click(endButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/chat/end'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });
});
