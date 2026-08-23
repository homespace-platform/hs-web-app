"use client";

import React from "react";

export default function DashboardPage() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Tổng quan các hoạt động và chỉ số quan trọng của bạn.
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border p-8 text-center text-muted-foreground shadow-2xs">
        <p className="text-sm font-semibold">Nội dung trang Dashboard đang được xây dựng...</p>
      </div>
    </div>
  );
}
