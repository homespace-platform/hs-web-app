"use client";

import React, { useEffect, useState } from "react";
import { FileCheck, Edit3, Check, Loader2 } from "lucide-react";
import { FieldRow } from "./utils";
import type { PolicySnapshot } from "@/types/contract.type";

interface ContractPoliciesSectionProps {
  policies?: (PolicySnapshot | Record<string, unknown>) | null;
  specialTerms?: string | null;
  isDraft: boolean;
  isLandlord: boolean;
  onSaveSpecialTerms?: (terms: string) => Promise<void>;
  onSaveLateFee?: (policy: Pick<PolicySnapshot, "latePaymentFeeMode" | "latePaymentFeeAmount" | "latePaymentFeeGraceDays" | "latePaymentFeeCap">) => Promise<void>;
}

export default function ContractPoliciesSection({
  policies,
  specialTerms,
  isDraft,
  isLandlord,
  onSaveSpecialTerms,
  onSaveLateFee,
}: ContractPoliciesSectionProps) {
  const [editing, setEditing] = useState(false);
  const [termText, setTermText] = useState(specialTerms || "");
  const [saving, setSaving] = useState(false);
  const [editingFee, setEditingFee] = useState(false);
  const [feeMode, setFeeMode] = useState<NonNullable<PolicySnapshot["latePaymentFeeMode"]>>("NONE");
  const [feeAmount, setFeeAmount] = useState("");
  const [feeGrace, setFeeGrace] = useState("0");
  const [feeCap, setFeeCap] = useState("");
  const [feeError, setFeeError] = useState("");

  useEffect(() => {
    setFeeMode((policies?.latePaymentFeeMode as PolicySnapshot["latePaymentFeeMode"]) || "NONE");
    setFeeAmount(String(policies?.latePaymentFeeAmount ?? ""));
    setFeeGrace(String(policies?.latePaymentFeeGraceDays ?? 0));
    setFeeCap(String(policies?.latePaymentFeeCap ?? ""));
  }, [policies]);

  async function saveFee() {
    if (!onSaveLateFee) return;
    const amount = Number(feeAmount);
    const grace = Number(feeGrace);
    const cap = feeCap.trim() ? Number(feeCap) : null;
    if (feeMode !== "NONE" && (!Number.isSafeInteger(amount) || amount <= 0 || amount > 1_000_000_000
        || !Number.isInteger(grace) || grace < 0 || grace > 30
        || (cap !== null && (!Number.isSafeInteger(cap) || cap < amount || cap > 10_000_000_000)))) {
      setFeeError("Nhập số tiền nguyên dương, số ngày miễn phạt từ 0–30; mức trần (nếu có) không nhỏ hơn phí một lần.");
      return;
    }
    setFeeError("");
    setSaving(true);
    try {
      await onSaveLateFee({ latePaymentFeeMode: feeMode,
        latePaymentFeeAmount: feeMode === "NONE" ? 0 : amount,
        latePaymentFeeGraceDays: feeMode === "NONE" ? 0 : grace,
        latePaymentFeeCap: feeMode === "NONE" ? null : cap });
      setEditingFee(false);
    } finally { setSaving(false); }
  }

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
  const lateMode = p.latePaymentFeeMode || "NONE";
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
          label="Phí chậm thanh toán"
          value={lateMode === "NONE" ? "Không áp dụng" : `${lateMode === "FIXED_PER_DAY" ? "Mỗi ngày" : "Một lần"}: ${Number(p.latePaymentFeeAmount || 0).toLocaleString("vi-VN")} đ (sau ${p.latePaymentFeeGraceDays ?? 0} ngày miễn phạt)`}
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

      <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-bold uppercase tracking-wider">Phí phạt đóng trễ</h4>
          {isDraft && isLandlord && !editingFee && <button type="button" onClick={() => setEditingFee(true)}
            className="text-xs font-semibold text-primary hover:underline">Chỉnh sửa</button>}
        </div>
        <p className="text-xs text-muted-foreground">Phí được ghi vào điều khoản hợp đồng trước khi ký. Hóa đơn quá hạn sẽ hiện riêng khoản phạt; không tự áp dụng cho hợp đồng cũ.</p>
        {editingFee ? <div className="grid gap-3 sm:grid-cols-2 text-xs">
          <label>Hình thức
            <select value={feeMode} onChange={(e) => setFeeMode(e.target.value as typeof feeMode)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2">
              <option value="NONE">Không phạt</option>
              <option value="FIXED_ONCE">Phạt cố định một lần</option>
              <option value="FIXED_PER_DAY">Phạt cố định mỗi ngày trễ</option>
            </select>
          </label>
          {feeMode !== "NONE" && <>
            <label>Số tiền (đ)<input type="number" min="1" step="1" value={feeAmount} onChange={(e) => setFeeAmount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" /></label>
            <label>Miễn phạt sau hạn (ngày)<input type="number" min="0" max="30" step="1" value={feeGrace} onChange={(e) => setFeeGrace(e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" /></label>
            <label>Mức phạt tối đa (đ, tùy chọn)<input type="number" min="1" step="1" value={feeCap} onChange={(e) => setFeeCap(e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" /></label>
          </>}
          {feeError && <p className="sm:col-span-2 text-rose-600">{feeError}</p>}
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button type="button" disabled={saving} onClick={() => setEditingFee(false)} className="rounded-lg border border-border px-3 py-2">Hủy</button>
            <button type="button" disabled={saving} onClick={() => void saveFee()} className="rounded-lg bg-primary px-3 py-2 font-semibold text-primary-foreground">Lưu phí phạt</button>
          </div>
        </div> : lateMode !== "NONE" && <p className="text-xs">Mức trần: {p.latePaymentFeeCap ? `${Number(p.latePaymentFeeCap).toLocaleString("vi-VN")} đ` : "Không đặt"}.</p>}
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
