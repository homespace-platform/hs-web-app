import React from "react";
import { Save, AlertCircle, CheckCircle2 } from "lucide-react";

interface FormActionsProps {
  onCancel: () => void;
  onValidateForm: () => void;
}

export default function FormActions({
  onCancel,
  onValidateForm,
}: FormActionsProps) {
  return (
    <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-2xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>
          Giao diện đang ở chế độ xem trước — Nút Đăng tin tạm thời bị vô hiệu hóa để tránh gọi API.
        </span>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="h-10 rounded-xl border border-border px-4 text-xs font-bold text-foreground transition-colors hover:bg-muted"
        >
          Hủy
        </button>

        <button
          type="button"
          onClick={onValidateForm}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-4 text-xs font-bold text-primary transition-colors hover:bg-primary/20"
        >
          <CheckCircle2 className="h-4 w-4" />
          Kiểm tra dữ liệu
        </button>

        <button
          type="button"
          disabled
          title="Nút đăng tin đang tạm tắt theo yêu cầu để tránh gọi API"
          className="inline-flex h-10 cursor-not-allowed items-center gap-2 rounded-xl bg-primary/50 px-5 text-xs font-bold text-primary-foreground opacity-60"
        >
          <Save className="h-4 w-4" />
          Đăng tin (Tạm tắt)
        </button>
      </div>
    </div>
  );
}
