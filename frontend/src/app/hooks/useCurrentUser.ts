"use client";

import { useEffect, useState } from "react";

import { AUTH_CHANGE_EVENT, type SessionUser } from "@/src/lib/session";

import { getCurrentUser } from "../utils/auth";

export function useCurrentUser() {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    const syncUser = () => {
      setUser(getCurrentUser());
    };

    syncUser();
    window.addEventListener(AUTH_CHANGE_EVENT, syncUser as EventListener);
    window.addEventListener("storage", syncUser);

    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, syncUser as EventListener);
      window.removeEventListener("storage", syncUser);
    };
  }, []);

  return user;
}
