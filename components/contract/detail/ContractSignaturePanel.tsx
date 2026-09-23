"use client";

import React, { useState } from "react";
import {
  PenLine,
  Send,
  Loader2,
  CheckCircle2,
  FileCheck,
} from "lucide-react";
import type { ContractResponse } from "@/types/contract.type";
import { str } from "./utils";

interface ContractSignaturePanelProps {
  contract: ContractResponse;
  isLandlord: boolean;
  isTenant: boolean;
  canSend: boolean;
  sending: boolean;
  signing: boolean;
  onSend: () => Promise<void>;
  onSign: () => Promise<void>;
}

export default function ContractSignaturePanel({
  contract,
  isLandlord,
  isTenant,
  canSend,
  sending,
  signing,
  onSend,
  onSign,
}: ContractSignaturePanelProps) {
  const [agreedLandlord, setAgreedLandlord] = useState(false);
  const [agreedTenant, setAgreedTenant] = useState(false);

  const isDraft = contract.status === "DRAFT";
  const isPending = contract.status === "PENDING_REVIEW";
  const isActive = contract.status === "ACTIVE";

  // CASE 1: ACTIVE CONTRACT
  if (isActive) {
    return (
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/30 p-5 space-y-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
              Hợp đồng giao kết thành công và đang có hiệu lực
            </h3>
            <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80">
              Hai bên đã hoàn tất xác nhận thỏa thuận trên nền tảng HomeSpace
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs border-t border-emerald-200/80 dark:border-emerald-900/40">
          <div>
            <span className="text-muted-foreground block text-[11px]">
              Xác nhận Bên A (Chủ nhà):
            </span>
            <span className="font-semibold text-foreground">
              {contract.landlordConfirmedAt
                ? str(contract.landlordConfirmedAt)
                : "Đã xác nhận nội dung"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">
              Xác nhận Bên B (Người thuê):
            </span>
            <span className="font-semibold text-foreground">
              {contract.signedAt ? str(contract.signedAt) : "Đã xác nhận ký"}
            </span>
          </div>
        </div>
      </section>
    );
  }

  // Internal confirmation mode. SmartCA has its own server-driven panel.

  // 3A. LANDLORD FLOW (IN DRAFT)
  if (isLandlord && isDraft) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
            <FileCheck className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">
              Xác nhận gửi bản hợp đồng cho người thuê
            </h3>
            <p className="text-xs text-muted-foreground">
              Vui lòng rà soát kỹ các điều khoản và bản xem trước trước khi gửi. Sau khi gửi, bản hợp đồng sẽ được chuyển sang trạng thái chờ người thuê xác nhận ký.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-3">
          <label className="flex items-start gap-3 text-xs text-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreedLandlord}
              onChange={(e) => setAgreedLandlord(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-input accent-primary cursor-pointer"
            />
            <span className="font-medium leading-relaxed">
              Tôi xác nhận nội dung hợp đồng và đồng ý gửi bản này cho người thuê.
            </span>
          </label>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border/70">
            <span className="text-[11px] text-muted-foreground">
              Chế độ xác nhận hợp đồng nội bộ HomeSpace
            </span>
            <button
              type="button"
              disabled={!agreedLandlord || !canSend || sending}
              onClick={onSend}
              title={
                !canSend
                  ? "Bổ sung đủ dữ liệu và kết xuất file xem trước trước khi gửi"
                  : !agreedLandlord
                    ? "Vui lòng tích chọn đồng ý trước khi gửi"
                    : undefined
              }
              className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {sending ? "Đang gửi..." : "Xác nhận và gửi người thuê"}
            </button>
          </div>
        </div>
      </section>
    );
  }

  // 3B. TENANT FLOW (IN PENDING_REVIEW)
  if (isTenant && isPending) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
            <PenLine className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">
                Xác nhận ký hợp đồng thuê
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
                Chế độ xác nhận hợp đồng nội bộ - chưa tích hợp chữ ký số.
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Bạn đã hoàn tất thanh toán ban đầu. Vui lòng tải/xem lại văn bản hợp đồng trước khi xác nhận chấp thuận.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-3">
          <label className="flex items-start gap-3 text-xs text-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreedTenant}
              onChange={(e) => setAgreedTenant(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-input accent-primary cursor-pointer"
            />
            <span className="font-medium leading-relaxed">
              Tôi đã đọc và đồng ý với toàn bộ nội dung hợp đồng và các phụ lục.
            </span>
          </label>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border/70">
            <span className="text-[11px] text-muted-foreground">
              Việc bấm xác nhận có giá trị xác lập quan hệ thuê nhà chính thức giữa hai bên.
            </span>
            <button
              type="button"
              disabled={!agreedTenant || signing}
              onClick={onSign}
              title={
                !agreedTenant
                  ? "Vui lòng đọc và tích chọn đồng ý trước khi ký"
                  : undefined
              }
              className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer inline-flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {signing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <PenLine className="w-4 h-4" />
              )}
              {signing ? "Đang ký hợp đồng..." : "Xác nhận ký hợp đồng"}
            </button>
          </div>
        </div>
      </section>
    );
  }

  // 3C. LANDLORD IN PENDING_REVIEW WAITING FOR TENANT
  if (isLandlord && isPending) {
    return (
      <section className="rounded-2xl border border-sky-200 bg-sky-50/40 dark:border-sky-900 dark:bg-sky-950/20 p-4 flex items-start gap-3">
        <Send className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold text-sky-950 dark:text-sky-200">
            Đã gửi hợp đồng cho người thuê
          </p>
          <p className="text-sky-900/80 dark:text-sky-300/80">
            {contract.landlordConfirmedAt && (
              <>Bạn đã xác nhận lúc {str(contract.landlordConfirmedAt)}. </>
            )}
            Đang chờ người thuê rà soát văn bản và hoàn tất xác nhận ký hợp đồng.
          </p>
        </div>
      </section>
    );
  }

  return null;
}
