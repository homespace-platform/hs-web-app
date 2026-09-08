"use client";

import React from "react";
import { Building2, KeyRound, X } from "lucide-react";
import { useDashboardRole } from "@/components/dashboard/DashboardRoleContext";
import type { DashboardRole } from "@/lib/dashboard-role";
import { Button } from "@/components/ui/button";

const OPTIONS: {
  role: DashboardRole;
  title: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    role: "landlord",
    title: "Người cho thuê",
    description: "Quản lý tin đăng, lịch tiếp khách, yêu cầu thuê và mẫu hợp đồng.",
    icon: Building2,
  },
  {
    role: "tenant",
    title: "Người đi thuê",
    description: "Theo dõi lịch đi xem, yêu cầu đã gửi và các hợp đồng liên quan.",
    icon: KeyRound,
  },
];

export default function DashboardRolePickerModal() {
  const { isRolePickerOpen, closeRolePicker, selectRole } = useDashboardRole();

  if (!isRolePickerOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-role-title"
        className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl p-5 sm:p-6 space-y-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 id="dashboard-role-title" className="text-lg font-bold tracking-tight">
              Bạn muốn vào bảng điều khiển với vai trò nào?
            </h2>
            <p className="text-xs text-muted-foreground">
              Có thể đổi lại bất cứ lúc nào bằng nút chuyển vai trò trên thanh bên.
            </p>
          </div>
          <button
            type="button"
            onClick={closeRolePicker}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid gap-2.5">
          {OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.role}
                type="button"
                onClick={() => selectRole(opt.role)}
                className="flex items-start gap-3.5 p-4 rounded-2xl border border-border bg-background hover:border-primary/40 hover:bg-primary/5 text-left transition-all cursor-pointer group"
              >
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="text-sm font-bold text-foreground">{opt.title}</div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {opt.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={closeRolePicker}>
            Để sau
          </Button>
        </div>
      </div>
    </div>
  );
}
