"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import Breadcrumb from "@/components/common/Breadcrumb";
import { BreadcrumbTitleProvider, useBreadcrumbTitleValue } from "@/components/common/BreadcrumbTitle";
import { buildDashboardTrail } from "./dashboard-breadcrumb";
import Header from "@/components/layout/Header";
import DashboardSidebar from "./DashboardSidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BreadcrumbTitleProvider>
      <DashboardFrame>{children}</DashboardFrame>
    </BreadcrumbTitleProvider>
  );
}

function DashboardFrame({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const breadcrumbTitle = useBreadcrumbTitleValue();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors">
      {/* 1. Global Common Header */}
      <Header />

      {/* 2. Dashboard Body under Header (pt-20) */}
      <div className="flex-1 flex pt-20">
        {/* Left Sidebar */}
        <DashboardSidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
        {mobileOpen && <button type="button" aria-label="Đóng menu quản lý" onClick={() => setMobileOpen(false)} className="fixed inset-x-0 bottom-0 top-[calc(5rem+var(--hs-banner-h,0px))] z-30 bg-black/30 md:hidden" />}

        {/* Main Content Area */}
        <div
          className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
            collapsed ? "md:ml-20" : "md:ml-64"
          }`}
        >
          {/* Page Content Container with Breadcrumbs */}
          <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-slate-50/50 dark:bg-background overflow-x-hidden space-y-4">
            <button type="button" aria-expanded={mobileOpen} onClick={() => { setCollapsed(false); setMobileOpen(true); }} className="inline-flex h-10 items-center gap-2 rounded-xl border bg-card px-3 text-sm font-semibold md:hidden"><Menu className="size-4" />Menu quản lý</button>
            {/* Dynamic Breadcrumbs */}
            <Breadcrumb items={buildDashboardTrail(pathname, breadcrumbTitle)} />

            {/* Page Body */}
            <main className="min-h-[70vh]">{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}
