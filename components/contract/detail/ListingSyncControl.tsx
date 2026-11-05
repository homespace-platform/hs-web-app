"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { contractService } from "@/services/contract.service";
import type { ContractListingSyncPreview } from "@/types/contract.type";
import type { AmendmentComparison } from "@/types/contract-amendment.type";
import { getApiErrorMessage } from "@/utils/apiError";

function Differences({ rows }: { rows: AmendmentComparison[] }) {
  return <div className="divide-y rounded-lg border">{rows.map(row => (
    <div key={row.field} className="p-3">
      <p className="mb-1 font-semibold">{row.label}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <div><p className="text-muted-foreground">Đang ghi trong hợp đồng</p><p className="whitespace-pre-line break-words">{row.before}</p></div>
        <div><p className="text-muted-foreground">Bản bài đăng đã duyệt</p><p className="whitespace-pre-line break-words">{row.after}</p></div>
      </div>
    </div>
  ))}</div>;
}

export default function ListingSyncControl({ contractId, baseRevisionId, disabled, onSelect }: {
  contractId: string;
  baseRevisionId?: string;
  disabled?: boolean;
  onSelect: (preview: ContractListingSyncPreview) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ContractListingSyncPreview | null>(null);
  async function open() {
    setLoading(true);
    try {
      const result = await contractService.previewListingSync(contractId);
      if (result.baseRevisionId !== baseRevisionId) {
        toast.error("Phiên bản hợp đồng đã thay đổi. Tải lại trang để đối chiếu.");
        return;
      }
      setPreview(result);
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Không tải được dữ liệu bài đăng đã duyệt."));
    } finally {
      setLoading(false);
    }
  }
  return <>
    <button type="button" className="rounded-lg border px-3 py-2 text-xs font-semibold"
      disabled={disabled || loading || !baseRevisionId} onClick={() => void open()}>
      {loading ? "Đang đối chiếu…" : "Cập nhật dữ liệu từ bài đăng"}
    </button>
    <Dialog.Root open={Boolean(preview)} onOpenChange={open => { if (!open) setPreview(null); }}>
      {preview && <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border bg-background p-5 text-sm shadow-xl">
          <Dialog.Title className="text-base font-bold">Đối chiếu bài đăng đã duyệt</Dialog.Title>
          <Dialog.Description className="mt-1 text-muted-foreground">Kiểm tra các thay đổi trước khi đưa vào bản đang soạn.</Dialog.Description>
          <div className="my-4 space-y-4">
            {preview.leaseMessage && <p className="rounded-lg bg-amber-50 p-3 text-amber-900">{preview.leaseMessage}</p>}
            {preview.differences.length ? <Differences rows={preview.differences} /> : <p>Chưa có thay đổi nội dung để đưa vào bản đang soạn.</p>}
            {preview.financialDifferences.length > 0 && <section className="space-y-2">
              <h3 className="font-semibold">Chênh lệch cần thỏa thuận riêng</h3>
              <p className="text-muted-foreground">Các khoản đã chốt tiếp tục áp dụng. Hai bên có thể xử lý thay đổi qua đề xuất điều chỉnh tài chính.</p>
              <Differences rows={preview.financialDifferences} />
            </section>}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Dialog.Close className="rounded-lg border px-3 py-2">Đóng</Dialog.Close>
            <button type="button" disabled={disabled || preview.baseRevisionId !== baseRevisionId || !preview.differences.length}
              className="rounded-lg bg-primary px-3 py-2 font-semibold text-primary-foreground disabled:opacity-50"
              onClick={() => { onSelect(preview); setPreview(null); }}>Dùng dữ liệu đã duyệt</button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>}
    </Dialog.Root>
  </>;
}
