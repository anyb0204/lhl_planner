import { useState, useEffect, useCallback } from "react";
import type { AuthUser } from "@workspace/api-client-react";

export type { AuthUser };

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/user", { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { user: AuthUser | null };
      setUser(data.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Listen for the popup completing auth
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.data === "lhl-auth-complete") {
        fetchUser();
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [fetchUser]);

  const login = useCallback(() => {
    const base = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "");
    const returnTo = `${base}/auth-done`;
    const loginUrl = `/api/login?returnTo=${encodeURIComponent(returnTo)}`;

    // Open a popup so OAuth runs in a real top-level window (no iframe cookie issues)
    const popup = window.open(
      loginUrl,
      "lhl-auth",
      "width=520,height=660,left=200,top=100,scrollbars=yes,resizable=yes"
    );

    if (!popup) {
      // Popup blocked — fall back to full redirect
      window.location.href = loginUrl;
    }
  }, []);

  const logout = useCallback(() => {
    window.location.href = "/api/logout";
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
  };
}
