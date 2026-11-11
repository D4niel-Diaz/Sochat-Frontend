import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ChatRoom from "../../components/chat/ChatRoom";
import { useChat } from "../../contexts/ChatContext";

vi.mock("../../contexts/ChatContext", () => ({ useChat: vi.fn() }));
vi.mock("../../contexts/GuestContext", () => ({
  useGuest: () => ({ sessionToken: "token", guestId: "me" }),
}));
vi.mock("../../lib/socketClient", () => ({ sendTyping: vi.fn() }));

const chatState = (overrides = {}) => ({
  status: "idle",
  chatId: null,
  messages: [],
  isLoading: false,
  isPartnerTyping: false,
  startChat: vi.fn().mockResolvedValue(undefined),
  cancelSearch: vi.fn(),
  endChat: vi.fn(),
  findNewMatch: vi.fn().mockResolvedValue(undefined),
  sendMessage: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const renderRoom = () =>
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ChatRoom />
    </MemoryRouter>
  );

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

describe("ChatRoom", () => {
  it("shows the waiting state and cancels the search", async () => {
    const state = chatState({ status: "waiting" });
    useChat.mockReturnValue(state);
    renderRoom();

    expect(screen.getByText(/Finding a Match/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /stop searching/i }));
    expect(state.cancelSearch).toHaveBeenCalled();
  });

  it("starts matching with default preferences, not the click event", async () => {
    const state = chatState({ status: "idle" });
    useChat.mockReturnValue(state);
    renderRoom();

    await userEvent.click(screen.getByRole("button", { name: /find a match/i }));
    expect(state.startChat).toHaveBeenCalledWith();
  });

  it("renders messages as typed, including quotes and ampersands", () => {
    useChat.mockReturnValue(chatState({
      status: "matched",
      chatId: 1,
      messages: [
        { message_id: 1, sender: "partner", content: "I'm here & ready", created_at: new Date().toISOString() },
        { message_id: 2, sender: "you", content: "hello", created_at: new Date().toISOString() },
      ],
    }));
    renderRoom();

    expect(screen.getByText("I'm here & ready")).toBeInTheDocument();
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("shows the partner typing indicator", () => {
    useChat.mockReturnValue(chatState({ status: "matched", chatId: 1, isPartnerTyping: true }));
    renderRoom();

    expect(screen.getByText(/Partner is typing/i)).toBeInTheDocument();
  });
});
