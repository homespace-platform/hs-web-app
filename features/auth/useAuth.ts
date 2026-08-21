"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import keycloak from "@/lib/keycloak";
import { sessionCleared } from "@/features/auth/authSlice";
import { userCleared } from "@/features/user/userSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export function useAuth() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const auth = useAppSelector((state) => state.auth);
  const profile = useAppSelector((state) => state.user.profile);

  const login = useCallback(() => void keycloak.login(), []);
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
