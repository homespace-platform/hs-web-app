"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type Keycloak from "keycloak-js";
import keycloak from "@/lib/keycloak";
import { initKeycloakSession } from "@/lib/auth-init";

type AuthState = {
  initialized: boolean;
  authenticated: boolean;
  profileName: string | null;
  email: string | null;
  login: () => void;
  logout: () => void;
  keycloakInstance: Keycloak;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        await initKeycloakSession();
        if (!mounted) return;
        setAuthenticated(Boolean(keycloak.authenticated));

        if (keycloak.authenticated) {
          const parsed = keycloak.tokenParsed as Record<string, unknown> | undefined;
          setProfileName(
            typeof parsed?.name === "string" ? parsed.name : null,
          );
          setEmail(typeof parsed?.email === "string" ? parsed.email : null);
        }
      } catch (error) {
        console.error("[hs-web-app] Keycloak init failed:", error);
        if (!mounted) return;
        setAuthenticated(false);
      } finally {
        if (mounted) setInitialized(true);
      }
    };

    bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      initialized,
      authenticated,
      profileName,
      email,
      login: () => keycloak.login(),
      logout: () => keycloak.logout({ redirectUri: window.location.origin }),
      keycloakInstance: keycloak,
    }),
    [authenticated, email, initialized, profileName],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
