"use client";

import React, { useState } from "react";
import { FileCheck, Edit3, Check, Loader2 } from "lucide-react";
import { FieldRow } from "./utils";
import type { PolicySnapshot } from "@/types/contract.type";

interface ContractPoliciesSectionProps {
  policies?: (PolicySnapshot | Record<string, unknown>) | null;
  specialTerms?: string | null;
  isDraft: boolean;
  isLandlord: boolean;
  onSaveSpecialTerms?: (terms: string) => Promise<void>;
}

export default function ContractPoliciesSection({
  policies,
  specialTerms,
  isDraft,
  isLandlord,
  onSaveSpecialTerms,
}: ContractPoliciesSectionProps) {
  const [editing, setEditing] = useState(false);
  const [termText, setTermText] = useState(specialTerms || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!onSaveSpecialTerms) return;
    setSaving(true);
    try {
      await onSaveSpecialTerms(termText.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  const p = policies || {};
  const noticeDays = p.noticeDaysBeforeTermination ?? 30;
  const latePaymentPenaltyDays = p.latePaymentPenaltyDays ?? 5;
  const depositRefundDays = p.depositRefundDays ?? 15;
  const sublettingAllowed = p.sublettingAllowed === true;
  const petsAllowed = p.petsAllowed === true;
  const smokingAllowed = p.smokingAllowed === true;

  return (
    <section className="rounded-2xl border border-border bg-card p-4.5 space-y-4 shadow-2xs">
      <div className="flex items-center justify-between border-b border-border/70 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <FileCheck className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-foreground">
            Chính sách vận hành và điều khoản thỏa thuận bổ sung
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0.5">
        <FieldRow
          label="Thời hạn báo trước khi chấm dứt"
          value={`Tối thiểu ${noticeDays} ngày`}
        />
        <FieldRow
          label="Thời gian ân hạn thanh toán chậm"
          value={`${latePaymentPenaltyDays} ngày`}
        />
        <FieldRow
          label="Thời hạn hoàn trả tiền đặt cọc"
          value={`Trong vòng ${depositRefundDays} ngày sau khi bàn giao`}
        />
        <FieldRow
          label="Cho thuê lại (Subletting)"
          value={sublettingAllowed ? "Được phép (kèm thỏa thuận)" : "Tuyệt đối không được phép"}
        />
        <FieldRow
          label="Quy định nuôi thú cưng"
          value={petsAllowed ? "Được phép tuân theo nội quy" : "Không nuôi thú cưng"}
        />
        <FieldRow
          label="Quy định hút thuốc trong nhà"
          value={smokingAllowed ? "Khu vực cho phép" : "Nghiêm cấm hút thuốc"}
        />
      </div>

      {/* SPECIAL TERMS */}
      <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Điều khoản thỏa thuận riêng (Special Terms)
          </h4>
          {isDraft && isLandlord && !editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <Edit3 className="w-3 h-3" />
              Chỉnh sửa
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-2">
            <textarea
              rows={3}
              value={termText}
              onChange={(e) => setTermText(e.target.value)}
              placeholder="Nhập các điều khoản thỏa thuận bổ sung đã thống nhất giữa hai bên..."
              className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setTermText(specialTerms || "");
                  setEditing(false);
                }}
                className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Lưu điều khoản
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-foreground leading-relaxed">
            {specialTerms ? (
              specialTerms
            ) : (
              <span className="text-muted-foreground italic">
                Không có điều khoản đặc biệt bổ sung ngoài quy định tiêu chuẩn.
              </span>
            )}
          </p>
        )}
      </div>
    </section>
  );
}
