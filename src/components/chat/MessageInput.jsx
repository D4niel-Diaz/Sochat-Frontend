import { useEffect, useRef, useState } from "react";
import { useChat } from "../../contexts/ChatContext";
import { sendTyping } from "../../lib/socketClient";
import { Send, AlertCircle, MoreHorizontal } from "lucide-react";
import toast from "react-hot-toast";

// Send "stopped typing" after this long without a keystroke
const TYPING_IDLE_MS = 2000;

const MessageInput = () => {
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { sendMessage, status, chatId, isPartnerTyping } = useChat();
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

  return (
    <div className="bg-base-100 p-4 border-t border-base-300">
      {isPartnerTyping && (
        <div className="flex items-center gap-2 text-sm text-base-content/60 mb-2" aria-live="polite">
          <MoreHorizontal className="size-4 animate-pulse" aria-hidden="true" />
          <span>Partner is typing...</span>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            className="input input-bordered w-full pr-12"
            placeholder={canSend ? "Type your message..." : "Waiting for a match..."}
            aria-label="Message"
            value={text}
            onChange={handleChange}
            maxLength={1000}
            disabled={!canSend}
          />
          {text.length > 800 && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-warning">
              <AlertCircle size={14} aria-hidden="true" />
              <span>{text.length}/1000</span>
            </div>
          )}
        </div>
        <button
          type="submit"
          className="btn btn-primary btn-circle"
          disabled={!text.trim() || isSending || !canSend}
          aria-label="Send message"
        >
          <Send size={20} />
        </button>
      </form>
      <p className="text-xs text-base-content/40 mt-2 text-center">
        {canSend
          ? "Be respectful. Sharing emails or phone numbers is blocked."
          : "Please wait while we find you a match..."}
      </p>
    </div>
  );
};

export default MessageInput;
