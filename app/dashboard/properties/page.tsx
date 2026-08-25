"use client";

import React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

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
        <Link
          href="/dashboard/properties/new"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Đăng tin mới
        </Link>
      </div>
    </div>
  );
}
