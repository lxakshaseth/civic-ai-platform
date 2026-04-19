"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import {
  getCurrentUser,
  isUserAuthorizedForPortal,
  logout,
  syncCurrentUser,
} from "../utils/auth";
import { AUTH_CHANGE_EVENT, type PortalRole, type SessionUser } from "@/src/lib/session";

type UseAuthStateOptions = {
  requiredRole?: PortalRole;
  redirectTo?: string;
  syncOnMount?: boolean;
};

export function useAuthState(options: UseAuthStateOptions = {}) {
  const navigate = useNavigate();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    const redirectTo = options.redirectTo ?? "/login";

    const handleSessionChange = () => {
      if (!isActive) {
        return;
      }

      const nextUser = getCurrentUser();
      setUser(nextUser);
      setLoading(false);
    };

    const syncUser = async () => {
      const storedUser = getCurrentUser();

      if (!storedUser) {
        setUser(null);
        setLoading(false);

        if (options.requiredRole) {
          navigate(redirectTo, { replace: true });
        }

        return;
      }

      setUser(storedUser);
      setLoading(true);

      if (options.syncOnMount === false) {
        setLoading(false);
        return;
      }

      const syncedUser = await syncCurrentUser();

      if (!isActive) {
        return;
      }

      setUser(syncedUser);
      setLoading(false);

      if (
        options.requiredRole &&
        !isUserAuthorizedForPortal(syncedUser, options.requiredRole)
      ) {
        navigate(redirectTo, { replace: true });
      }
    };

    void syncUser();
    window.addEventListener(AUTH_CHANGE_EVENT, handleSessionChange as EventListener);
    window.addEventListener("storage", handleSessionChange);

    return () => {
      isActive = false;
      window.removeEventListener(AUTH_CHANGE_EVENT, handleSessionChange as EventListener);
      window.removeEventListener("storage", handleSessionChange);
    };
  }, [navigate, options.redirectTo, options.requiredRole, options.syncOnMount]);

  const handleLogout = async () => {
    await logout();
    navigate(options.redirectTo ?? "/login", { replace: true });
  };

  return {
    user,
    loading,
    isAuthorized: options.requiredRole
      ? isUserAuthorizedForPortal(user, options.requiredRole)
      : Boolean(user),
    logout: handleLogout,
  };
}
