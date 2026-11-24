"use client";

import { PencilLine } from "lucide-react";
import { Card, SectionTitle } from "./ui";

/** Landlord draft checklist. Save / update-from-listing live only in the sticky bar (ContractHeader), so they are not repeated here. */
export default function DraftActionsCard({
  dirty, conflict, signatureLocked, missingMeters, onReviewContent, onReload,
}: {
  dirty: boolean;
  conflict: boolean;
  signatureLocked: boolean;
  missingMeters: boolean;
  onReviewContent: () => void;
  onReload: () => void;
}) {
  return (
    <Card>
      <SectionTitle title="Hoàn thiện bản nháp" hint="Rà soát nội dung, lưu ở thanh dưới màn hình để tạo PDF, rồi gửi hoặc ký." />
      <ol className="mt-4 space-y-1.5 text-sm text-foreground">
        <li><span className="font-semibold">1.</span> Rà soát và sửa nội dung trong mục Nội dung hợp đồng{missingMeters ? " (còn thiếu chỉ số điện nước)" : ""}.</li>
        <li><span className="font-semibold">2.</span> Bấm Lưu ở thanh cố định phía dưới để tạo PDF xem trước.</li>
        <li><span className="font-semibold">3.</span> Kiểm tra PDF rồi gửi cho người thuê hoặc ký số.</li>
      </ol>
      {dirty ? <p role="status" className="mt-3 text-sm font-semibold text-amber-700 dark:text-amber-300">Có thay đổi chưa lưu</p> : null}
      {signatureLocked ? <p className="mt-3 text-sm text-amber-800 dark:text-amber-300">Bản nháp đang xử lý chữ ký. Theo dõi trạng thái ở phần ký bên dưới.</p> : null}
      {conflict ? (
        <div role="alert" className="mt-3 space-y-2 text-sm text-amber-800 dark:text-amber-300">
          <p>Bản nháp đã thay đổi ở nơi khác. Hãy đối chiếu nội dung trước khi chỉnh sửa lại.</p>
          <button type="button" className="font-semibold underline" onClick={onReload}>Tải lại bản nháp</button>
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={onReviewContent}
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <PencilLine className="h-4 w-4" aria-hidden="true" />Rà soát nội dung
        </button>
      </div>
    </Card>
  );
}
