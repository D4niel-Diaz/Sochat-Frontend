import { useState, useEffect } from "react";
import { useChat } from "../../contexts/ChatContext";
import { Send, AlertCircle, MoreHorizontal } from "lucide-react";
import toast from "react-hot-toast";

const MessageInput = () => {
  const [text, setText] = useState("");
  const { sendMessage, isLoading, status, isPartnerTyping } = useChat();
  const [typingTimeout, setTypingTimeout] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!text.trim() || isLoading || (status !== "matched" && status !== "active")) return;

    try {
      await sendMessage(text.trim());
      setText("");
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleTyping = () => {
    if (typingTimeout) clearTimeout(typingTimeout);
    
    const newTimeout = setTimeout(() => {
      setText("");
    }, 3000);
    
    setTypingTimeout(newTimeout);
  };

  useEffect(() => {
    return () => {
      if (typingTimeout) clearTimeout(typingTimeout);
    };
  }, [typingTimeout]);

  const canSend = status === "matched" || status === "active";

  return (
    <div className="bg-base-100 p-4 border-t border-base-300">
      {isPartnerTyping && (
        <div className="flex items-center gap-2 text-sm text-base-content/60 mb-2">
          <MoreHorizontal className="size-4 animate-pulse" />
          <span>Partner is typing...</span>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            className="input input-bordered w-full pr-12"
            placeholder={canSend ? "Type your message..." : "Waiting for a match..."}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              handleTyping();
            }}
            maxLength={1000}
            disabled={!canSend || isLoading}
          />
          {text.length > 800 && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-warning">
              <AlertCircle size={14} />
              <span>{text.length}/1000</span>
            </div>
          )}
        </div>
        <button
          type="submit"
          className="btn btn-primary btn-circle"
          disabled={!text.trim() || isLoading || !canSend}
          aria-label="Send message"
        >
          <Send size={20} />
        </button>
      </form>
      <p className="text-xs text-base-content/40 mt-2 text-center">
        {canSend 
          ? "Be respectful. Inappropriate messages will be flagged."
          : "Please wait while we find you a match..."
        }
      </p>
    </div>
  );
};

export default MessageInput;
