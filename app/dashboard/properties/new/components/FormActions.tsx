import React from "react";
import { Save, CheckCircle2, Loader2 } from "lucide-react";

interface FormActionsProps {
  onCancel: () => void;
  onValidateForm: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  loadingLabel?: string;
}

export default function FormActions({
  onCancel,
  onValidateForm,
  onSubmit,
  isSubmitting = false,
  submitLabel = "Đăng tin",
  loadingLabel = "Đang đăng tin...",
}: FormActionsProps) {
  return (
    <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-2xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>
          Kiểm tra kỹ các thông tin trước khi hoàn tất đăng tin cho thuê.
        </span>
      </div>

      <div className="flex items-center justify-end gap-3">
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

        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-6 text-xs font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{loadingLabel}</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>{submitLabel}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
