import {
  Gauge,
  BarChart2,
  Users,
  FileText,
  Send,
  FileCheck,
  Calendar,
  Wallet,
  Banknote,
  CreditCard,
  type LucideIcon,
} from "lucide-react";
import type { DashboardRole } from "@/lib/dashboard-role";

export interface DashboardSubNavItem {
  title: string;
  path: string;
}

export interface DashboardNavItem {
  title: string;
  path?: string;
  icon: LucideIcon;
  children?: DashboardSubNavItem[];
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
      { title: "Phân tích & Báo cáo", path: "/dashboard/analytics", icon: BarChart2 },
    ],
  },
  {
    groupTitle: "QUẢN LÝ",
    items: [
      { title: "Khách hàng", path: "/dashboard/customers", icon: Users },
      { title: "Tin đăng", path: "/dashboard/properties", icon: FileText },
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
        title: "Hợp đồng",
        icon: FileCheck,
        children: [
          { title: "Từ điển mã trường", path: "/dashboard/contracts/fields" },
          { title: "Mẫu hợp đồng", path: "/dashboard/contracts/templates" },
          { title: "Hợp đồng đã ký", path: "/dashboard/contracts" },
        ],
      },
    ],
  },
  {
    groupTitle: "TÀI CHÍNH",
    items: [
      { title: "Nạp tiền", path: "/dashboard/deposit", icon: Wallet },
      { title: "Rút tiền", path: "/dashboard/withdraw", icon: Banknote },
      { title: "Thanh toán", path: "/dashboard/payments", icon: CreditCard },
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
        title: "Hợp đồng",
        path: "/dashboard/contracts",
        icon: FileCheck,
      },
    ],
  },
  {
    groupTitle: "TÀI CHÍNH",
    items: [
      { title: "Nạp tiền", path: "/dashboard/deposit", icon: Wallet },
      { title: "Rút tiền", path: "/dashboard/withdraw", icon: Banknote },
      { title: "Thanh toán", path: "/dashboard/payments", icon: CreditCard },
    ],
  },
];

export function getNavForRole(role: DashboardRole | null): DashboardNavGroup[] {
  if (role === "tenant") return TENANT_NAV;
  return LANDLORD_NAV;
}
