"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  Building2,
  KeyRound,
} from "lucide-react";
import { useDashboardRole } from "@/components/dashboard/DashboardRoleContext";
import { getNavForRole } from "@/components/dashboard/dashboard-nav";
import { DASHBOARD_ROLE_LABEL, type DashboardRole } from "@/lib/dashboard-role";

interface DashboardSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

function isPathActive(pathname: string, path: string): boolean {
  if (pathname === path) return true;
  // Exact-ish: avoid /dashboard/contracts matching /dashboard/contracts/templates sibling wrongly
  // Prefer longest prefix among siblings is handled by callers for children.
  return pathname.startsWith(path + "/");
}

export default function DashboardSidebar({
  collapsed,
  onToggleCollapse,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const { role, selectRole, openRolePicker } = useDashboardRole();
  const navGroups = getNavForRole(role);

  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const group of navGroups) {
      for (const item of group.items) {
        if (item.children) {
          initial[item.title] = item.children.some((c) => isPathActive(pathname, c.path));
        }
      }
    }
    return initial;
  });

  useEffect(() => {
    for (const group of navGroups) {
      for (const item of group.items) {
        if (item.children) {
          const hasActiveChild = item.children.some((c) => isPathActive(pathname, c.path));
          if (hasActiveChild) {
            setOpenSubmenus((prev) => ({ ...prev, [item.title]: true }));
          }
        }
      }
    }
  }, [pathname, navGroups]);

  const toggleSubmenu = (title: string) => {
    setOpenSubmenus((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const switchRole = (next: DashboardRole) => {
    if (next === role) return;
    selectRole(next);
  };

  return (
    <aside
      className={`fixed top-20 left-0 z-40 h-[calc(100vh-5rem)] bg-card border-r border-border flex flex-col transition-all duration-300 select-none ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
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

      {/* Role toggle */}
      <div className={`shrink-0 border-b border-border/60 ${collapsed ? "p-2" : "p-3"}`}>
        {collapsed ? (
          <button
            type="button"
            onClick={openRolePicker}
            className="w-full flex items-center justify-center p-2.5 rounded-xl bg-primary/10 text-primary cursor-pointer"
            title={role ? DASHBOARD_ROLE_LABEL[role] : "Chọn vai trò"}
          >
            {role === "tenant" ? (
              <KeyRound className="w-4 h-4" />
            ) : (
              <Building2 className="w-4 h-4" />
            )}
          </button>
        ) : (
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-0.5">
              Vai trò
            </div>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-muted/70 border border-border">
              <button
                type="button"
                onClick={() => switchRole("landlord")}
                className={`flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  role === "landlord"
                    ? "bg-card text-primary shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Cho thuê</span>
              </button>
              <button
                type="button"
                onClick={() => switchRole("tenant")}
                className={`flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  role === "tenant"
                    ? "bg-card text-primary shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <KeyRound className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Đi thuê</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-5 no-scrollbar">
        {navGroups.map((group) => (
          <div key={group.groupTitle} className="space-y-1.5">
            {!collapsed ? (
              <div className="px-3.5 py-1 text-[11px] font-bold text-muted-foreground/70 uppercase tracking-wider">
                {group.groupTitle}
              </div>
            ) : (
              <div className="h-px bg-border/60 my-2" />
            )}

            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;

                if (item.children) {
                  const isAnyChildActive = item.children.some((c) =>
                    isPathActive(pathname, c.path)
                  );
                  const isOpen = !!openSubmenus[item.title];

                  if (collapsed) {
                    return (
                      <Link
                        key={item.title}
                        href={item.children[0].path}
                        className={`flex items-center justify-center p-2.5 rounded-xl transition-all duration-150 ${
                          isAnyChildActive
                            ? "bg-primary/10 text-primary font-bold shadow-2xs"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                        }`}
                        title={item.title}
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

                      {isOpen && (
                        <div className="pl-9 pr-1 space-y-1 pt-0.5 animate-in slide-in-from-top-1 duration-150">
                          {item.children.map((sub) => {
                            const siblings = item.children || [];
                            const isSubActive =
                              pathname === sub.path ||
                              (pathname.startsWith(sub.path + "/") &&
                                !siblings.some(
                                  (other) =>
                                    other.path !== sub.path &&
                                    other.path.length > sub.path.length &&
                                    (pathname === other.path ||
                                      pathname.startsWith(other.path + "/"))
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

                const isActive = item.path
                  ? pathname === item.path ||
                    (item.path !== "/dashboard/landlord" &&
                      item.path !== "/dashboard/tenant" &&
                      pathname.startsWith(item.path + "/"))
                  : false;

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
