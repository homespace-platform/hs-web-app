import React from "react";
import { Send, FileText, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import type { ListingSubmissionAction } from "@/types/listing.type";

interface FormActionsProps {
  onCancel: () => void;
  onSaveDraft: () => void;
  onSubmitForReview: () => void;
  isSubmitting?: boolean;
  submittingAction?: ListingSubmissionAction | null;
  isEditing?: boolean;
  requiresEditReview?: boolean;
}

export default function FormActions({
  onCancel,
  onSaveDraft,
  onSubmitForReview,
  isSubmitting = false,
  submittingAction = null,
  isEditing = false,
  requiresEditReview = false,
}: FormActionsProps) {
  return (
    <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-2xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>
          {requiresEditReview ? "Admin duyệt nội dung mới. Trạng thái cho thuê tiếp tục theo hồ sơ hiện tại."
            : "Kiểm tra kỹ các thông tin trước khi lưu nháp hoặc gửi bài đăng để kiểm duyệt."}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="h-10 rounded-xl border border-border px-4 text-xs font-bold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          Hủy
        </button>

        {!requiresEditReview && <button
          type="button"
          onClick={onSaveDraft}
          disabled={isSubmitting}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-5 text-xs font-bold text-slate-800 dark:text-slate-200 transition-all hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting && submittingAction === "SAVE_DRAFT" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Đang lưu nháp...</span>
            </>
          ) : (
            <>
              <FileText className="h-4 w-4" />
              <span>Lưu nháp</span>
            </>
          )}
        </button>}

        {/* Nút 2: Gửi duyệt */}
        <button
          type="button"
          onClick={onSubmitForReview}
          disabled={isSubmitting}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-6 text-xs font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSubmitting && submittingAction === "SUBMIT_FOR_REVIEW" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{isEditing ? "Đang cập nhật..." : "Đang gửi duyệt..."}</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span>{isEditing ? "Cập nhật & Gửi duyệt" : "Gửi duyệt"}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

interface WizardActionsProps {
  step: number;
  lastStep: number;
  onBack: () => void;
  onNext: () => void;
  onSaveDraft: () => void;
  onSubmitForReview: () => void;
  isSubmitting?: boolean;
  submittingAction?: ListingSubmissionAction | null;
}

export function WizardActions({
  step,
  lastStep,
  onBack,
  onNext,
  onSaveDraft,
  onSubmitForReview,
  isSubmitting = false,
  submittingAction = null,
}: WizardActionsProps) {
  const saving = isSubmitting && submittingAction === "SAVE_DRAFT";
  const sending = isSubmitting && submittingAction === "SUBMIT_FOR_REVIEW";
  return (
    <div className="sticky bottom-4 z-20 flex items-center justify-between gap-2.5 rounded-2xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur-md">
      <button
        type="button"
        onClick={onBack}
        disabled={isSubmitting || step <= 1}
        className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border px-4 text-xs font-bold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại
      </button>
      <div className="flex flex-wrap items-center justify-end gap-2.5">
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={isSubmitting}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-slate-100 px-4 text-xs font-bold text-slate-800 transition-all hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          {saving ? "Đang lưu nháp..." : "Lưu nháp"}
        </button>
        {step < lastStep ? (
          <button
            type="button"
            onClick={onNext}
            disabled={isSubmitting}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-6 text-xs font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Tiếp tục
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onSubmitForReview}
            disabled={isSubmitting}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-6 text-xs font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sending ? "Đang gửi duyệt..." : "Gửi duyệt"}
          </button>
        )}
      </div>
    </div>
  );
}
