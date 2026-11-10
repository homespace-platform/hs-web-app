"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import keycloak from "@/lib/keycloak";
import { sessionCleared } from "@/features/auth/authSlice";
import { userCleared } from "@/features/user/userSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

interface LoginFn {
  (): void;
  (redirectPath?: string): void;
}

function buildInternalRedirectUri(redirectPath?: string): string | undefined {
  if (typeof redirectPath !== "string" || typeof window === "undefined") {
    return undefined;
  }
  const trimmed = redirectPath.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return undefined;
  }
  try {
    const resolved = new URL(trimmed, window.location.origin);
    if (resolved.origin !== window.location.origin) {
      return undefined;
    }
    return `${window.location.origin}${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return undefined;
  }
}

export function useAuth() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const auth = useAppSelector((state) => state.auth);
  const profile = useAppSelector((state) => state.user.profile);

  const login: LoginFn = useCallback((redirectPath?: string) => {
    const redirectUri = buildInternalRedirectUri(redirectPath);
    void keycloak.login(redirectUri ? { redirectUri } : undefined);
  }, []);
  const register = useCallback(() => void keycloak.register(), []);
  const logout = useCallback(() => {
    dispatch(sessionCleared());
    dispatch(userCleared());
    router.replace("/");
    void keycloak.logout({ redirectUri: window.location.origin });
  }, [dispatch, router]);

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
