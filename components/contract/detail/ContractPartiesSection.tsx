"use client";

import React from "react";
import { User, Users, ShieldCheck, Lock } from "lucide-react";
import { FieldRow } from "./utils";

interface ContractPartiesSectionProps {
  landlord: Record<string, unknown>;
  tenant: Record<string, unknown>;
}

export default function ContractPartiesSection({
  landlord,
  tenant,
}: ContractPartiesSectionProps) {
  const occupantCount = tenant.occupantCount;
  const motorbikeCount = tenant.motorbikeCount;
  const carCount = tenant.carCount;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Chủ thể giao kết hợp đồng
        </h3>
        <span className="text-[11px] font-medium text-muted-foreground inline-flex items-center gap-1">
          <Lock className="w-3 h-3" />
          Dữ liệu khóa từ hồ sơ & yêu cầu thuê đã thanh toán
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* BÊN CHO THUÊ (BÊN A) */}
        <section className="rounded-2xl border border-border bg-card p-4.5 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between border-b border-border/70 pb-2 mb-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <User className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Bên A — Bên cho thuê
              </h4>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground">
              Chủ nhà
            </span>
          </div>

          <div className="space-y-0.5">
            <FieldRow label="Họ và tên" value={landlord.fullName} highlight />
            <FieldRow label="Số CCCD / Định danh" value={landlord.idNumber} />
            <FieldRow label="Nơi thường trú" value={landlord.permanentAddress} />
            <FieldRow label="Số điện thoại" value={landlord.phone} />
            <FieldRow label="Email liên hệ" value={landlord.email} />
          </div>
        </section>

        {/* BÊN THUÊ (BÊN B) */}
        <section className="rounded-2xl border border-border bg-card p-4.5 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between border-b border-border/70 pb-2 mb-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Bên B — Bên thuê
              </h4>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              Người thuê
            </span>
          </div>

          <div className="space-y-0.5">
            <FieldRow label="Họ và tên" value={tenant.fullName} highlight />
            <FieldRow label="Số CCCD / Định danh" value={tenant.idNumber} />
            <FieldRow label="Nơi thường trú" value={tenant.permanentAddress} />
            <FieldRow label="Số điện thoại" value={tenant.phone} />
            <FieldRow label="Email liên hệ" value={tenant.email} />
            <FieldRow
              label="Số người ở chính thức"
              value={occupantCount ? `${occupantCount} người` : undefined}
            />
            <FieldRow
              label="Xe máy đăng ký"
              value={
                motorbikeCount != null && Number(motorbikeCount) > 0
                  ? `${motorbikeCount} xe`
                  : "Không đăng ký xe máy"
              }
            />
            <FieldRow
              label="Ô tô đăng ký"
              value={
                carCount != null && Number(carCount) > 0
                  ? `${carCount} xe`
                  : "Không đăng ký ô tô"
              }
            />
          </div>
        </section>
      </div>
    </div>
  );
}
