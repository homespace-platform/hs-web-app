"use client";

import React, { useEffect, useState } from "react";
import { FileCheck, Edit3, Check, Loader2 } from "lucide-react";
import { FieldRow } from "./utils";
import type { PolicySnapshot } from "@/types/contract.type";

const formatVnd = (amount: number) => `${amount.toLocaleString("vi-VN")} đ`;

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
  const [feeError, setFeeError] = useState("");

  useEffect(() => {
    setFeeMode((policies?.latePaymentFeeMode as PolicySnapshot["latePaymentFeeMode"]) || "NONE");
    setFeeAmount(String(policies?.latePaymentFeeAmount ?? ""));
  }, [policies]);

  function resetFeeForm() {
    setFeeMode((policies?.latePaymentFeeMode as PolicySnapshot["latePaymentFeeMode"]) || "NONE");
    setFeeAmount(String(policies?.latePaymentFeeAmount ?? ""));
    setFeeError("");
  }

  async function saveFee() {
    if (!onSaveLateFee) return;
    const amount = Number(feeAmount);
    if (feeMode !== "NONE" && (!Number.isSafeInteger(amount) || amount <= 0 || amount > 1_000_000_000)) {
      setFeeError("Nhập mức phạt là số tiền nguyên dương, tối đa 1 tỷ đồng.");
      return;
    }
    setFeeError("");
    setSaving(true);
    try {
      await onSaveLateFee({ latePaymentFeeMode: feeMode,
        latePaymentFeeAmount: feeMode === "NONE" ? 0 : amount,
        latePaymentFeeGraceDays: 0,
        latePaymentFeeCap: null });
      setEditingFee(false);
    } catch {
      setFeeError("Không thể lưu phí phạt. Vui lòng kiểm tra thông báo lỗi và thử lại.");
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
  const savedFeeAmount = Number(p.latePaymentFeeAmount || 0);
  const savedGraceDays = Number(p.latePaymentFeeGraceDays || 0);
  const savedFeeCap = Number(p.latePaymentFeeCap || 0);
  const draftFeeAmount = Number(feeAmount);
  const feeAfterDays = (lateDays: number) => {
    const chargeableDays = Math.max(0, lateDays - savedGraceDays);
    const fee = lateMode === "FIXED_PER_DAY" ? savedFeeAmount * chargeableDays
      : chargeableDays > 0 ? savedFeeAmount : 0;
    return savedFeeCap > 0 ? Math.min(fee, savedFeeCap) : fee;
  };
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
          {isDraft && isLandlord && !editingFee && <button type="button" onClick={() => { resetFeeForm(); setEditingFee(true); }}
            className="text-xs font-semibold text-primary hover:underline">{lateMode === "NONE" ? "Thiết lập phí" : "Chỉnh sửa"}</button>}
        </div>
        {editingFee ? <div className="grid gap-3 text-xs">
          <label>Cách tính phí
            <select value={feeMode} onChange={(e) => setFeeMode(e.target.value as typeof feeMode)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2">
              <option value="NONE">Không phạt</option>
              <option value="FIXED_ONCE">Phạt một lần sau hạn</option>
              <option value="FIXED_PER_DAY">Phạt cho mỗi ngày trễ</option>
            </select>
          </label>
          {feeMode !== "NONE" && <label>Mức phạt (đ)
            <input type="text" inputMode="numeric" value={feeAmount ? Number(feeAmount).toLocaleString("vi-VN") : ""}
              onChange={(e) => { setFeeAmount(e.target.value.replace(/\D/g, "")); setFeeError(""); }}
              placeholder={feeMode === "FIXED_PER_DAY" ? "Ví dụ: 100.000 đ/ngày" : "Ví dụ: 100.000 đ/lần"}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2" />
          </label>}
          <p className="text-muted-foreground">{feeMode === "FIXED_PER_DAY" && draftFeeAmount > 0
            ? `Trễ 1 ngày: ${formatVnd(draftFeeAmount)} · Trễ 5 ngày: ${formatVnd(draftFeeAmount * 5)}.`
            : feeMode === "FIXED_ONCE" && draftFeeAmount > 0 ? `Trễ 1 hay nhiều ngày: chỉ phạt một lần ${formatVnd(draftFeeAmount)}.`
            : feeMode !== "NONE" ? "Nhập mức tiền để xem ví dụ tính phí."
            : "Không cộng phí chậm thanh toán vào hóa đơn."}</p>
          {feeError && <p className="text-rose-600">{feeError}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" disabled={saving} onClick={() => { resetFeeForm(); setEditingFee(false); }} className="rounded-lg border border-border px-3 py-2">Hủy</button>
            <button type="button" disabled={saving} onClick={() => void saveFee()} className="rounded-lg bg-primary px-3 py-2 font-semibold text-primary-foreground inline-flex items-center gap-1">
              {saving && <Loader2 className="h-3 w-3 animate-spin" />}Lưu phí phạt
            </button>
          </div>
        </div> : lateMode === "NONE" ? (
          <p className="text-xs text-muted-foreground">Không áp dụng phí phạt đóng trễ cho hợp đồng này.</p>
        ) : (
          <div className="space-y-2.5 text-xs">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <strong className="text-lg font-bold text-foreground">{formatVnd(savedFeeAmount)}</strong>
              <span className="font-semibold text-foreground">{lateMode === "FIXED_PER_DAY" ? "/ mỗi ngày trễ" : "/ một lần duy nhất"}</span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">{isDraft ? "Đã lưu trong bản nháp" : "Điều khoản đã chốt"}</span>
            </div>
            <p className="text-foreground">Trễ 1 ngày: {formatVnd(feeAfterDays(1))} · Trễ 5 ngày: {formatVnd(feeAfterDays(5))}.</p>
            <p className="text-muted-foreground">Bắt đầu tính {savedGraceDays > 0
              ? `sau ${savedGraceDays} ngày ân hạn kể từ hạn thanh toán ghi trên hóa đơn`
              : "từ ngày đầu tiên sau hạn thanh toán ghi trên hóa đơn"}. Sau 5 ngày quá hạn, hệ thống nhắc chủ nhà quyết định hướng xử lý.</p>
            {savedFeeCap > 0 && <p className="text-muted-foreground">Mức phạt tối đa của điều khoản cũ: {formatVnd(savedFeeCap)}.</p>}
            {isDraft && <p className="font-medium text-amber-700">Hãy kết xuất lại hợp đồng để điều khoản này xuất hiện trong bản ký.</p>}
          </div>
        )}
      </div>

      {/* SPECIAL TERMS */}
      <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Điều khoản thỏa thuận khác
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
            <p className="text-xs text-muted-foreground">Chỉ nhập thỏa thuận khác giữa hai bên; phí phạt đóng trễ đã được quản lý riêng ở mục phía trên.</p>
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
