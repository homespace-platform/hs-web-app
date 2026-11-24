import type { DashboardRole } from "@/lib/dashboard-role";

export function contractListPath(role: DashboardRole): string {
  return `/dashboard/${role}/contracts`;
}

export function contractDetailPath(role: DashboardRole, contractId: string): string {
  return `${contractListPath(role)}/${encodeURIComponent(contractId)}`;
}

/** Role-agnostic contract route: the landing page resolves the viewer's side and keeps the query. */
export function contractLandingPath(contractId: string): string {
  return `/dashboard/contracts/${encodeURIComponent(contractId)}`;
}

/** Legacy payments URL: now only a redirect to the contract page's payment tab. */
export function invoiceDetailPath(contractId: string): string {
  return `/dashboard/invoices/${encodeURIComponent(contractId)}`;
}
