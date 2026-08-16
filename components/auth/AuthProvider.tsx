"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import keycloak from "@/lib/keycloak";
import { initKeycloakSession } from "@/lib/auth-init";

type AuthState = {
  initialized: boolean;
  authenticated: boolean;
  username: string | null;
  profileName: string | null;
  email: string | null;
  login: () => void;
  register: () => void;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
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
          const uname =
            typeof parsed?.preferred_username === "string"
              ? parsed.preferred_username
              : typeof parsed?.username === "string"
              ? parsed.username
              : null;

          setUsername(uname);
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
      username,
      profileName,
      email,
      login: () => keycloak.login(),
      register: () => keycloak.register(),
      logout: () => keycloak.logout({ redirectUri: window.location.origin }),
    }),
    [authenticated, email, initialized, profileName, username],
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
