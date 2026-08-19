import keycloak from "@/lib/keycloak";

export function readKeycloakSession() {
  const parsed = keycloak.tokenParsed as Record<string, unknown> | undefined;
  const authenticated = Boolean(keycloak.authenticated);

  return {
    authenticated,
    userId:
      authenticated && typeof parsed?.sub === "string" ? parsed.sub : null,
    username: authenticated
      ? typeof parsed?.preferred_username === "string"
        ? parsed.preferred_username
        : typeof parsed?.username === "string"
          ? parsed.username
          : null
      : null,
    profileName:
      authenticated && typeof parsed?.name === "string" ? parsed.name : null,
    email:
      authenticated && typeof parsed?.email === "string" ? parsed.email : null,
    avatarUrl:
      authenticated && typeof parsed?.picture === "string"
        ? parsed.picture
        : null,
  };
}
