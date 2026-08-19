"use client";

import { useEffect } from "react";
import { initKeycloakSession } from "@/lib/auth-init";
import { useAppDispatch } from "@/store/hooks";
import { readKeycloakSession } from "@/features/auth/authSession";
import {
  sessionCleared,
  sessionInitialized,
} from "@/features/auth/authSlice";

export default function AuthInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let active = true;

    initKeycloakSession()
      .then(() => {
        if (active) dispatch(sessionInitialized(readKeycloakSession()));
      })
      .catch((error) => {
        console.error("[hs-web-app] Keycloak init failed:", error);
        if (active) dispatch(sessionCleared());
      });

    return () => {
      active = false;
    };
  }, [dispatch]);

  return children;
}
