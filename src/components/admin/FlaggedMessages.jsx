import { useEffect, useState } from "react";
import { adminService } from "../../api/services/adminService";
import { AlertTriangle, MessageSquare, Eye } from "lucide-react";

const FlaggedMessages = () => {
  const [flaggedMessages, setFlaggedMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFlaggedMessages();
  }, []);

  const fetchFlaggedMessages = async () => {
    try {
      const response = await adminService.getFlaggedMessages();

      const responseData = response.data.data || response.data;
      setFlaggedMessages(responseData || []);
    } catch (error) {
      error("Failed to fetch flagged messages:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div>
          <h1 className="text-2xl font-bold">Flagged Messages</h1>
          <p className="text-base-content/60">
            {flaggedMessages.length} flagged message
            {flaggedMessages.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {flaggedMessages.length === 0 ? (
        <div className="bg-base-100 rounded-lg shadow-sm p-12 text-center">
          <AlertTriangle className="size-16 mx-auto mb-4 text-base-content/30" />
          <p className="text-base-content/60">No flagged messages</p>
        </div>
      ) : (
        <div className="space-y-4">
          {flaggedMessages.map((message) => (
            <div
              key={message.message_id}
              className="bg-base-100 rounded-lg shadow-sm p-6"
            >
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-warning/10 text-warning">
                  <AlertTriangle size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-mono text-sm">
                      Message #{message.message_id}
                    </span>
                    <span className="badge badge-warning">Flagged</span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-base-content/60 mb-1">Content</p>
                      <p className="bg-base-200 p-3 rounded">
                        {message.content}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-base-content/60 mb-1">Chat ID</p>
                        <p className="font-mono">#{message.chat_id}</p>
                      </div>
                      <div>
                        <p className="text-base-content/60 mb-1">Sender</p>
                        <p className="font-mono">
                          {message.sender_guest_id?.substring(0, 8)}...
                        </p>
                      </div>
                    </div>

                    <div className="text-base-content/50">
                      {new Date(message.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FlaggedMessages;
