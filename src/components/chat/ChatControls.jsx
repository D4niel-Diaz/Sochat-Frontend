import { useChat } from "../../contexts/ChatContext";
import { reportService } from "../../api/services/reportService";
import { useGuest } from "../../contexts/GuestContext";
import { PhoneOff, Flag, Users, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";

const ChatControls = () => {
  const { endChat, startChat, chatId, status, isLoading } = useChat();
  const { sessionToken } = useGuest();
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFindingMatch, setIsFindingMatch] = useState(false);

  useEffect(() => {
    if (!showReportModal) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setShowReportModal(false);
        setReportReason("");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showReportModal]);

  const handleEndChat = () => {
    endChat();
    toast.success("Chat ended");
  };

  const handleFindNewMatch = async () => {
    setIsFindingMatch(true);
    try {
      await startChat();
      // Don't show toast here - let the match handler show it
    } catch (error) {
      toast.error("Failed to find a match");
    } finally {
      setIsFindingMatch(false);
    }
  };

  const handleStopSearching = () => {
    endChat();
    toast.success("Stopped searching");
  };

  const handleReport = async (e) => {
    e.preventDefault();
    
    if (!reportReason.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const response = await reportService.submitReport(
        sessionToken,
        chatId,
        reportReason.trim()
      );

      toast.success("Report submitted successfully");

      if (response.data.data?.auto_banned) {
        toast.success("This user has been automatically banned");
      }

      setShowReportModal(false);
      setReportReason("");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show different controls based on status
  if (status === "waiting") {
    return (
      <button
        onClick={handleStopSearching}
        className="btn btn-error btn-sm gap-2"
        disabled={isLoading}
        aria-label="Stop searching"
      >
        {isLoading ? <Loader2 size={18} className="animate-spin" /> : <X size={18} />}
        <span className="hidden sm:inline">Stop Searching</span>
      </button>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {status === "matched" || status === "active" ? (
          <>
            <button
              onClick={handleFindNewMatch}
              className="btn btn-primary btn-sm gap-2"
              disabled={isFindingMatch || isLoading}
              aria-label="Find new match"
            >
              {isFindingMatch || isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Users size={18} />
              )}
              <span className="hidden sm:inline">
                {isFindingMatch || isLoading ? "Finding..." : "New Match"}
              </span>
            </button>
            <button
              onClick={() => setShowReportModal(true)}
              className="btn btn-ghost btn-sm gap-2 text-error hover:bg-error/10"
              disabled={isLoading}
              aria-label="Report user"
            >
              <Flag size={18} />
              <span className="hidden sm:inline">Report</span>
            </button>
            <button
              onClick={handleEndChat}
              className="btn btn-error btn-sm gap-2"
              disabled={isLoading}
              aria-label="End chat"
            >
              <PhoneOff size={18} />
              <span className="hidden sm:inline">End Chat</span>
            </button>
          </>
        ) : null}
      </div>

      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="bg-base-100 rounded-lg shadow-xl max-w-md w-full p-6"
            role="dialog"
            aria-modal="true"
            aria-label="Report user"
          >
            <h3 className="text-xl font-bold mb-4">Report User</h3>
            <p className="text-sm text-base-content/70 mb-4">
              Please provide a reason for reporting this user.
            </p>
            
            <form onSubmit={handleReport}>
              <div className="form-control mb-4">
                <textarea
                  className="textarea textarea-bordered w-full"
                  placeholder="Describe the issue..."
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  rows={4}
                  maxLength={500}
                  required
                />
                <div className="text-xs text-base-content/40 mt-1 text-right">
                  {reportReason.length}/500
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowReportModal(false);
                    setReportReason("");
                  }}
                  className="btn btn-ghost"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-error"
                  disabled={!reportReason.trim() || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Submitting...
                    </>
                  ) : (
                    "Submit Report"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatControls;
