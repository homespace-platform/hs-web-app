"use client";

import React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  AlertTriangle,
  FileText,
  Sparkles,
  CheckCircle2,
  X,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { getTierLabel } from "@/lib/membership";
import type { MembershipView } from "@/types/membership.type";

interface InsufficientQuotaModalProps {
  isOpen: boolean;
  membership?: MembershipView | null;
  context?: "editor" | "republish";
  listingTitle?: string;
  isSavingDraft?: boolean;
  onSaveDraftOnly?: () => void;
  onSaveDraftAndBuyPlan?: () => void;
  onClose: () => void;
}

export default function InsufficientQuotaModal({
  isOpen,
  membership,
  context = "editor",
  listingTitle,
  isSavingDraft = false,
  onSaveDraftOnly,
  onSaveDraftAndBuyPlan,
  onClose,
}: InsufficientQuotaModalProps) {
  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in-50"
      onClick={() => {
        if (!isSavingDraft) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="insufficient-quota-title"
        className="w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border bg-amber-50/70 dark:bg-amber-950/30 px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-xs">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h3
                id="insufficient-quota-title"
                className="text-base sm:text-lg font-extrabold text-foreground"
              >
                Không đủ lượt đăng tin khả dụng
              </h3>
              <p className="text-xs text-muted-foreground">
                Gói hiện tại: <strong className="text-foreground">{getTierLabel(membership?.tier)}</strong> • Còn{" "}
                <strong className="text-rose-600 dark:text-rose-400">
                  {membership?.remainingUses ?? 0} lượt
                </strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isSavingDraft}
            onClick={onClose}
            className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {context === "editor" ? (
            <>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 dark:border-emerald-800/60 dark:bg-emerald-950/30 p-4 text-xs text-emerald-950 dark:text-emerald-200 flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                <div className="space-y-1 leading-relaxed">
                  <p className="font-bold">
                    Bản nháp và dữ liệu bạn vừa nhập vẫn được giữ nguyên!
                  </p>
                  <p>
                    Việc <strong>Lưu tin nháp</strong> và <strong>Chỉnh sửa tin</strong> là hoàn toàn miễn phí.
                    Bạn có thể lưu bài đăng này dưới dạng tin nháp ngay bây giờ để không mất dữ liệu, sau đó mua hoặc nâng cấp gói hội viên để gửi duyệt.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-muted/30 p-4 text-xs space-y-1.5 text-muted-foreground">
                <p className="font-bold text-foreground">Các gói đăng tin linh hoạt (30 ngày):</p>
                <ul className="space-y-1">
                  <li>• <strong>Starter:</strong> 10 lượt đăng / 30 ngày — 49.000 ₫</li>
                  <li>• <strong>Pro:</strong> 30 lượt đăng / 30 ngày — 129.000 ₫</li>
                  <li>• <strong>Business:</strong> 100 lượt đăng / 30 ngày — 349.000 ₫</li>
                </ul>
              </div>
            </>
          ) : (
            <div className="space-y-3 text-xs leading-relaxed text-muted-foreground">
              {listingTitle && (
                <div className="rounded-xl border border-border bg-muted/40 p-3 font-semibold text-foreground line-clamp-2">
                  &quot;{listingTitle}&quot;
                </div>
              )}
              <p>
                Thao tác đăng lại hoặc gửi duyệt lại tin đăng yêu cầu <strong>1 lượt đăng tin khả dụng</strong>.
                Hiện tại tài khoản của bạn đã hết lượt đăng trong gói.
              </p>
              <p className="rounded-xl border border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-950/30 p-3 text-emerald-900 dark:text-emerald-200">
                Tin đăng của bạn vẫn được lưu an toàn. Hãy mua hoặc nâng cấp gói hội viên để tiếp tục đăng lại bài đăng này.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 border-t border-border bg-muted/20 px-6 py-4">
          <button
            type="button"
            disabled={isSavingDraft}
            onClick={onClose}
            className="h-10 rounded-xl border border-border bg-card px-4 text-xs font-bold text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            {context === "editor" ? "Ở lại chỉnh sửa tiếp" : "Đóng"}
          </button>

          {context === "editor" && onSaveDraftOnly && (
            <button
              type="button"
              disabled={isSavingDraft}
              onClick={onSaveDraftOnly}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-4 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-60 cursor-pointer"
            >
              {isSavingDraft ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileText className="h-3.5 w-3.5" />
              )}
              <span>Chỉ lưu tin nháp (Miễn phí)</span>
            </button>
          )}

          {context === "editor" && onSaveDraftAndBuyPlan ? (
            <button
              type="button"
              disabled={isSavingDraft}
              onClick={onSaveDraftAndBuyPlan}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-primary px-5 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all disabled:opacity-60 cursor-pointer"
            >
              {isSavingDraft ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Đang lưu nháp...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Lưu nháp & Mua gói đăng tin</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          ) : (
            <Link
              href="/dashboard/membership"
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-primary px-5 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Mua / Nâng cấp gói hội viên</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : null;
}
