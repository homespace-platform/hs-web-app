"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { contractService } from "@/services/contract.service";
import type { ContractListingSyncPreview } from "@/types/contract.type";
import { getApiErrorMessage } from "@/utils/apiError";

export default function ListingSyncControl({ contractId, baseRevisionId, disabled, onSelect, onBusyChange }: {
  contractId: string;
  baseRevisionId?: string;
  disabled?: boolean;
  onSelect: (source: ContractListingSyncPreview) => void | Promise<void>;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => { pending.current?.abort(); pending.current = null; }, [contractId]);

  async function update() {
    if (disabled || !baseRevisionId || pending.current) return;
    const request = new AbortController();
    pending.current = request;
    setLoading(true);
    onBusyChange?.(true);
    try {
      const source = await contractService.previewListingSync(contractId, request.signal);
      if (request.signal.aborted) return;
      if (source.baseRevisionId !== baseRevisionId) {
        toast.error("Phiên bản hợp đồng đã thay đổi. Tải lại trang trước khi cập nhật.");
        return;
      }
      await onSelect(source);
    } catch (error) {
      if (!request.signal.aborted) toast.error(getApiErrorMessage(error, "Không cập nhật được dữ liệu bài đăng đã duyệt."));
    } finally {
      if (pending.current === request) {
        pending.current = null;
        setLoading(false);
        onBusyChange?.(false);
      }
    }
  }

  return <button type="button" className="rounded-lg border px-3 py-2 text-xs font-semibold"
    disabled={disabled || loading || !baseRevisionId} onClick={() => void update()}>
    {loading ? "Đang cập nhật…" : "Cập nhật dữ liệu từ bài đăng"}
  </button>;
}
