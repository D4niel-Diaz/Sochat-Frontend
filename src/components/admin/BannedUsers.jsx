import { useEffect, useState } from "react";
import { adminService } from "../../api/services/adminService";
import { Shield, Ban, UserCheck } from "lucide-react";
import toast from "react-hot-toast";

const BannedUsers = () => {
  const [bannedGuests, setBannedGuests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBannedGuests();
  }, []);

  const fetchBannedGuests = async () => {
    try {
      const response = await adminService.getBannedGuests();
      console.log('🔍 Banned guests response:', response.data);

      // Handle both response formats
      const responseData = response.data.data || response.data;
      setBannedGuests(responseData || []);
    } catch (error) {
      console.error("Failed to fetch banned guests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnban = async (guestId) => {
    try {
      await adminService.unbanGuest(guestId);
      toast.success("User unbanned successfully");
      fetchBannedGuests();
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
      <div className="mb-6">
        <div>
          <h1 className="text-2xl font-bold">Banned Users</h1>
          <p className="text-base-content/60">
            {bannedGuests.length} banned user{bannedGuests.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {bannedGuests.length === 0 ? (
        <div className="bg-base-100 rounded-lg shadow-sm p-12 text-center">
          <Shield className="size-16 mx-auto mb-4 text-base-content/30" />
          <p className="text-base-content/60">No banned users</p>
        </div>
      ) : (
        <div className="bg-base-100 rounded-lg shadow-sm overflow-hidden">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>Guest ID</th>
                <th>IP Address</th>
                <th>Banned At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bannedGuests.map((guest) => (
                <tr key={guest.guest_id}>
                  <td className="font-mono text-sm">{guest.guest_id}</td>
                  <td className="font-mono text-sm">{guest.ip_address}</td>
                  <td>
                    {new Date(guest.created_at || guest.updated_at).toLocaleString()}
                  </td>
                  <td>
                    <button
                      onClick={() => handleUnban(guest.guest_id)}
                      className="btn btn-sm btn-ghost text-success hover:bg-success/10"
                    >
                      <UserCheck size={16} className="mr-1" />
                      Unban
                    </button>
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

export default BannedUsers;
