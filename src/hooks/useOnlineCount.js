import { useEffect, useState } from "react";
import { useGuest } from "../contexts/GuestContext";
import { presenceService } from "../api/services/presenceService";

const REFRESH_MS = 30000;

/** Guests the server currently counts as online, or null while unknown. */
const useOnlineCount = () => {
  const { sessionToken } = useGuest();
  const [count, setCount] = useState(null);

  useEffect(() => {
    if (!sessionToken) return;
    let cancelled = false;

    const load = async () => {
      try {
        const response = await presenceService.status(sessionToken);
        const value = response.data?.data?.online_users;
        if (!cancelled && Number.isFinite(value)) setCount(value);
      } catch {
        // Keep the last known value; the UI hides the count when it's null
      }
    };
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [sessionToken]);

  return count;
};

export default useOnlineCount;
