"use client";

import { useCallback, useEffect, useState } from "react";
import { api, AUTH_EVENT, clearToken, getToken } from "./api";

export type Role = "CITIZEN" | "VOLUNTEER" | "NGO_COORDINATOR" | "ADMIN";

export type User = {
  id: string;
  phone: string;
  name: string | null;
  role: Role;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
  isBlocked: boolean;
  createdAt: string;
};

export function isResponder(user: User | null): boolean {
  return (
    !!user &&
    ["VOLUNTEER", "NGO_COORDINATOR", "ADMIN"].includes(user.role) &&
    user.approvalStatus === "APPROVED"
  );
}

// Restores the session from the stored token on mount, and re-syncs whenever
// the token changes (sign in, sign up, sign out) via AUTH_EVENT. Every
// component that calls this issues its own /auth/me request; cheap & stateless.
export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function sync() {
      if (!getToken()) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const data = await api<{ user: User }>("/auth/me");
        if (active) setUser(data.user);
      } catch {
        // Token may have expired or the account was blocked.
        clearToken();
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    // Set up the listener first, then kick off the initial load. Registration
    // must stay synchronous inside the effect so a sign-in that's already
    // racing this mount is not missed.
    window.addEventListener(AUTH_EVENT, sync);
    const timer = setTimeout(() => void sync(), 0);

    return () => {
      active = false;
      window.removeEventListener(AUTH_EVENT, sync);
      clearTimeout(timer);
    };
  }, []);

  const signOut = useCallback(() => {
    clearToken();
    setUser(null);
    api("/auth/logout", { method: "POST" }).catch(() => undefined);
  }, []);

  return { user, loading, signOut };
}