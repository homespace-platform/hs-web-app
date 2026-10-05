import {
  Gauge,
  BarChart2,
  Users,
  FileText,
  Building2,
  Send,
  FileCheck,
  Calendar,
  ReceiptText,
  type LucideIcon,
} from "lucide-react";
import type { DashboardRole } from "@/lib/dashboard-role";

export interface DashboardNavItem {
  title: string;
  path: string;
  icon: LucideIcon;
}

export interface DashboardNavGroup {
  groupTitle: string;
  items: DashboardNavItem[];
}

/** Menu Người cho thuê — link thẳng, ít submenu. */
export const LANDLORD_NAV: DashboardNavGroup[] = [
  {
    groupTitle: "BẢNG ĐIỀU KHIỂN",
    items: [
      { title: "Dashboard", path: "/dashboard/landlord", icon: Gauge },
      {
        title: "Phân tích & Báo cáo",
        path: "/dashboard/analytics",
        icon: BarChart2,
      },
    ],
  },
  {
    groupTitle: "QUẢN LÝ",
    items: [
      { title: "Khách hàng", path: "/dashboard/customers", icon: Users },
      { title: "Tin đăng", path: "/dashboard/properties", icon: FileText },
      {
        title: "Chi nhánh / Tòa nhà",
        path: "/dashboard/branches",
        icon: Building2,
      },
      {
        title: "Lịch xem nhà",
        path: "/dashboard/viewing-schedules",
        icon: Calendar,
      },
      {
        title: "Yêu cầu thuê",
        path: "/dashboard/rental-requests",
        icon: Send,
      },
      {
        title: "Hợp đồng cho thuê",
        path: "/dashboard/landlord/contracts",
        icon: FileCheck,
      },
      {
        title: "Hóa đơn",
        path: "/dashboard/invoices",
        icon: ReceiptText,
      },
    ],
  },
];

/** Menu Người đi thuê — chỉ các mục liên quan khách thuê. */
export const TENANT_NAV: DashboardNavGroup[] = [
  {
    groupTitle: "BẢNG ĐIỀU KHIỂN",
    items: [{ title: "Dashboard", path: "/dashboard/tenant", icon: Gauge }],
  },
  {
    groupTitle: "THUÊ NHÀ",
    items: [
      {
        title: "Lịch đi xem",
        path: "/dashboard/viewing-schedules/my-bookings",
        icon: Calendar,
      },
      {
        title: "Yêu cầu đã gửi",
        path: "/dashboard/rental-requests/my-requests",
        icon: Send,
      },
      {
        title: "Hợp đồng đi thuê",
        path: "/dashboard/tenant/contracts",
        icon: FileCheck,
      },
      {
        title: "Hóa đơn",
        path: "/dashboard/invoices",
        icon: ReceiptText,
      },
    ],
  },
];

export function getNavForRole(role: DashboardRole | null): DashboardNavGroup[] {
  if (role === "tenant") return TENANT_NAV;
  return LANDLORD_NAV;
}
