import React from "react";
import { Send, FileText, CheckCircle2, Loader2 } from "lucide-react";
import type { ListingSubmissionAction } from "@/types/listing.type";

interface FormActionsProps {
  onCancel: () => void;
  onValidateForm: () => void;
  onSaveDraft: () => void;
  onSubmitForReview: () => void;
  isSubmitting?: boolean;
  submittingAction?: ListingSubmissionAction | null;
  isEditing?: boolean;
}

export default function FormActions({
  onCancel,
  onValidateForm,
  onSaveDraft,
  onSubmitForReview,
  isSubmitting = false,
  submittingAction = null,
  isEditing = false,
}: FormActionsProps) {
  return (
    <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-2xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>
          Kiểm tra kỹ các thông tin trước khi lưu nháp hoặc gửi bài đăng để kiểm duyệt.
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

        <button
          type="button"
          onClick={onValidateForm}
          disabled={isSubmitting}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-4 text-xs font-bold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" />
          Kiểm tra dữ liệu
        </button>

        {/* Nút 1: Lưu nháp */}
        <button
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
        </button>

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
