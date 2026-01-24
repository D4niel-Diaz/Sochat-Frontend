import { format } from "date-fns";

const MessageList = ({ messages, guestId }) => {
  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-base-content/50 text-center">
          No messages yet. Say hello!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => {
        const isOwn = message.sender === "you";

        return (
          <div
            key={message.message_id}
            className={`chat ${isOwn ? "chat-end" : "chat-start"}`}
          >
            <div className="chat-bubble">
              {message.is_flagged && (
                <div className="text-xs text-warning mb-1">
                  ⚠️ This message was flagged
                </div>
              )}
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
              <time className="chat-footer text-xs opacity-50 mt-1 block">
                {format(new Date(message.created_at), "HH:mm")}
              </time>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MessageList;
