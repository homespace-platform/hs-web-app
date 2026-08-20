"use client";

import { useCallback } from "react";
import keycloak from "@/lib/keycloak";
import { useAppSelector } from "@/store/hooks";

export function useAuth() {
  const auth = useAppSelector((state) => state.auth);
  const profile = useAppSelector((state) => state.user.profile);

  const login = useCallback(() => void keycloak.login(), []);
  const register = useCallback(() => void keycloak.register(), []);
  const logout = useCallback(
    () => void keycloak.logout({ redirectUri: window.location.origin }),
    [],
  );

  return {
    ...auth,
    profile,
    username: profile?.username ?? null,
    avatarUrl: profile?.avatarUrl ?? null,
    login,
    register,
    logout,
  };
}
