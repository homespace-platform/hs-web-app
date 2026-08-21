import keycloak from "@/lib/keycloak";

let initPromise: Promise<boolean> | null = null;

export function initKeycloakSession() {
  if (initPromise) return initPromise;

  initPromise = Promise.race([
    keycloak.init({
      pkceMethod: "S256",
      checkLoginIframe: false,
      onLoad: "check-sso",
      silentCheckSsoRedirectUri:
        window.location.origin + "/silent-check-sso.html",
    }),
    new Promise<boolean>((_, reject) =>
      setTimeout(() => reject(new Error("Keycloak initialization timed out")), 10000),
    ),
  ]) as Promise<boolean>;

  return initPromise;
}

export function readKeycloakSession() {
  const parsed = keycloak.tokenParsed as Record<string, unknown> | undefined;
  const authenticated = Boolean(keycloak.authenticated);

  return {
    authenticated,
    userId:
      authenticated && typeof parsed?.sub === "string" ? parsed.sub : null,
  };
}
