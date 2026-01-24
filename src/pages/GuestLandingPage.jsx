import { useState, useEffect } from "react";
import { useGuest } from "../contexts/GuestContext";
import { useChat } from "../contexts/ChatContext";
import { useNavigate } from "react-router-dom";
import { Loader2, MessageCircle, Shield, Users } from "lucide-react";
import { Link } from "react-router-dom";

const GuestLandingPage = () => {
  const { isLoading, isBanned, error } = useGuest();
  const { startChat, status } = useChat();
  const navigate = useNavigate();
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [chatError, setChatError] = useState(null);

  const handleStartChat = async () => {
    if (error || isBanned) {
      setChatError(error || "You cannot chat at this time");
      return;
    }
    setIsStartingChat(true);
    setChatError(null);
    try {
      await startChat();
    } catch (err) {
      setChatError(err.message || "Failed to start chat");
      setIsStartingChat(false);
    }
  };

  useEffect(() => {
    // Navigate to chat only when status changes from idle to waiting/matched
    if (isStartingChat && (status === "waiting" || status === "matched")) {
      navigate("/chat");
      setIsStartingChat(false);
    }
  }, [status, isStartingChat, navigate]);

  if (isLoading) {
    return (
      <div className="h-screen bg-base-200 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="size-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg">Setting up your session...</p>
        </div>
      </div>
    );
  }

  if (isBanned) {
    return (
      <div className="h-screen bg-base-200 flex items-center justify-center">
        <div className="bg-base-100 rounded-lg shadow-xl p-8 max-w-md text-center">
          <Shield className="size-16 mx-auto mb-4 text-error" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-base-content/70 mb-6">
            You have been banned from this platform due to violations of our terms.
          </p>
          <p className="text-sm text-base-content/50">Please contact support if you believe this is an error.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-base-200">
      <nav className="bg-base-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <MessageCircle className="size-8 text-primary" />
              <span className="text-xl font-bold">SORSU TALK</span>
            </div>
            <Link to="/admin/login" className="btn btn-ghost btn-sm">
              Admin
            </Link>
          </div>
        </div>
      </nav>

      <div className="flex items-center justify-center px-4 py-12">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Anonymous Chat</h1>
            <p className="text-xl text-base-content/70">
              Connect with random people anonymously. No registration required.
            </p>
          </div>

          {chatError && (
            <div className="alert alert-error mb-6">
              <Shield size={20} />
              <span>{chatError}</span>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-base-100 rounded-lg p-6 text-center shadow-sm">
              <Users className="size-12 mx-auto mb-4 text-primary" />
              <h3 className="font-semibold mb-2">Random Matching</h3>
              <p className="text-sm text-base-content/60">
                Get paired with random users instantly
              </p>
            </div>
            <div className="bg-base-100 rounded-lg p-6 text-center shadow-sm">
              <Shield className="size-12 mx-auto mb-4 text-primary" />
              <h3 className="font-semibold mb-2">Anonymous & Safe</h3>
              <p className="text-sm text-base-content/60">
                Your identity stays protected
              </p>
            </div>
            <div className="bg-base-100 rounded-lg p-6 text-center shadow-sm">
              <MessageCircle className="size-12 mx-auto mb-4 text-primary" />
              <h3 className="font-semibold mb-2">Real-time Chat</h3>
              <p className="text-sm text-base-content/60">
                Instant messaging with strangers
              </p>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={handleStartChat}
              className="btn btn-primary btn-lg px-12"
              disabled={isStartingChat}
            >
              {isStartingChat ? (
                <>
                  <Loader2 className="size-5 animate-spin mr-2" />
                  Connecting...
                </>
              ) : (
                "Start Chatting"
              )}
            </button>
            <p className="mt-4 text-sm text-base-content/50">
              By clicking, you agree to our terms of service
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuestLandingPage;
