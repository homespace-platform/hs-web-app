"use client";

import React from "react";

export default function ViewingSchedulesPage() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Lịch xem nhà
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Quản lý lịch hẹn xem nhà trực tiếp và lịch xem phòng trực tuyến.
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border p-8 text-center text-muted-foreground shadow-2xs">
        <p className="text-sm font-semibold">Chưa có lịch hẹn xem nhà nào.</p>
      </div>
    </div>
  );
}
