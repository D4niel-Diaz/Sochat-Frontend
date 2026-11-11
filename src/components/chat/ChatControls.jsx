import { useEffect, useRef, useState } from "react";
import { useChat } from "../../contexts/ChatContext";
import { useGuest } from "../../contexts/GuestContext";
import { reportService } from "../../api/services/reportService";
import { Flag, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

// Each reason is sent as the report text (the API needs at least 10 characters)
const REPORT_REASONS = [
  "Harassment or bullying",
  "Sexual messages or images",
  "Asking for my personal info",
  "Spam or selling",
  "Something else",
];

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

/** Header actions for an active chat: Report (with its dialog) and Next stranger. */
const ChatControls = ({ nickname = "this person", preferences, onReported }) => {
  const { findNewMatch, chatId, status, isLoading } = useChat();
  const { sessionToken } = useGuest();
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFindingMatch, setIsFindingMatch] = useState(false);
  const dialogRef = useRef(null);
  const reportButtonRef = useRef(null);

  const closeReportModal = () => {
    setShowReportModal(false);
    setReportReason("");
    reportButtonRef.current?.focus();
  };

  // Focus the first reason, close on Escape, keep Tab inside the dialog
  useEffect(() => {
    if (!showReportModal) return;
    dialogRef.current?.querySelector("input")?.focus();

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        closeReportModal();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const items = [...dialogRef.current.querySelectorAll(FOCUSABLE)];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      // The radio group is one Tab stop, so any radio counts as the start
      const atStart = document.activeElement === first || document.activeElement?.type === "radio";
      if (e.shiftKey && atStart) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showReportModal]);

  const handleFindNewMatch = async () => {
    setIsFindingMatch(true);
    try {
      await findNewMatch(preferences);
    } catch {
      // startChat already showed the error
    } finally {
      setIsFindingMatch(false);
    }
  };

  const handleReport = async (e) => {
    e.preventDefault();
    if (!reportReason || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const response = await reportService.submitReport(sessionToken, chatId, reportReason);
      if (response.data?.data?.auto_banned) toast.success("Report sent. This user has been banned.");
      onReported?.();
      closeReportModal();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status !== "matched") return null;

  return (
    <>
      <div className="flex shrink-0 items-center gap-2">
        <button
          ref={reportButtonRef}
          type="button"
          onClick={() => setShowReportModal(true)}
          className="st-btn st-btn-outline st-btn-sm w-11 px-0 chat:w-auto chat:px-4"
          disabled={isLoading}
          aria-label={`Report ${nickname}`}
        >
          <Flag size={17} strokeWidth={2.5} aria-hidden="true" />
          <span className="hidden chat:inline">Report</span>
        </button>
        <button
          type="button"
          onClick={handleFindNewMatch}
          className="st-btn st-btn-primary st-btn-sm px-4 chat:px-5"
          disabled={isFindingMatch || isLoading}
        >
          {isFindingMatch && <Loader2 size={17} className="animate-spin" aria-hidden="true" />}
          <span className="chat:hidden">Next</span>
          <span className="hidden chat:inline">Next stranger</span>
        </button>
      </div>

      {showReportModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/55 p-3 chat:items-center chat:p-6"
          onMouseDown={(e) => e.target === e.currentTarget && !isSubmitting && closeReportModal()}
        >
          <div
            ref={dialogRef}
            className="st-rise max-h-[calc(100dvh-24px)] w-full max-w-[460px] overflow-y-auto rounded-[28px] bg-paper p-6 shadow-ink chat:p-8"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-title"
            aria-describedby="report-desc"
          >
            <h2 id="report-title" className="st-display text-[26px] font-bold leading-tight">
              Report {nickname}
            </h2>
            <p id="report-desc" className="mt-1.5 text-muted">
              They won&apos;t know it was you. What happened?
            </p>

            <form onSubmit={handleReport} className="mt-5">
              <fieldset>
                <legend className="sr-only">Reason</legend>
                <div className="flex flex-col gap-2">
                  {REPORT_REASONS.map((reason) => {
                    const selected = reportReason === reason;
                    return (
                      <label
                        key={reason}
                        className={`flex min-h-[48px] cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-2 font-medium transition-colors ${
                          selected ? "border-ink bg-mist-2" : "border-line hover:bg-mist"
                        }`}
                      >
                        <input
                          type="radio"
                          name="report-reason"
                          value={reason}
                          checked={selected}
                          onChange={() => setReportReason(reason)}
                          className="size-5 shrink-0 cursor-pointer appearance-none rounded-full border-2 border-ink bg-paper checked:border-[6px]"
                        />
                        {reason}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div className="mt-6 flex flex-col-reverse gap-2 chat:flex-row chat:justify-end">
                <button type="button" onClick={closeReportModal} className="st-btn st-btn-outline" disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="st-btn st-btn-dark" disabled={!reportReason || isSubmitting}>
                  {isSubmitting && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
                  {isSubmitting ? "Sending" : "Send report"}
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
