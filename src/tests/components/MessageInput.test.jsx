import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import MessageInput from "../../components/chat/MessageInput";
import { useChat } from "../../contexts/ChatContext";
import { sendTyping } from "../../lib/socketClient";

vi.mock("../../contexts/ChatContext", () => ({ useChat: vi.fn() }));
vi.mock("../../lib/socketClient", () => ({ sendTyping: vi.fn() }));

let sendMessage;

beforeEach(() => {
  vi.useFakeTimers();
  sendMessage = vi.fn().mockResolvedValue(undefined);
  useChat.mockReturnValue({ sendMessage, status: "matched", chatId: 7 });
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("MessageInput", () => {
  it("keeps the draft when the user pauses typing", () => {
    render(<MessageInput />);
    const input = screen.getByLabelText("Message");

    fireEvent.change(input, { target: { value: "half a thought" } });
    act(() => vi.advanceTimersByTime(10000));

    expect(input).toHaveValue("half a thought");
  });

  it("sends typing start, then stop after the user goes idle", () => {
    render(<MessageInput />);
    const input = screen.getByLabelText("Message");

    fireEvent.change(input, { target: { value: "h" } });
    fireEvent.change(input, { target: { value: "hi" } });
    expect(sendTyping).toHaveBeenCalledTimes(1);
    expect(sendTyping).toHaveBeenLastCalledWith(7, true);

    act(() => vi.advanceTimersByTime(2500));
    expect(sendTyping).toHaveBeenLastCalledWith(7, false);
  });

  it("sends the message and clears the input", async () => {
    render(<MessageInput />);
    const input = screen.getByLabelText("Message");

    fireEvent.change(input, { target: { value: "hello" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send" }));
    });

    expect(sendMessage).toHaveBeenCalledWith("hello");
    expect(input).toHaveValue("");
  });

  it("is disabled until matched", () => {
    useChat.mockReturnValue({ sendMessage, status: "waiting", chatId: null });
    render(<MessageInput />);

    expect(screen.getByLabelText("Message")).toBeDisabled();
  });
});
