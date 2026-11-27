"use client";

/** Shown on the server's "just paid this item" 409 (code 4084); confirming resends with confirmRepeat=true. */
export default function RepeatPurchaseConfirm({
  message,
  sending,
  onCancel,
  onConfirm,
}: {
  message: string;
  sending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={(e) => e.stopPropagation()}>
      <div role="alertdialog" aria-modal="true" className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-5 shadow-2xl">
        <p className="text-sm text-foreground">{message}</p>
        <div className="flex justify-end gap-2">
          <button type="button" disabled={sending} onClick={onCancel}
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50 cursor-pointer">
            Hủy
          </button>
          <button type="button" disabled={sending} onClick={onConfirm}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 cursor-pointer">
            Vẫn mua thêm
          </button>
        </div>
      </div>
    </div>
  );
}
