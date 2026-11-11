import { useEffect, useRef, useState } from "react";
import { useChat } from "../../contexts/ChatContext";
import { sendTyping } from "../../lib/socketClient";
import { Send } from "lucide-react";
import toast from "react-hot-toast";

// Send "stopped typing" after this long without a keystroke
const TYPING_IDLE_MS = 2000;

const MessageInput = () => {
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { sendMessage, status, chatId } = useChat();
  const typingTimerRef = useRef(null);
  const isTypingRef = useRef(false);

  const canSend = status === "matched";

  const stopTyping = () => {
    clearTimeout(typingTimerRef.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      sendTyping(chatId, false);
    }
  };

  // Stop the indicator when leaving the chat
  useEffect(() => () => {
    clearTimeout(typingTimerRef.current);
    if (isTypingRef.current) sendTyping(chatId, false);
    isTypingRef.current = false;
  }, [chatId]);

  const handleChange = (e) => {
    setText(e.target.value);
    if (!canSend) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      sendTyping(chatId, true);
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(stopTyping, TYPING_IDLE_MS);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || isSending || !canSend) return;

    setIsSending(true);
    stopTyping();
    try {
      await sendMessage(text);
      setText("");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSending(false);
    }
  };

  const placeholder = canSend ? "Type a message" : status === "ended" ? "This chat has ended" : "Waiting for a match";

  return (
    <div className="border-t-2 border-line bg-paper pb-[env(safe-area-inset-bottom)]">
      <form onSubmit={handleSubmit} className="mx-auto max-w-[920px] px-3 pb-2 pt-3 chat:px-6 chat:pb-3">
        <div className="flex items-center gap-2.5">
          <label htmlFor="message-input" className="sr-only">
            Message
          </label>
          <input
            id="message-input"
            type="text"
            className="h-[52px] min-w-0 flex-1 rounded-full border-2 border-line bg-mist px-5 text-[17px] text-ink placeholder:text-muted-2 focus:border-ink disabled:cursor-not-allowed disabled:opacity-60"
            placeholder={placeholder}
            value={text}
            onChange={handleChange}
            maxLength={1000}
            disabled={!canSend}
            autoComplete="off"
            enterKeyHint="send"
          />
          <button
            type="submit"
            className="inline-flex size-[52px] shrink-0 items-center justify-center rounded-full bg-ink transition-colors hover:bg-ink-hover disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!text.trim() || isSending || !canSend}
            aria-label="Send"
          >
            <Send size={21} strokeWidth={2.5} className="text-pili" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-1.5 flex min-h-[18px] justify-between gap-3 px-2 text-xs text-muted-2">
          <span className="hidden chat:inline">{canSend ? "Press Enter to send" : ""}</span>
          {text.length > 800 && <span className="ml-auto">{text.length}/1000</span>}
        </div>
      </form>
    </div>
  );
};

export default MessageInput;
