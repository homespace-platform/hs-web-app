import type { BreadcrumbItem } from "@/components/common/Breadcrumb";

const ROOT = "/dashboard";

// Static pages under app/dashboard. `parent` must be another real page; group labels are omitted.
const ROUTES: Record<string, { label: string; parent?: string }> = {
  "/dashboard": { label: "Bảng điều khiển" },
  "/dashboard/landlord": { label: "Dashboard chủ nhà" },
  "/dashboard/tenant": { label: "Dashboard người thuê" },
  "/dashboard/analytics": { label: "Phân tích & Báo cáo" },
  "/dashboard/customers": { label: "Khách hàng" },
  "/dashboard/properties": { label: "Tin đăng" },
  "/dashboard/properties/view": { label: "Chi tiết tin đăng", parent: "/dashboard/properties" },
  "/dashboard/properties/detail": { label: "Chi tiết tin đăng", parent: "/dashboard/properties" },
  "/dashboard/properties/new": { label: "Đăng tin mới", parent: "/dashboard/properties" },
  "/dashboard/properties/upsert": { label: "Đăng / chỉnh sửa tin", parent: "/dashboard/properties" },
  "/dashboard/branches": { label: "Chi nhánh" },
  "/dashboard/complaints": { label: "Khiếu nại" },
  "/dashboard/membership": { label: "Gói hội viên & Lượt đăng" },
  "/dashboard/membership/return": { label: "Kết quả thanh toán hội viên", parent: "/dashboard/membership" },
  "/dashboard/membership/eth": { label: "Thanh toán hội viên bằng ETH", parent: "/dashboard/membership" },
  "/dashboard/viewing-schedules": { label: "Lịch xem nhà" },
  "/dashboard/viewing-schedules/my-bookings": { label: "Lịch đi xem" },
  "/dashboard/rental-requests": { label: "Yêu cầu thuê" },
  "/dashboard/rental-requests/my-requests": { label: "Yêu cầu đã gửi" },
  "/dashboard/contracts": { label: "Hợp đồng" },
  "/dashboard/landlord/contracts": { label: "Hợp đồng cho thuê" },
  "/dashboard/tenant/contracts": { label: "Hợp đồng đi thuê" },
  "/dashboard/invoices": { label: "Lịch sử thanh toán" },
  "/dashboard/deposit": { label: "Nạp tiền" },
  "/dashboard/withdraw": { label: "Rút tiền" },
  "/dashboard/transactions": { label: "Lịch sử giao dịch" },
  "/dashboard/payments": { label: "Thanh toán" },
};

// Dynamic segments get generic labels; checked after the static table.
const DYNAMIC: { pattern: RegExp; label: string; parent: string }[] = [
  { pattern: /^\/dashboard\/properties\/[^/]+\/edit$/, label: "Chỉnh sửa tin đăng", parent: "/dashboard/properties" },
  { pattern: /^\/dashboard\/branches\/[^/]+$/, label: "Chi tiết chi nhánh", parent: "/dashboard/branches" },
  { pattern: /^\/dashboard\/contracts\/[^/]+$/, label: "Chi tiết hợp đồng", parent: "/dashboard/contracts" },
  { pattern: /^\/dashboard\/landlord\/contracts\/[^/]+$/, label: "Chi tiết hợp đồng", parent: "/dashboard/landlord/contracts" },
  { pattern: /^\/dashboard\/tenant\/contracts\/reservations\/[^/]+$/, label: "Hồ sơ cọc & nhận nhà", parent: "/dashboard/tenant/contracts" },
  { pattern: /^\/dashboard\/tenant\/contracts\/[^/]+$/, label: "Chi tiết hợp đồng", parent: "/dashboard/tenant/contracts" },
];

// Unknown routes: use the last segment if we know its name, else just the root.
const SEGMENT_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(ROUTES).map(([path, { label }]) => [path.split("/").pop()!, label]),
);

export function buildDashboardTrail(pathname: string | null, dynamicTitle?: string | null): BreadcrumbItem[] {
  const path = (pathname ?? ROOT).replace(/\/+$/, "") || ROOT;
  const root: BreadcrumbItem = { label: ROUTES[ROOT].label, href: ROOT };

  const entry = ROUTES[path] ?? DYNAMIC.find((d) => d.pattern.test(path));
  const label = entry?.label ?? SEGMENT_LABELS[path.split("/").pop()!];
  if (path === ROOT || !label) return [{ label: root.label }];

  const parent = entry?.parent;
  const parentLabel = parent ? ROUTES[parent].label : null;
  return [
    root,
    ...(parent && parentLabel ? [{ label: parentLabel, href: parent }] : []),
    { label: dynamicTitle || label },
  ];
}
