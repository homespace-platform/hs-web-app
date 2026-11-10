"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Crown,
  FileText,
  PlusCircle,
  Calendar,
  Send,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import membershipService from "@/services/membership.service";
import MembershipStatusCard from "@/components/membership/MembershipStatusCard";
import type { MembershipView } from "@/types/membership.type";

export default function LandlordDashboardPage() {
  const { authenticated, profile } = useAuth();
  const [membership, setMembership] = useState<MembershipView | null>(null);
  const [loadingMembership, setLoadingMembership] = useState(false);

  const loadMembership = useCallback(async () => {
    if (!authenticated) return;
    setLoadingMembership(true);
    try {
      const me = await membershipService.getMyMembership();
      setMembership(me);
    } catch {
      // Keep null if offline
    } finally {
      setLoadingMembership(false);
    }
  }, [authenticated]);

  useEffect(() => {
    loadMembership();
  }, [loadMembership]);

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Dashboard chủ nhà
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Theo dõi gói hội viên, hạn mức lượt đăng tin, quản lý bài đăng và yêu cầu thuê nhà.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/membership"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-foreground hover:bg-muted transition-colors shadow-2xs"
          >
            <Crown className="h-4 w-4 text-primary" />
            <span>Gói hội viên & Bảng giá</span>
          </Link>
          <Link
            href="/dashboard/properties/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90 transition-all"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Đăng tin mới</span>
          </Link>
        </div>
      </div>

      {/* Membership & Quota Summary */}
      <MembershipStatusCard
        membership={membership}
        profile={profile}
        loading={loadingMembership}
        onRefresh={loadMembership}
      />

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/dashboard/properties"
          className="group rounded-2xl border border-border bg-card p-5 shadow-2xs hover:border-primary/40 hover:shadow-sm transition-all flex flex-col justify-between gap-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Quản lý tin đăng</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Xem danh sách tin đang hiển thị, tin nháp, chỉnh sửa hoặc đăng lại tin hết hạn.
            </p>
          </div>
        </Link>

        <Link
          href="/dashboard/viewing-schedules"
          className="group rounded-2xl border border-border bg-card p-5 shadow-2xs hover:border-primary/40 hover:shadow-sm transition-all flex flex-col justify-between gap-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <Calendar className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Lịch xem nhà</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Quản lý các lịch hẹn khách thuê đặt xem bất động sản của bạn.
            </p>
          </div>
        </Link>

        <Link
          href="/dashboard/rental-requests"
          className="group rounded-2xl border border-border bg-card p-5 shadow-2xs hover:border-primary/40 hover:shadow-sm transition-all flex flex-col justify-between gap-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <Send className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Yêu cầu thuê</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Duyệt hồ sơ thuê, đặt cọc giữ chỗ và khởi tạo hợp đồng thuê thông minh.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
