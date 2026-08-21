const PROTECTED_ROUTE_PREFIXES = [
  "/settings",
  "/profile",
  "/favorites",
  "/history",
  "/notifications",
  "/chat",
] as const;

export function isProtectedRoute(pathname: string) {
  return PROTECTED_ROUTE_PREFIXES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

