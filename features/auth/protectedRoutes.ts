const PROTECTED_ROUTE_PREFIXES = [
  "/settings",
  "/favorites",
  "/history",
  "/notifications",
  "/chat/call",
  "/kyc",
] as const;

export function isProtectedRoute(pathname: string) {
  return PROTECTED_ROUTE_PREFIXES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}


/** Protected pages that start Keycloak login in place so their full URL (query) survives the round trip. */
export function isLoginInPlaceRoute(pathname: string) {
  return pathname === "/kyc" || pathname.startsWith("/kyc/");
}
