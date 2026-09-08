"use client";

import React, { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDashboardRole } from "@/components/dashboard/DashboardRoleContext";
import { DASHBOARD_ROLE_HOME } from "@/lib/dashboard-role";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function DashboardEntryInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { role, hydrated, openRolePicker, isRolePickerOpen } = useDashboardRole();
  const forceChoose = searchParams.get("choose") === "1";

  useEffect(() => {
    if (!hydrated) return;

    if (forceChoose || !role) {
      openRolePicker();
      return;
    }

    router.replace(DASHBOARD_ROLE_HOME[role]);
  }, [hydrated, role, forceChoose, openRolePicker, router]);

  if (!hydrated || isRolePickerOpen || (role && !forceChoose)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Đang mở bảng điều khiển…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
      <div className="space-y-1">
        <h1 className="text-lg font-bold">Chọn vai trò để tiếp tục</h1>
        <p className="text-xs text-muted-foreground max-w-sm">
          Bảng điều khiển hiển thị khác nhau cho người cho thuê và người đi thuê.
        </p>
      </div>
      <Button type="button" onClick={openRolePicker}>
        Chọn vai trò
      </Button>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Đang tải…
        </div>
      }
    >
      <DashboardEntryInner />
    </Suspense>
  );
}
