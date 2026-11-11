import { format } from "date-fns";
import { AlertTriangle } from "lucide-react";
import Avatar from "../ui/Avatar";
import TypingBubble from "../ui/TypingBubble";

const timeOf = (message) => {
  const date = new Date(message.created_at);
  return Number.isNaN(date.getTime()) ? "" : format(date, "h:mm a");
};

/** Consecutive messages from the same sender form one group. */
const groupMessages = (messages) =>
  messages.reduce((groups, message) => {
    const last = groups[groups.length - 1];
    if (last && last.sender === message.sender) last.items.push(message);
    else groups.push({ sender: message.sender, items: [message] });
    return groups;
  }, []);

const positionOf = (index, count) => {
  if (count === 1) return "";
  if (index === 0) return "is-first";
  return index === count - 1 ? "is-last" : "is-middle";
};

const MessageList = ({ messages, nickname = "Stranger", isPartnerTyping = false, partnerLeft = false }) => {
  const groups = groupMessages(messages);

  // "Seen" = the stranger has replied since my latest message (there are no read receipts)
  const lastOwnIndex = messages.findLastIndex((m) => m.sender === "you");
  const lastOwnId = lastOwnIndex >= 0 ? messages[lastOwnIndex].message_id : null;
  const seen = lastOwnIndex >= 0 && messages.slice(lastOwnIndex + 1).some((m) => m.sender !== "you");

  return (
    <ol className="flex flex-col gap-[14px]" aria-label={`Messages with ${nickname}`}>
      {groups.map((group) => {
        const isOwn = group.sender === "you";
        const lastItem = group.items[group.items.length - 1];
        const time = timeOf(lastItem);

        return (
          <li key={group.items[0].message_id} className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
            <span className="sr-only">{isOwn ? "You said:" : `${nickname} said:`}</span>
            <div className={`flex w-full items-end gap-2 ${isOwn ? "justify-end" : ""}`}>
              {!isOwn && (
                <div className="w-8 shrink-0">
                  <Avatar tone="stranger" size={32} faded={partnerLeft} />
                </div>
              )}
              <div className={`flex min-w-0 max-w-[82%] flex-col gap-[3px] chat:max-w-[68%] ${isOwn ? "items-end" : "items-start"}`}>
                {group.items.map((message, i) => (
                  <div
                    key={message.message_id}
                    className={`st-bubble ${isOwn ? "st-bubble-out" : "st-bubble-in"} ${positionOf(i, group.items.length)}`}
                  >
                    {message.is_flagged && (
                      <span
                        className={`mb-1 flex items-center gap-1.5 text-[13px] font-medium ${isOwn ? "text-pili" : "text-muted-2"}`}
                      >
                        <AlertTriangle size={14} aria-hidden="true" />
                        This message was flagged
                      </span>
                    )}
                    {message.content}
                  </div>
                ))}
              </div>
            </div>
            {time && (
              <span className={`mt-1 text-xs text-muted-2 ${isOwn ? "pr-1" : "pl-11"}`}>
                {isOwn && seen && lastItem.message_id === lastOwnId ? `${time}, seen` : time}
              </span>
            )}
          </li>
        );
      })}

      {isPartnerTyping && !partnerLeft && (
        <li className="flex items-end gap-2">
          <Avatar tone="stranger" size={32} />
          <TypingBubble label={`${nickname} is typing`} />
        </li>
      )}
    </ol>
  );
};

export default MessageList;
