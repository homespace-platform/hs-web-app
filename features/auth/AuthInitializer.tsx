"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import keycloak from "@/lib/keycloak";
import { initKeycloakSession, readKeycloakSession } from "@/features/auth/authSession";
import { isProtectedRoute } from "@/features/auth/protectedRoutes";
import { useAppDispatch } from "@/store/hooks";
import { sessionCleared, sessionInitialized } from "@/features/auth/authSlice";
import { fetchCurrentUser, userCleared } from "@/features/user/userSlice";
import { fetchFavoriteIds, favoritesCleared } from "@/features/favorite/favoriteSlice";

export default function AuthInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const router = useRouter();

  useEffect(() => {
    let active = true;

    const clearSession = () => {
      if (!active) return;
      dispatch(sessionCleared());
      dispatch(userCleared());
      dispatch(favoritesCleared());
      router.replace("/");
    };

    const refreshExpiredToken = () => {
      void keycloak.updateToken(30).catch(clearSession);
    };

    keycloak.onAuthLogout = clearSession;
    keycloak.onAuthRefreshError = clearSession;
    keycloak.onTokenExpired = refreshExpiredToken;
    window.addEventListener("hs:auth-session-expired", clearSession);

    initKeycloakSession()
      .then(() => {
        const session = readKeycloakSession();
        if (!active) return;

        dispatch(sessionInitialized(session));
        if (session.authenticated && session.userId) {
          dispatch(fetchCurrentUser({ userId: session.userId }));
          dispatch(fetchFavoriteIds({ userId: session.userId }));
          const returnUrl = sessionStorage.getItem("hs:return-url");
          sessionStorage.removeItem("hs:return-url");
          if (
            window.location.pathname === "/" &&
            returnUrl &&
            isProtectedRoute(returnUrl)
          ) {
            router.replace(returnUrl);
          }
        } else {
          dispatch(userCleared());
          dispatch(favoritesCleared());
        }
      })
      .catch((error) => {
        console.error("[hs-web-app] Keycloak init failed:", error);
        if (active) {
          dispatch(sessionCleared());
          dispatch(userCleared());
          dispatch(favoritesCleared());
        }
      });

    return () => {
      active = false;
      keycloak.onAuthLogout = undefined;
      keycloak.onAuthRefreshError = undefined;
      keycloak.onTokenExpired = undefined;
      window.removeEventListener("hs:auth-session-expired", clearSession);
    };
  }, [dispatch, router]);

  return children;
}
