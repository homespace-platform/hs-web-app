export type DashboardRole = "landlord" | "tenant";

export const DASHBOARD_ROLE_STORAGE_KEY = "hs.dashboard.role";

export const DASHBOARD_ROLE_HOME: Record<DashboardRole, string> = {
  landlord: "/dashboard/landlord",
  tenant: "/dashboard/tenant",
};

export const DASHBOARD_ROLE_LABEL: Record<DashboardRole, string> = {
  landlord: "Người cho thuê",
  tenant: "Người đi thuê",
};

export function isDashboardRole(value: unknown): value is DashboardRole {
  return value === "landlord" || value === "tenant";
}

export function readStoredDashboardRole(): DashboardRole | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DASHBOARD_ROLE_STORAGE_KEY);
    return isDashboardRole(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function writeStoredDashboardRole(role: DashboardRole): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DASHBOARD_ROLE_STORAGE_KEY, role);
  } catch {
    // ignore
  }
}

export function inferRoleFromPath(pathname: string): DashboardRole | null {
  if (!pathname.startsWith("/dashboard") || pathname === "/dashboard") return null;

  // Tenant-specific paths first (more specific)
  if (
    pathname.startsWith("/dashboard/tenant") ||
    pathname.startsWith("/dashboard/viewing-schedules/my-bookings") ||
    pathname.startsWith("/dashboard/rental-requests/my-requests")
  ) {
    return "tenant";
  }

  if (
    pathname.startsWith("/dashboard/landlord") ||
    pathname.startsWith("/dashboard/properties") ||
    pathname.startsWith("/dashboard/customers") ||
    pathname.startsWith("/dashboard/analytics") ||
    pathname.startsWith("/dashboard/viewing-schedules") ||
    pathname.startsWith("/dashboard/rental-requests") ||
    pathname.startsWith("/dashboard/contracts")
  ) {
    return "landlord";
  }

  // Shared finance pages — keep stored role, don't infer
  return null;
}
