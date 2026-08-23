"use client";

import React from "react";

export default function PropertiesPage() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Tin đăng
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Quản lý toàn bộ danh sách tin cho thuê nhà và phòng của bạn.
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border p-8 text-center text-muted-foreground shadow-2xs">
        <p className="text-sm font-semibold">Chưa có tin đăng nào.</p>
      </div>
    </div>
  );
}
