import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { guestService } from "../api/services/guestService";
import { setSessionToken as setAxiosSessionToken } from "../api/config/axios.config";
import { error as logError } from "../utils/logger";

const STORAGE_KEY = "guestSession";
// Refresh the 24h session when this much time is left
const REFRESH_BEFORE_EXPIRY_MS = 4 * 60 * 60 * 1000;

const GuestContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useGuest = () => {
  const context = useContext(GuestContext);
  if (!context) {
    throw new Error("useGuest must be used within a GuestProvider");
  }
  return context;
};

// Per-tab storage: a reload keeps the same guest (and chat); a new tab is a new guest
const storage = {
  read() {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    } catch {
      return null;
    }
  },
  write(session) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // storage unavailable: the session just won't survive a reload
    }
  },
  clear() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  },
};

export const GuestProvider = ({ children }) => {
  const [session, setSession] = useState(null); // { guestId, sessionToken, expiresAt }
  const [isLoading, setIsLoading] = useState(true);
  const [isBanned, setIsBanned] = useState(false);
  const [error, setError] = useState(null);
  const startedRef = useRef(false);

  const applySession = useCallback((next) => {
    setSession(next);
    setAxiosSessionToken(next?.sessionToken ?? null);
    if (next) storage.write(next);
    else storage.clear();
  }, []);

  const handleSessionError = useCallback((err) => {
    if (err?.status === 403) {
      setIsBanned(true);
      setError("You have been banned from this platform");
    } else {
      setError(err?.message || "Unable to connect to server. Please refresh the page.");
    }
  }, []);

  const createSession = useCallback(async () => {
    setError(null);
    const response = await guestService.createSession();
    const data = response.data?.data;
    if (!data?.guest_id || !data?.session_token) {
      throw new Error("Invalid response from server");
    }
    setIsBanned(false);
    applySession({ guestId: data.guest_id, sessionToken: data.session_token, expiresAt: data.expires_at });
  }, [applySession]);

  /** Extend a stored session; resolves false if it is no longer valid. */
  const refreshStoredSession = useCallback(async (stored) => {
    try {
      const response = await guestService.refreshSession(stored.sessionToken);
      applySession({ ...stored, expiresAt: response.data?.data?.expires_at ?? stored.expiresAt });
      return true;
    } catch (err) {
      if (err?.status === 403) {
        applySession(null);
        handleSessionError(err);
        return true; // banned: don't silently create a fresh identity
      }
      return false;
    }
  }, [applySession, handleSessionError]);

  // Initial load: reuse this tab's session if it is still valid, else create one
  useEffect(() => {
    if (startedRef.current) return; // StrictMode runs effects twice in dev
    startedRef.current = true;

    (async () => {
      try {
        const stored = storage.read();
        const restored = stored?.sessionToken && (await refreshStoredSession(stored));
        if (!restored) await createSession();
      } catch (err) {
        logError("Session setup failed:", err);
        handleSessionError(err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [createSession, refreshStoredSession, handleSessionError]);

  // Refresh shortly before the 24h session expires
  useEffect(() => {
    if (!session?.expiresAt) return;

    const delay = new Date(session.expiresAt).getTime() - Date.now() - REFRESH_BEFORE_EXPIRY_MS;
    const timer = setTimeout(async () => {
      if (!(await refreshStoredSession(session))) {
        createSession().catch(handleSessionError);
      }
    }, Math.max(delay, 0));

    return () => clearTimeout(timer);
  }, [session, refreshStoredSession, createSession, handleSessionError]);

  const value = {
    guestId: session?.guestId ?? null,
    sessionToken: session?.sessionToken ?? null,
    expiresAt: session?.expiresAt ?? null,
    isLoading,
    isBanned,
    error,
  };

  return <GuestContext.Provider value={value}>{children}</GuestContext.Provider>;
};
