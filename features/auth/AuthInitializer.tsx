"use client";

import { useEffect } from "react";
import { initKeycloakSession } from "@/lib/auth-init";
import { useAppDispatch } from "@/store/hooks";
import { readKeycloakSession } from "@/features/auth/authSession";
import { sessionCleared, sessionInitialized } from "@/features/auth/authSlice";
import { fetchCurrentUser, userCleared } from "@/features/user/userSlice";

export default function AuthInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let active = true;

    initKeycloakSession()
      .then(() => {
        const session = readKeycloakSession();
        if (!active) return;

        dispatch(sessionInitialized(session));
        if (session.authenticated && session.userId) {
          dispatch(fetchCurrentUser({ userId: session.userId }));
        } else {
          dispatch(userCleared());
        }
      })
      .catch((error) => {
        console.error("[hs-web-app] Keycloak init failed:", error);
        if (active) {
          dispatch(sessionCleared());
          dispatch(userCleared());
        }
      });

    return () => {
      active = false;
    };
  }, [dispatch]);

  return children;
}
