"use client";

import React, { useState, useEffect } from "react";
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
  ChevronDown,
} from "lucide-react";

interface DashboardSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface SubNavItem {
  title: string;
  path: string;
}

interface NavItem {
  title: string;
  path?: string;
  icon: React.ElementType;
  children?: SubNavItem[];
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
        title: "Lịch xem nhà",
        icon: Calendar,
        children: [
          {
            title: "Lịch tiếp khách",
            path: "/dashboard/viewing-schedules",
          },
          {
            title: "Lịch đi xem",
            path: "/dashboard/viewing-schedules/my-bookings",
          },
        ],
      },
      {
        title: "Yêu cầu thuê",
        icon: Send,
        children: [
          {
            title: "Khách gửi đến tôi",
            path: "/dashboard/rental-requests",
          },
          {
            title: "Tôi đã gửi đi",
            path: "/dashboard/rental-requests/my-requests",
          },
        ],
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

  // State mở các submenu
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        if (item.children) {
          const hasActiveChild = item.children.some(
            (c) => pathname === c.path || pathname.startsWith(c.path + "/")
          );
          initial[item.title] = hasActiveChild;
        }
      }
    }
    return initial;
  });

  // Tự động mở submenu khi đổi route tương ứng
  useEffect(() => {
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        if (item.children) {
          const hasActiveChild = item.children.some(
            (c) => pathname === c.path || pathname.startsWith(c.path + "/")
          );
          if (hasActiveChild) {
            setOpenSubmenus((prev) => ({ ...prev, [item.title]: true }));
          }
        }
      }
    }
  }, [pathname]);

  const toggleSubmenu = (title: string) => {
    setOpenSubmenus((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <aside
      className={`fixed top-20 left-0 z-40 h-[calc(100vh-5rem)] bg-card border-r border-border flex flex-col transition-all duration-300 select-none ${
        collapsed ? "w-20" : "w-64"
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
          className={`p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center justify-center ${
            collapsed ? "mx-auto" : ""
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

                // Trường hợp có Submenu (Ví dụ: Lịch xem nhà)
                if (item.children) {
                  const isAnyChildActive = item.children.some(
                    (c) => pathname === c.path || pathname.startsWith(c.path + "/")
                  );
                  const isOpen = !!openSubmenus[item.title];

                  if (collapsed) {
                    // Khi thu gọn sidebar
                    return (
                      <Link
                        key={item.title}
                        href={item.children[0].path}
                        className={`flex items-center justify-center p-2.5 rounded-xl transition-all duration-150 ${
                          isAnyChildActive
                            ? "bg-primary/10 text-primary font-bold shadow-2xs"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                        }`}
                        title={`${item.title} (${item.children.map((c) => c.title).join(" / ")})`}
                      >
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isAnyChildActive ? "text-primary" : "text-muted-foreground"
                          }`}
                        />
                      </Link>
                    );
                  }

                  return (
                    <div key={item.title} className="space-y-1">
                      <button
                        type="button"
                        onClick={() => toggleSubmenu(item.title)}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                          isAnyChildActive
                            ? "text-primary font-bold bg-primary/5"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon
                            className={`w-4 h-4 shrink-0 ${
                              isAnyChildActive ? "text-primary" : "text-muted-foreground"
                            }`}
                          />
                          <span className="truncate">{item.title}</span>
                        </div>
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${
                            isOpen ? "rotate-180 text-primary" : ""
                          }`}
                        />
                      </button>

                      {/* Sub-items list */}
                      {isOpen && (
                        <div className="pl-9 pr-1 space-y-1 pt-0.5 animate-in slide-in-from-top-1 duration-150">
                          {item.children.map((sub) => {
                            const isSubActive =
                              pathname === sub.path ||
                              (pathname.startsWith(sub.path + "/") &&
                                !item.children?.some(
                                  (other) =>
                                    other.path !== sub.path &&
                                    (pathname === other.path || pathname.startsWith(other.path + "/"))
                                ));
                            return (
                              <Link
                                key={sub.path}
                                href={sub.path}
                                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all duration-150 ${
                                  isSubActive
                                    ? "bg-primary/10 text-primary font-bold shadow-2xs"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60 font-medium"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isSubActive ? "bg-primary" : "bg-muted-foreground/50"
                                  }`}
                                />
                                <span className="truncate">{sub.title}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                // Trường hợp Menu đơn thông thường
                const isActive = pathname === item.path;
                return (
                  <Link
                    key={item.title}
                    href={item.path!}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                      isActive
                        ? "bg-primary/10 text-primary font-bold shadow-2xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                    } ${collapsed ? "justify-center px-0" : ""}`}
                    title={collapsed ? item.title : undefined}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                    {!collapsed && <span className="truncate">{item.title}</span>}
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
