import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useChat } from "../../contexts/ChatContext";
import { useGuest } from "../../contexts/GuestContext";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import ChatControls from "./ChatControls";
import { Loader2, Users, X, UserCheck } from "lucide-react";

const ChatRoom = () => {
  const { status, messages, isLoading, startChat, endChat, cancelSearch } = useChat();
  const { guestId } = useGuest();
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const noMatchTimeoutRef = useRef(null);
  const [showNoMatchMessage, setShowNoMatchMessage] = useState(false);

  useEffect(() => {
    if (messagesEndRef.current && messages.length > 0) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Redirect to home if not matched
  useEffect(() => {
    if (status === "ended") {
      navigate("/", { replace: true });
    }
  }, [status, navigate]);

  // Handle no match timeout
  useEffect(() => {
    if (status === "waiting") {
      setShowNoMatchMessage(false);
      noMatchTimeoutRef.current = setTimeout(() => {
        setShowNoMatchMessage(true);
      }, 30000); // 30 seconds
    } else {
      if (noMatchTimeoutRef.current) {
        clearTimeout(noMatchTimeoutRef.current);
        noMatchTimeoutRef.current = null;
      }
      setShowNoMatchMessage(false);
    }

    return () => {
      if (noMatchTimeoutRef.current) {
        clearTimeout(noMatchTimeoutRef.current);
        noMatchTimeoutRef.current = null;
      }
    };
  }, [status]);

  if (status === "waiting") {
    return (
      <div className="h-screen bg-base-200 flex items-center justify-center">
        <div className="bg-base-100 rounded-lg shadow-xl p-8 max-w-md w-full text-center relative">
          <button
            onClick={() => {
              cancelSearch();
              if (noMatchTimeoutRef.current) clearTimeout(noMatchTimeoutRef.current);
            }}
            className="absolute top-4 right-4 btn btn-ghost btn-sm btn-circle"
            aria-label="Stop searching"
            title="Cancel search"
          >
            <X size={20} />
          </button>
          
          <div className="mb-6">
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <Users className="absolute inset-0 m-auto size-10 text-primary" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold mb-2">Finding a Match</h2>
          <p className="text-base-content/70 mb-4">
            {showNoMatchMessage 
              ? "No users are available right now. Keep searching or try again later."
              : "We're looking for someone to chat with you..."
            }
          </p>
          
          <div className="flex items-center justify-center gap-2 text-sm text-base-content/50">
            <Loader2 className="size-4 animate-spin" />
            <span>{showNoMatchMessage ? "Still searching..." : "This may take a few moments"}</span>
          </div>
        </div>
      </div>
    );
  }

  if (status === "idle") {
    return (
      <div className="h-screen bg-base-200 flex items-center justify-center">
        <div className="bg-base-100 rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <Users className="size-16 mx-auto mb-4 text-primary" />
          <h2 className="text-2xl font-bold mb-2">Ready to Chat</h2>
          <p className="text-base-content/70 mb-6">
            Click the button below to find someone to chat with.
          </p>
          <button
            onClick={startChat}
            className="btn btn-primary btn-lg px-8 gap-2"
          >
            <Users size={20} />
            Find a Match
          </button>
          <button
            onClick={() => navigate("/")}
            className="btn btn-ghost mt-4"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (isLoading && messages.length === 0) {
    return (
      <div className="h-screen bg-base-200 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="size-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (status !== "matched" && status !== "active") {
    return (
      <div className="h-screen bg-base-200 flex items-center justify-center">
        <div className="bg-base-100 rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <Loader2 className="size-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg">Finding a match...</p>
        </div>
      </div>
    );
  }

  if (status === "matched" || status === "active") {
    return (
      <div className="h-screen bg-base-200 flex flex-col">
        <div className="bg-base-100 shadow-sm px-6 py-4 flex items-center justify-between border-b border-base-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <UserCheck size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Anonymous Chat</h1>
              <p className="text-sm text-base-content/60 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                Connected with a stranger
              </p>
            </div>
          </div>
          <ChatControls />
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-base-200">
          <MessageList messages={messages} guestId={guestId} />
          <div ref={messagesEndRef} />
        </div>

        <MessageInput />
      </div>
    );
  }
};

export default ChatRoom;
