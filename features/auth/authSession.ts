import keycloak from "@/lib/keycloak";

export function readKeycloakSession() {
  const parsed = keycloak.tokenParsed as Record<string, unknown> | undefined;
  const authenticated = Boolean(keycloak.authenticated);

  return {
    authenticated,
    userId:
      authenticated && typeof parsed?.sub === "string" ? parsed.sub : null,
  };
}
