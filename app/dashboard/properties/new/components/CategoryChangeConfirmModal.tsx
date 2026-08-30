import React from "react";
import { AlertTriangle, X } from "lucide-react";
import { PROPERTY_CATEGORIES } from "../constants";
import type { PropertyCategoryKey } from "../types";

interface CategoryChangeConfirmModalProps {
  isOpen: boolean;
  targetCategory: PropertyCategoryKey | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function CategoryChangeConfirmModal({
  isOpen,
  targetCategory,
  onConfirm,
  onCancel,
}: CategoryChangeConfirmModalProps) {
  if (!isOpen || !targetCategory) return null;

  const targetCategoryLabel =
    PROPERTY_CATEGORIES.find((c) => c.key === targetCategory)?.label ??
    targetCategory;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in-50 duration-200">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Xác nhận đổi loại hình
              </h3>
              <p className="text-xs text-muted-foreground">
                Chuyển sang: <span className="font-semibold text-foreground">{targetCategoryLabel}</span>?
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 rounded-xl border border-border px-4 text-xs font-bold text-foreground hover:bg-muted"
          >
            Giữ nguyên
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-9 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-2xs"
          >
            Đồng ý đổi
          </button>
        </div>
      </div>
    </div>
  );
}
