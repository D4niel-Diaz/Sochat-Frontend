import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, Flag, ShieldCheck } from "lucide-react";
import { useChat } from "../../contexts/ChatContext";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import ChatControls from "./ChatControls";
import Avatar from "../ui/Avatar";
import Logo from "../ui/Logo";
import TypingBubble from "../ui/TypingBubble";
import useOnlineCount from "../../hooks/useOnlineCount";
import { getChatDetails, getStoredTopic, nicknameFor, preferencesForTopic, topicLabel } from "../../lib/chatMeta";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const peopleOnline = (n) => `${n} ${n === 1 ? "person" : "people"} online`;

/** Centered column used by the waiting, idle and loading screens. */
const CenterColumn = ({ children }) => (
  <div className="st-page flex flex-col">
    <header className="mx-auto w-full max-w-[1240px] px-[18px] py-4 wide:px-8">
      <Logo />
    </header>
    <main className="mx-auto flex w-full max-w-[640px] flex-1 flex-col items-center px-[18px] pb-12 pt-4 text-center wide:pt-10">
      {children}
    </main>
  </div>
);

const Radar = () => (
  <div className="st-radar mx-auto" aria-hidden="true">
    <span className="st-radar-ring" />
    <span className="st-radar-ring" />
    <span className="st-radar-ring" />
    <div className="st-radar-orbit">
      <span className="left-[calc(50%-17px)] top-0"><Avatar tone="stranger" size={34} faded /></span>
      <span className="bottom-[8%] left-[2%]"><Avatar tone="plain" size={30} faded /></span>
      <span className="bottom-[14%] right-0"><Avatar tone="stranger" size={28} faded /></span>
    </div>
    <div className="absolute inset-0 flex items-center justify-center">
      <Avatar tone="me" size={92} className="drop-shadow-[0_18px_22px_rgba(18,48,47,0.28)]" />
    </div>
  </div>
);

const ChatRoom = () => {
  const { status, messages, isLoading, isPartnerTyping, chatId, startChat, cancelSearch, endChat, returnToLobby } =
    useChat();
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const noMatchTimeoutRef = useRef(null);
  const [showNoMatchMessage, setShowNoMatchMessage] = useState(false);
  const [reported, setReported] = useState(false);
  const onlineCount = useOnlineCount();
  const topic = getStoredTopic();

  // The context clears the chat when it ends; keep the last one on screen so we
  // can show "{nickname} left the chat" instead of jumping straight home.
  const leavingRef = useRef(false);
  const lastChatRef = useRef({ chatId: null, messages: [] });
  if (status === "matched" && chatId) lastChatRef.current = { chatId, messages };

  const shownChatId = status === "matched" ? chatId : lastChatRef.current.chatId;
  const shownMessages = status === "matched" ? messages : lastChatRef.current.messages;
  const partnerLeft = status === "ended" && Boolean(lastChatRef.current.chatId) && !leavingRef.current;
  const nickname = nicknameFor(shownChatId);
  const details = getChatDetails(shownChatId);

  // A new chat clears the "Reported" banner; the chat ending keeps it
  useEffect(() => {
    if (chatId) setReported(false);
  }, [chatId]);

  useEffect(() => {
    if (messagesEndRef.current && (shownMessages.length > 0 || isPartnerTyping || partnerLeft)) {
      messagesEndRef.current.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "end" });
    }
  }, [shownMessages, isPartnerTyping, partnerLeft, reported]);

  // Leaving (or a chat that ended before this page saw it) goes home;
  // the partner leaving keeps the chat on screen.
  useEffect(() => {
    if (status === "ended" && !partnerLeft) {
      navigate("/", { replace: true });
    }
  }, [status, partnerLeft, navigate]);

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

  const handleLeave = () => {
    if (status !== "matched") {
      returnToLobby();
      navigate("/");
      return;
    }
    leavingRef.current = true;
    endChat();
  };

  const findSomeoneNew = () => {
    leavingRef.current = false;
    lastChatRef.current = { chatId: null, messages: [] };
    startChat(preferencesForTopic(topic)).catch(() => {});
  };

  const backHome = () => {
    returnToLobby();
    navigate("/");
  };

  if (status === "waiting") {
    return (
      <CenterColumn>
        <Radar />
        <div role="status" className="mt-8 flex flex-col items-center">
          <h1 className="st-section-title max-w-[18ch]">Looking for someone to talk to</h1>
          {showNoMatchMessage && (
            <p className="mt-3 max-w-[40ch] text-muted">
              Nobody&apos;s free yet. Keep this open, or try again later.
            </p>
          )}
        </div>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <span className="st-pill st-pill-ink">{topicLabel(topic)}</span>
          {onlineCount !== null && (
            <span className="st-pill">
              <span className="st-live-dot" aria-hidden="true" />
              {peopleOnline(onlineCount)}
            </span>
          )}
        </div>

        <div className="st-card mt-10 flex w-full items-start gap-4 p-5 text-left">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-mist-2" aria-hidden="true">
            <ShieldCheck size={22} strokeWidth={2.25} />
          </span>
          <div>
            <p className="st-display text-lg font-bold">Stay anonymous</p>
            <p className="text-muted">Keep your name, section and socials out of the chat.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={async () => {
            if (noMatchTimeoutRef.current) clearTimeout(noMatchTimeoutRef.current);
            await cancelSearch();
            navigate("/");
          }}
          className="st-btn st-btn-outline mt-6"
          disabled={isLoading}
        >
          Stop looking
        </button>
      </CenterColumn>
    );
  }

  if (status === "idle") {
    return (
      <CenterColumn>
        <Avatar tone="me" size={92} />
        <h1 className="st-section-title mt-8">Ready when you are</h1>
        <p className="mt-3 text-muted">
          You&apos;ll be matched on <strong className="text-ink">{topicLabel(topic)}</strong>.
        </p>
        <div className="mt-8 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => startChat(preferencesForTopic(topic)).catch(() => {})}
            className="st-btn st-btn-primary min-h-[58px] px-8 text-lg"
          >
            Start a chat
          </button>
          <button type="button" onClick={() => navigate("/")} className="st-btn st-btn-text">
            Back to home
          </button>
        </div>
      </CenterColumn>
    );
  }

  if ((isLoading && messages.length === 0 && !partnerLeft) || (status !== "matched" && !partnerLeft)) {
    return (
      <CenterColumn>
        <div className="mt-16 flex flex-col items-center gap-4" role="status">
          <TypingBubble />
          <p className="st-display text-xl font-semibold">Loading chat</p>
        </div>
      </CenterColumn>
    );
  }

  const statusLine = partnerLeft ? "Left the chat" : isPartnerTyping ? "typing…" : "Online";

  return (
    <div className="st-page flex h-dvh min-h-0 flex-col">
      <header className="border-b-2 border-line bg-paper">
        <div className="mx-auto flex min-h-[68px] max-w-[920px] items-center gap-2 px-3 py-2.5 chat:gap-3 chat:px-6">
          <button type="button" onClick={handleLeave} className="st-icon-btn -ml-1" aria-label="Leave chat">
            <ArrowLeft size={22} strokeWidth={2.5} aria-hidden="true" />
          </button>
          <Avatar tone="stranger" online={!partnerLeft} faded={partnerLeft} />
          <div className="min-w-0 flex-1 leading-tight">
            <h1 className="st-display truncate text-lg font-bold">{nickname}</h1>
            <p role="status" className={`truncate text-sm ${partnerLeft ? "text-muted-2" : "text-online-text"}`}>
              {statusLine}
            </p>
          </div>
          <ChatControls
            nickname={nickname}
            preferences={preferencesForTopic(topic)}
            onReported={() => setReported(true)}
          />
        </div>
      </header>

      {reported && (
        <div role="status" className="border-b-2 border-line bg-coral-soft">
          <p className="mx-auto flex max-w-[920px] items-start gap-2.5 px-3 py-3 text-[15px] font-medium chat:px-6">
            <Flag size={17} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
            Reported. Admins will review this chat. You can keep talking or hit Next.
          </p>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain" aria-live="polite">
        <div className="mx-auto flex max-w-[920px] flex-col px-3 py-5 chat:px-6">
          <div className="mb-6 flex flex-col items-center gap-3">
            <span className="st-pill text-[14px]">
              Matched on {topicLabel(details?.topic)}
              {details?.matchedAt ? `, ${format(new Date(details.matchedAt), "h:mm a")}` : ""}
            </span>
            <p className="flex max-w-[520px] items-start gap-2.5 rounded-[20px] bg-ink px-4 py-3 text-left text-[15px] text-onink">
              <ShieldCheck size={19} strokeWidth={2.25} className="mt-0.5 shrink-0 text-pili" aria-hidden="true" />
              You&apos;re both anonymous. Don&apos;t share your name, section or socials.
            </p>
          </div>

          {shownMessages.length === 0 && !isPartnerTyping && !partnerLeft && (
            <p className="mb-4 text-center text-muted-2">No messages yet. Say hi.</p>
          )}

          <MessageList
            messages={shownMessages}
            nickname={nickname}
            isPartnerTyping={isPartnerTyping}
            partnerLeft={partnerLeft}
          />

          {partnerLeft && (
            <div className="st-card mx-auto mt-8 w-full max-w-[440px] p-6 text-center">
              <Avatar tone="stranger" size={48} faded className="mx-auto" />
              <p className="st-display mt-3 text-[22px] font-bold leading-tight">{nickname} left the chat.</p>
              <p className="mt-1 text-muted">Find someone new, or head back home.</p>
              <div className="mt-5 flex flex-col items-center gap-1">
                <button type="button" onClick={findSomeoneNew} className="st-btn st-btn-primary w-full chat:w-auto">
                  Find someone new
                </button>
                <button type="button" onClick={backHome} className="st-btn st-btn-text">
                  Back to home
                </button>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <MessageInput />
    </div>
  );
};

export default ChatRoom;
