"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

interface DashboardSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItem {
  title: string;
  path: string;
  icon: React.ElementType;
}

interface NavGroup {
  groupTitle: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    groupTitle: "TỔNG QUAN",
    items: [
      {
        title: "Dashboard",
        path: "/dashboard",
        icon: Gauge,
      },
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
      {
        title: "Khách hàng",
        path: "/dashboard/customers",
        icon: Users,
      },
      {
        title: "Tin đăng",
        path: "/dashboard/properties",
        icon: FileText,
      },
      {
        title: "Yêu cầu thuê",
        path: "/dashboard/rental-requests",
        icon: Send,
      },
      {
        title: "Hợp đồng",
        path: "/dashboard/contracts",
        icon: FileCheck,
      },
      {
        title: "Lịch xem nhà",
        path: "/dashboard/viewing-schedules",
        icon: Calendar,
      },
    ],
  },
  {
    groupTitle: "TÀI CHÍNH",
    items: [
      {
        title: "Nạp tiền",
        path: "/dashboard/deposit",
        icon: Wallet,
      },
      {
        title: "Rút tiền",
        path: "/dashboard/withdraw",
        icon: Banknote,
      },
      {
        title: "Thanh toán",
        path: "/dashboard/payments",
        icon: CreditCard,
      },
    ],
  },
];

export default function DashboardSidebar({
  collapsed,
  onToggleCollapse,
}: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`fixed top-20 left-0 z-40 h-[calc(100vh-5rem)] bg-card border-r border-border flex flex-col transition-all duration-300 select-none ${collapsed ? "w-20" : "w-64"
        }`}
    >
      {/* 1. Sidebar Header with Collapse Toggle */}
      <div className="h-12 px-4 border-b border-border/60 flex items-center justify-between shrink-0">
        {!collapsed && (
          <span className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider">
            MENU
          </span>
        )}
        <button
          type="button"
          onClick={onToggleCollapse}
          className={`p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center justify-center ${collapsed ? "mx-auto" : ""
            }`}
          title={collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
        >
          {collapsed ? (
            <PanelLeftOpen className="w-4 h-4 text-primary" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* 2. Navigation Groups & Items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-5 no-scrollbar">
        {NAV_GROUPS.map((group) => (
          <div key={group.groupTitle} className="space-y-1.5">
            {/* Group Title */}
            {!collapsed ? (
              <div className="px-3.5 py-1 text-[11px] font-bold text-muted-foreground/70 uppercase tracking-wider">
                {group.groupTitle}
              </div>
            ) : (
              <div className="h-px bg-border/60 my-2" />
            )}

            {/* Items */}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.path;

                return (
                  <Link
                    key={item.title}
                    href={item.path}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${isActive
                        ? "bg-primary/10 text-primary font-bold shadow-2xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                      } ${collapsed ? "justify-center px-0" : ""}`}
                    title={collapsed ? item.title : undefined}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"
                        }`}
                    />
                    {!collapsed && (
                      <span className="truncate">{item.title}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
