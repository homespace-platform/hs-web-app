"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import Header from "@/components/layout/Header";
import DashboardSidebar from "./DashboardSidebar";

interface BreadcrumbItem {
  parent?: { title: string; path?: string };
  title: string;
}

const BREADCRUMB_MAP: Record<string, BreadcrumbItem> = {
  "/dashboard": { title: "Dashboard" },
  "/dashboard/analytics": {
    parent: { title: "Tổng quan", path: "/dashboard" },
    title: "Phân tích & Báo cáo",
  },
  "/dashboard/customers": {
    parent: { title: "Quản lý", path: "/dashboard/properties" },
    title: "Khách hàng",
  },
  "/dashboard/properties": {
    parent: { title: "Quản lý", path: "/dashboard/properties" },
    title: "Tin đăng",
  },
  "/dashboard/rental-requests": {
    parent: { title: "Quản lý", path: "/dashboard/properties" },
    title: "Yêu cầu thuê",
  },
  "/dashboard/contracts": {
    parent: { title: "Quản lý", path: "/dashboard/properties" },
    title: "Hợp đồng",
  },
  "/dashboard/viewing-schedules": {
    parent: { title: "Quản lý", path: "/dashboard/properties" },
    title: "Lịch xem nhà",
  },
  "/dashboard/deposit": {
    parent: { title: "Tài chính", path: "/dashboard/deposit" },
    title: "Nạp tiền",
  },
  "/dashboard/withdraw": {
    parent: { title: "Tài chính", path: "/dashboard/withdraw" },
    title: "Rút tiền",
  },
  "/dashboard/transactions": {
    parent: { title: "Tài chính", path: "/dashboard/transactions" },
    title: "Lịch sử giao dịch",
  },
  "/dashboard/payments": {
    parent: { title: "Tài chính", path: "/dashboard/payments" },
    title: "Thanh toán",
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const currentBreadcrumb = BREADCRUMB_MAP[pathname] || {
    title: "Dashboard",
  };

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
        />

        {/* Main Content Area */}
        <div
          className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
            collapsed ? "ml-20" : "ml-64"
          }`}
        >
          {/* Page Content Container with Breadcrumbs */}
          <div className="flex-1 p-6 lg:p-8 bg-slate-50/50 dark:bg-background overflow-x-hidden space-y-4">
            {/* Dynamic Breadcrumbs */}
            <nav className="flex items-center gap-2 text-xs font-semibold select-none">
              {currentBreadcrumb.parent ? (
                <>
                  {currentBreadcrumb.parent.path ? (
                    <Link
                      href={currentBreadcrumb.parent.path}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {currentBreadcrumb.parent.title}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">
                      {currentBreadcrumb.parent.title}
                    </span>
                  )}
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
                  <span className="text-foreground font-bold">
                    {currentBreadcrumb.title}
                  </span>
                </>
              ) : (
                <span className="text-foreground font-bold">
                  {currentBreadcrumb.title}
                </span>
              )}
            </nav>

            {/* Page Body */}
            <main className="min-h-[70vh]">{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}
