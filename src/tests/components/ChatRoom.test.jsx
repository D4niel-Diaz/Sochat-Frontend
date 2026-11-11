import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ChatRoom from "../../components/chat/ChatRoom";
import { useChat } from "../../contexts/ChatContext";
import { DEFAULT_MATCH_PREFERENCES } from "../../api/services/presenceService";

vi.mock("../../contexts/ChatContext", () => ({ useChat: vi.fn() }));
vi.mock("../../contexts/GuestContext", () => ({
  useGuest: () => ({ sessionToken: null, guestId: "me" }),
}));
vi.mock("../../lib/socketClient", () => ({ sendTyping: vi.fn() }));

const chatState = (overrides = {}) => ({
  status: "idle",
  chatId: null,
  messages: [],
  isLoading: false,
  isPartnerTyping: false,
  startChat: vi.fn().mockResolvedValue(undefined),
  cancelSearch: vi.fn().mockResolvedValue(undefined),
  endChat: vi.fn(),
  returnToLobby: vi.fn(),
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
  sessionStorage.clear();
});

describe("ChatRoom", () => {
  it("shows the waiting state and cancels the search", async () => {
    const state = chatState({ status: "waiting" });
    useChat.mockReturnValue(state);
    renderRoom();

    expect(screen.getByRole("heading", { name: /looking for someone to talk to/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /stop looking/i }));
    expect(state.cancelSearch).toHaveBeenCalled();
  });

  it("starts matching with the stored topic, not the click event", async () => {
    sessionStorage.setItem("sorsuTalk:topic", JSON.stringify("Music"));
    const state = chatState({ status: "idle" });
    useChat.mockReturnValue(state);
    renderRoom();

    await userEvent.click(screen.getByRole("button", { name: /start a chat/i }));
    expect(state.startChat).toHaveBeenCalledWith({ ...DEFAULT_MATCH_PREFERENCES, subject: "Music" });
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

    expect(screen.getByRole("img", { name: /is typing/i })).toBeInTheDocument();
    expect(screen.getByText("typing…")).toBeInTheDocument();
  });

  it("keeps the chat on screen when the other person leaves", async () => {
    const matched = chatState({
      status: "matched",
      chatId: 5,
      messages: [{ message_id: 1, sender: "partner", content: "bye", created_at: new Date().toISOString() }],
    });
    useChat.mockReturnValue(matched);
    const { rerender } = renderRoom();

    const ended = { ...matched, status: "ended", chatId: null, messages: [] };
    useChat.mockReturnValue(ended);
    rerender(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ChatRoom />
      </MemoryRouter>
    );

    expect(screen.getByText(/left the chat\.$/)).toBeInTheDocument();
    expect(screen.getByText("bye")).toBeInTheDocument();
    expect(screen.getByLabelText("Message")).toHaveAttribute("placeholder", "This chat has ended");

    await userEvent.click(screen.getByRole("button", { name: /find someone new/i }));
    expect(ended.startChat).toHaveBeenCalled();
  });
});
