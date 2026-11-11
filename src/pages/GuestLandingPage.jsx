import { useState, useEffect } from "react";
import { useGuest } from "../contexts/GuestContext";
import { useChat } from "../contexts/ChatContext";
import { useNavigate, Link } from "react-router-dom";
import { Check, Flag, Loader2, Send, ShieldCheck, X } from "lucide-react";
import Logo from "../components/ui/Logo";
import Avatar from "../components/ui/Avatar";
import TypingBubble from "../components/ui/TypingBubble";
import useOnlineCount from "../hooks/useOnlineCount";
import { TOPICS, getStoredTopic, preferencesForTopic, storeTopic } from "../lib/chatMeta";

const RULES = [
  { icon: "check", text: "Be kind. The person on the other side is a student, too." },
  { icon: "check", text: "Keep your full name, section and socials to yourself, and don't ask for theirs." },
  { icon: "x", text: "No harassment, nudes, threats or selling stuff." },
  { icon: "flag", text: "See something wrong? Tap Report and admins will review the chat." },
];

const RuleIcon = ({ icon }) => {
  const Icon = { check: Check, x: X, flag: Flag }[icon];
  return (
    <span
      className={`mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-ink ${
        icon === "x" ? "bg-coral" : "bg-pili"
      }`}
      aria-hidden="true"
    >
      <Icon size={17} strokeWidth={2.75} />
    </span>
  );
};

const CenteredMessage = ({ children }) => (
  <div className="st-page flex items-center justify-center px-[18px]">{children}</div>
);

const GuestLandingPage = () => {
  const { isLoading, isBanned, error } = useGuest();
  const { startChat, status } = useChat();
  const navigate = useNavigate();
  const onlineCount = useOnlineCount();
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [chatError, setChatError] = useState(null);
  const [topic, setTopic] = useState(getStoredTopic);

  const chooseTopic = (subject) => {
    setTopic(subject);
    storeTopic(subject);
  };

  const handleStartChat = async () => {
    if (error || isBanned) {
      setChatError(error || "You cannot chat at this time");
      return;
    }
    setIsStartingChat(true);
    setChatError(null);
    try {
      storeTopic(topic);
      await startChat(preferencesForTopic(topic));
    } catch (err) {
      setChatError(err.message || "Failed to start chat");
      setIsStartingChat(false);
    }
  };

  useEffect(() => {
    // Go to the chat once matching starts, or when a chat was restored after a reload
    if ((isStartingChat && status === "waiting") || status === "matched") {
      navigate("/chat");
      setIsStartingChat(false);
    }
  }, [status, isStartingChat, navigate]);

  if (isLoading) {
    return (
      <CenteredMessage>
        <div className="flex flex-col items-center gap-4 text-center" role="status">
          <TypingBubble />
          <p className="st-display text-xl font-semibold">Setting up your session</p>
        </div>
      </CenteredMessage>
    );
  }

  if (isBanned) {
    return (
      <CenteredMessage>
        <div className="st-card w-full max-w-md p-8 text-left">
          <Avatar tone="me" size={48} faded />
          <h1 className="st-display mt-5 text-3xl font-bold leading-tight">You can&apos;t chat right now</h1>
          <p className="mt-3 text-muted">
            This session was banned for breaking the community rules. If you think that&apos;s a mistake, contact
            the admins.
          </p>
        </div>
      </CenteredMessage>
    );
  }

  const startLabel = isStartingChat ? "Connecting" : "Start a chat";
  const shownError = chatError || error;

  return (
    <div className="st-page">
      <header className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-[18px] py-4 wide:px-8 wide:py-6">
        <Logo />
        <div className="flex items-center gap-2 wide:gap-6">
          <nav aria-label="Page sections" className="hidden items-center gap-1 wide:flex">
            <a href="#how" className="rounded-full px-3 py-2.5 font-medium hover:bg-mist-2">How it works</a>
            <a href="#rules" className="rounded-full px-3 py-2.5 font-medium hover:bg-mist-2">Community rules</a>
          </nav>
          {onlineCount !== null && (
            <span className="st-pill">
              <span className="st-live-dot" aria-hidden="true" />
              {onlineCount} online
            </span>
          )}
        </div>
      </header>

      <main>
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="mx-auto grid max-w-[1240px] gap-14 px-[18px] pb-16 pt-6 wide:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] wide:items-center wide:gap-12 wide:px-8 wide:pb-24 wide:pt-10">
          <div className="min-w-0">
            {shownError && (
              <p role="alert" className="mb-6 rounded-[20px] bg-coral-soft px-5 py-4 font-medium text-ink">
                {shownError}
              </p>
            )}

            <div className="mb-3 flex items-center gap-2.5 text-[15px] font-medium text-muted">
              <Avatar tone="stranger" size={30} />
              A stranger from SorSU
            </div>
            <h1 className="st-hero-title max-w-[13ch] rounded-[30px_30px_30px_8px] bg-paper px-[26px] py-7 shadow-ink wide:rounded-[40px_40px_40px_8px] wide:px-12 wide:py-10">
              Someone on campus wants to talk too.
            </h1>
            <TypingBubble className="mt-2.5" />

            <div className="mt-8 flex flex-col items-end gap-3 text-right">
              <button
                type="button"
                onClick={handleStartChat}
                disabled={isStartingChat}
                className="st-btn st-btn-primary min-h-[64px] gap-3 rounded-[32px_32px_8px_32px] px-8 text-[24px] shadow-ink wide:min-h-[76px] wide:px-10 wide:text-[30px]"
              >
                {startLabel}
                {isStartingChat ? (
                  <Loader2 className="size-6 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="size-6 wide:size-7" strokeWidth={2.5} aria-hidden="true" />
                )}
              </button>
              <p className="max-w-[34ch] text-[15px] text-muted">
                No sign-up. By starting, you agree to the{" "}
                <a href="#rules" className="st-link">community rules</a>.
              </p>
            </div>

            <fieldset className="mt-10">
              <legend className="st-display mb-3 text-lg font-semibold">Pick a topic, or keep it random</legend>
              <div className="flex flex-wrap gap-2">
                {TOPICS.map((t) => (
                  <button
                    key={t.subject}
                    type="button"
                    className="st-chip"
                    aria-pressed={topic === t.subject}
                    onClick={() => chooseTopic(t.subject)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <HeroPreview />
        </section>

        {/* ── How it works ─────────────────────────────────────────────────── */}
        <section id="how" aria-labelledby="how-title" className="mx-auto max-w-[1240px] scroll-mt-6 px-[18px] pb-16 wide:px-8 wide:pb-24">
          <h2 id="how-title" className="st-section-title mb-8">How it works</h2>
          <ol className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))" }}>
            <StepCard n={1} title="Pick a topic" text="Or skip it and talk about anything.">
              <div className="flex flex-wrap justify-center gap-1.5 px-3">
                <span className="st-chip pointer-events-none min-h-[34px] px-3 text-sm">Music</span>
                <span className="st-chip pointer-events-none min-h-[34px] px-3 text-sm is-on">Org life</span>
                <span className="st-chip pointer-events-none min-h-[34px] px-3 text-sm">Games</span>
              </div>
            </StepCard>
            <StepCard
              n={2}
              title="Get paired"
              text="You both get a random nickname, like Quiet Butanding. Nobody sees your real name."
            >
              <div className="flex items-center gap-2">
                <Avatar tone="me" size={44} />
                <span className="w-16 border-t-[3px] border-dashed border-ink/50" />
                <Avatar tone="stranger" size={44} />
              </div>
            </StepCard>
            <StepCard n={3} title="Talk, skip or leave" text="Not clicking? Hit Next. Someone being rude? Report them.">
              <div className="flex items-center gap-2">
                <span className="st-btn st-btn-outline pointer-events-none min-h-[38px] gap-1.5 px-3.5 text-sm">
                  <Flag size={14} strokeWidth={2.5} /> Report
                </span>
                <span className="st-btn st-btn-primary pointer-events-none min-h-[38px] px-3.5 text-sm">Next stranger</span>
              </div>
            </StepCard>
          </ol>
        </section>

        {/* ── Rules and privacy ────────────────────────────────────────────── */}
        <section id="rules" aria-label="Community rules and privacy" className="mx-auto grid max-w-[1240px] scroll-mt-6 gap-5 px-[18px] pb-16 wide:grid-cols-2 wide:px-8 wide:pb-24">
          <div className="st-on-ink rounded-[32px] bg-ink p-7 text-onink wide:rounded-[40px] wide:p-12">
            <h2 className="st-section-title">Community rules</h2>
            <ul className="mt-7 space-y-5">
              {RULES.map((rule) => (
                <li key={rule.text} className="flex gap-3.5">
                  <RuleIcon icon={rule.icon} />
                  <span>{rule.text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div id="privacy" className="scroll-mt-6 rounded-[32px] bg-paper p-7 shadow-ink wide:rounded-[40px] wide:p-12">
            <h2 className="st-section-title">What stays private</h2>
            <dl className="mt-7 divide-y-2 divide-mist-2">
              <div className="pb-5">
                <dt className="st-display text-xl font-bold">Your identity</dt>
                <dd className="mt-1 text-muted">
                  We never ask for your name, email or student number. The other person only sees a random nickname.
                  The server keeps a temporary guest ID and your IP address to stop abuse.
                </dd>
              </div>
              <div className="py-5">
                <dt className="st-display text-xl font-bold">Your chats</dt>
                <dd className="mt-1 text-muted">
                  {/* TODO: replace with the real data-retention policy. The code currently never deletes messages. */}
                  Messages are stored on our server.{" "}
                  <mark className="rounded bg-pili px-1 text-ink">TODO: how long chats are kept.</mark>
                </dd>
              </div>
              <div className="pt-5">
                <dt className="st-display text-xl font-bold">Reports</dt>
                <dd className="mt-1 text-muted">
                  Reports go to the admins with the reason you picked. The person you report isn&apos;t told who sent it.
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* ── Closing band ─────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-[1240px] px-[18px] pb-12 wide:px-8 wide:pb-16">
          <div className="flex flex-col items-start gap-6 rounded-[40px] bg-pili px-6 py-10 wide:flex-row wide:items-center wide:justify-between wide:px-14 wide:py-14">
            <h2 className="st-section-title max-w-[16ch]">Someone&apos;s online right now. Say hi.</h2>
            <button type="button" onClick={handleStartChat} disabled={isStartingChat} className="st-btn st-btn-dark min-h-[58px] px-8 text-lg">
              {startLabel}
            </button>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-[1240px] flex-col gap-3 px-[18px] pb-10 text-[15px] text-muted wide:flex-row wide:items-center wide:justify-between wide:px-8">
        {/* TODO: say who runs SORSU Talk (org, office or student group). */}
        <p>SORSU Talk is run by <mark className="rounded bg-pili px-1 text-ink">TODO: who runs it</mark>.</p>
        <nav aria-label="Footer" className="-ml-3 flex flex-wrap items-center wide:ml-0">
          {/* TODO: point Terms and Privacy at real pages once they exist */}
          <a href="#rules" className="inline-flex min-h-[44px] items-center rounded-full px-3 hover:bg-mist-2">Terms</a>
          <a href="#privacy" className="inline-flex min-h-[44px] items-center rounded-full px-3 hover:bg-mist-2">Privacy</a>
          <Link to="/admin/login" className="inline-flex min-h-[44px] items-center rounded-full px-3 hover:bg-mist-2">
            Admin sign-in
          </Link>
        </nav>
      </footer>
    </div>
  );
};

const StepCard = ({ n, title, text, children }) => (
  <li className="st-card flex flex-col p-5">
    <div className="flex h-[120px] items-center justify-center rounded-[18px] bg-mist-2" aria-hidden="true">
      {children}
    </div>
    <div className="mt-5 flex items-center gap-3">
      <span className="st-display inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-pili text-lg font-bold">
        {n}
      </span>
      <h3 className="st-display text-[22px] font-bold">{title}</h3>
    </div>
    <p className="mt-2 text-muted">{text}</p>
  </li>
);

/** Decorative sample conversation next to the hero. */
const HeroPreview = () => (
  <div className="relative mx-auto w-full max-w-[460px] pt-5" aria-hidden="true">
    <div className="st-pill st-pill-ink absolute left-3 top-0 z-10 min-h-[42px] gap-2 px-4 shadow-ink-sm wide:-left-6">
      <ShieldCheck size={18} className="text-pili" />
      No names, no profiles
    </div>
    <div className="overflow-hidden rounded-[34px] border-2 border-line bg-mist shadow-ink">
      <div className="flex items-center gap-3 border-b-2 border-line bg-paper px-5 pb-4 pt-7">
        <Avatar tone="stranger" online />
        <div className="leading-tight">
          <p className="st-display text-lg font-bold">Quiet Butanding</p>
          <p className="text-sm text-online-text">typing…</p>
        </div>
      </div>
      <div className="flex flex-col gap-[3px] px-4 py-5 text-[16px]">
        <span className="st-pill mx-auto mb-3 min-h-[30px] text-[13px]">Matched on Music</span>
        <p className="st-bubble st-bubble-in is-first max-w-[82%] self-start">may nakikinig ka ba ng opm lately?</p>
        <p className="st-bubble st-bubble-in is-last max-w-[82%] self-start">need new songs for the jeep ride home</p>
        <p className="st-bubble st-bubble-out is-first mt-3 max-w-[82%] self-end">yes!! try Cup of Joe and Dilaw</p>
        <p className="st-bubble st-bubble-out is-last max-w-[82%] self-end">perfect for 7am classes</p>
        <TypingBubble className="mt-3 self-start" />
      </div>
      <div className="flex items-center gap-2 border-t-2 border-line bg-paper px-4 py-3">
        <span className="flex h-11 flex-1 items-center rounded-full border-2 border-line bg-mist px-4 text-[15px] text-muted-2">
          Type a message
        </span>
        <span className="inline-flex size-11 items-center justify-center rounded-full bg-ink">
          <Send size={18} className="text-pili" strokeWidth={2.5} />
        </span>
      </div>
    </div>
  </div>
);

export default GuestLandingPage;
