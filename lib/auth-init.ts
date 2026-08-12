import keycloak from "@/lib/keycloak";

let initPromise: Promise<boolean> | null = null;

export const initKeycloakSession = async () => {
  if (initPromise) {
    return initPromise;
  }

  initPromise = Promise.race([
    keycloak.init({
      pkceMethod: "S256",
      checkLoginIframe: false,
      onLoad: "check-sso",
      silentCheckSsoRedirectUri:
        window.location.origin + "/silent-check-sso.html",
    }),
    new Promise<boolean>((_, reject) =>
      setTimeout(() => reject(new Error("Keycloak Timeout")), 10000),
    ),
  ]) as Promise<boolean>;

  return initPromise;
};
