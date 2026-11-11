import { useEffect, useRef, useState } from "react";
import { useChat } from "../../contexts/ChatContext";
import { useGuest } from "../../contexts/GuestContext";
import { reportService } from "../../api/services/reportService";
import { PhoneOff, Flag, Users, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const MIN_REASON_LENGTH = 10;

const ChatControls = () => {
  const { endChat, findNewMatch, chatId, status, isLoading } = useChat();
  const { sessionToken } = useGuest();
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFindingMatch, setIsFindingMatch] = useState(false);
  const reasonRef = useRef(null);
  const reportButtonRef = useRef(null);

  const closeReportModal = () => {
    setShowReportModal(false);
    setReportReason("");
    reportButtonRef.current?.focus();
  };

  useEffect(() => {
    if (!showReportModal) return;
    reasonRef.current?.focus();

    const onKeyDown = (e) => {
      if (e.key === "Escape") closeReportModal();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showReportModal]);

  const handleFindNewMatch = async () => {
    setIsFindingMatch(true);
    try {
      await findNewMatch();
    } catch {
      // startChat already showed the error
    } finally {
      setIsFindingMatch(false);
    }
  };

  const handleReport = async (e) => {
    e.preventDefault();
    if (reportReason.trim().length < MIN_REASON_LENGTH || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const response = await reportService.submitReport(sessionToken, chatId, reportReason.trim());
      toast.success(
        response.data?.data?.auto_banned
          ? "Report submitted. This user has been banned."
          : "Report submitted successfully"
      );
      closeReportModal();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status !== "matched") return null;

  const reasonTooShort = reportReason.trim().length < MIN_REASON_LENGTH;

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={handleFindNewMatch}
          className="btn btn-primary btn-sm gap-2"
          disabled={isFindingMatch || isLoading}
          aria-label="Find new match"
        >
          {isFindingMatch ? <Loader2 size={18} className="animate-spin" /> : <Users size={18} />}
          <span className="hidden sm:inline">{isFindingMatch ? "Finding..." : "New Match"}</span>
        </button>
        <button
          ref={reportButtonRef}
          onClick={() => setShowReportModal(true)}
          className="btn btn-ghost btn-sm gap-2 text-error hover:bg-error/10"
          disabled={isLoading}
          aria-label="Report user"
        >
          <Flag size={18} />
          <span className="hidden sm:inline">Report</span>
        </button>
        <button
          onClick={endChat}
          className="btn btn-error btn-sm gap-2"
          disabled={isLoading}
          aria-label="End chat"
        >
          <PhoneOff size={18} />
          <span className="hidden sm:inline">End Chat</span>
        </button>
      </div>

      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="bg-base-100 rounded-lg shadow-xl max-w-md w-full p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-title"
          >
            <h3 id="report-title" className="text-xl font-bold mb-4">Report User</h3>

            <form onSubmit={handleReport}>
              <div className="form-control mb-4">
                <label htmlFor="report-reason" className="text-sm text-base-content/70 mb-2">
                  Please describe what happened (at least {MIN_REASON_LENGTH} characters).
                </label>
                <textarea
                  id="report-reason"
                  ref={reasonRef}
                  className="textarea textarea-bordered w-full"
                  placeholder="Describe the issue..."
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  rows={4}
                  minLength={MIN_REASON_LENGTH}
                  maxLength={500}
                  required
                />
                <div className="text-xs text-base-content/40 mt-1 text-right">
                  {reportReason.length}/500
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button type="button" onClick={closeReportModal} className="btn btn-ghost" disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-error" disabled={reasonTooShort || isSubmitting}>
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
