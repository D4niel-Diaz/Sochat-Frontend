import { useEffect, useState } from "react";
import { adminService } from "../../api/services/adminService";
import { MessageSquare, Clock, CheckCircle, Ban } from "lucide-react";
import toast from "react-hot-toast";

const ActiveChats = () => {
  const [chats, setChats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchChats();
    const interval = setInterval(fetchChats, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchChats = async () => {
    try {
      const response = await adminService.getActiveChats();
      console.log('🔍 Active chats response:', response.data);

      const responseData = response.data.data || response.data;
      setChats(responseData || []);
    } catch (error) {
      console.error("Failed to fetch chats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBan = async (guestId) => {
    if (!confirm("Are you sure you want to ban this user?")) return;
    
    try {
      await adminService.banGuest(guestId);
      toast.success("User banned successfully");
      fetchChats();
    } catch (error) {
      toast.error(error.message);
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Active Chats</h1>
          <p className="text-base-content/60">
            {chats.length} active conversation{chats.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={fetchChats} className="btn btn-ghost btn-sm">
          Refresh
        </button>
      </div>

      {chats.length === 0 ? (
        <div className="bg-base-100 rounded-lg shadow-sm p-12 text-center">
          <MessageSquare className="size-16 mx-auto mb-4 text-base-content/30" />
          <p className="text-base-content/60">No active chats at the moment</p>
        </div>
      ) : (
        <div className="bg-base-100 rounded-lg shadow-sm overflow-hidden">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>Chat ID</th>
                <th>Guest 1</th>
                <th>Guest 2</th>
                <th>Started At</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {chats.map((chat) => (
                <tr key={chat.chat_id}>
                  <td className="font-mono">#{chat.chat_id}</td>
                  <td className="font-mono text-sm">
                    {chat.guest_id_1?.substring(0, 8)}...
                  </td>
                  <td className="font-mono text-sm">
                    {chat.guest_id_2?.substring(0, 8)}...
                  </td>
                  <td className="flex items-center gap-2">
                    <Clock size={14} />
                    {new Date(chat.started_at).toLocaleString()}
                  </td>
                  <td>
                    <span className="badge badge-success">Active</span>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleBan(chat.guest_id_1)}
                        className="btn btn-xs btn-ghost text-error hover:bg-error/10"
                        title="Ban Guest 1"
                      >
                        <Ban size={14} />
                      </button>
                      <button
                        onClick={() => handleBan(chat.guest_id_2)}
                        className="btn btn-xs btn-ghost text-error hover:bg-error/10"
                        title="Ban Guest 2"
                      >
                        <Ban size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ActiveChats;
