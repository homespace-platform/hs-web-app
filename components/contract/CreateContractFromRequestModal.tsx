"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Shield, User, X } from "lucide-react";
import { toast } from "sonner";
import { contractService } from "@/services/contract.service";
import type { ContractTemplateResponse } from "@/types/contract.type";
import { CATEGORY_NAMES } from "@/types/contract.type";
import type { RentalRequestResponse } from "@/types/rental-request.type";
import { getApiErrorMessage } from "@/utils/apiError";

type Props = {
  request: RentalRequestResponse;
  onClose: () => void;
};

export default function CreateContractFromRequestModal({ request, onClose }: Props) {
  const router = useRouter();
  const [templates, setTemplates] = useState<ContractTemplateResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const existing = await contractService.getByRentalRequest(request.id);
        if (cancelled) return;
        if (existing?.id) {
          toast.info("Yêu cầu này đã có hợp đồng. Đang mở bản nháp...");
          onClose();
          router.push(`/dashboard/contracts/${existing.id}`);
          return;
        }
        const list = await contractService.getApplicableTemplates(request.id);
        if (cancelled) return;
        setTemplates(list);
        const firstReady = list.find((t) => t.latestPublishedVersionId);
        if (firstReady) setSelectedId(firstReady.id);
      } catch (err) {
        if (!cancelled) {
          toast.error(getApiErrorMessage(err, "Không thể tải mẫu hợp đồng phù hợp."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [request.id, onClose, router]);

  async function handleCreate() {
    const selected = templates.find((t) => t.id === selectedId);
    if (!selected?.latestPublishedVersionId) {
      toast.error("Vui lòng chọn mẫu hợp đồng đã xuất bản.");
      return;
    }

    setSubmitting(true);
    try {
      const draft = await contractService.createDraft({
        rentalRequestId: request.id,
        templateVersionId: selected.latestPublishedVersionId,
      });
      try {
        const completeness = await contractService.getCompleteness(draft.id);
        if (completeness.complete) {
          await contractService.triggerPreview(draft.id);
          toast.success("Đã tạo và kết xuất hợp đồng từ dữ liệu yêu cầu thuê.");
        } else {
          toast.warning(
            `Đã tạo bản nháp. Cần bổ sung ${completeness.missingFields.length} trường trước khi kết xuất.`
          );
        }
      } catch {
        toast.warning("Đã tạo bản nháp. Mở hợp đồng để kiểm tra dữ liệu trước khi kết xuất.");
      }
      onClose();
      router.push(`/dashboard/contracts/${draft.id}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Không thể tạo hợp đồng."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={() => !submitting && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-border">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base text-foreground">Tạo hợp đồng thuê</h3>
              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                {request.listingTitle} — chọn mẫu đúng loại hình tin đăng. Hệ thống tự điền dữ liệu
                từ hồ sơ 2 bên, tin đăng và yêu cầu thuê.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex min-h-32 items-center justify-center text-sm text-muted-foreground gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang tải mẫu phù hợp...
            </div>
          ) : templates.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              Chưa có mẫu hợp đồng đã xuất bản cho loại hình tin này. Hãy tải mẫu lên tại mục{" "}
              <strong>Hợp đồng → Biểu mẫu</strong> rồi xuất bản phiên bản Word.
            </div>
          ) : (
            templates.map((tpl) => {
              const ready = Boolean(tpl.latestPublishedVersionId);
              const selected = selectedId === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  disabled={!ready || submitting}
                  onClick={() => setSelectedId(tpl.id)}
                  className={`w-full text-left rounded-xl border p-3.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    selected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border bg-card hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{tpl.name}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {tpl.category ? CATEGORY_NAMES[tpl.category] : "Chưa gắn loại hình"}
                        {tpl.description ? ` · ${tpl.description}` : ""}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        tpl.source === "SYSTEM"
                          ? "bg-sky-500/10 text-sky-700 dark:text-sky-300"
                          : "bg-violet-500/10 text-violet-700 dark:text-violet-300"
                      }`}
                    >
                      {tpl.source === "SYSTEM" ? (
                        <Shield className="w-3 h-3" />
                      ) : (
                        <User className="w-3 h-3" />
                      )}
                      {tpl.source === "SYSTEM" ? "Hệ thống" : "Của bạn"}
                    </span>
                  </div>
                  {!ready && (
                    <p className="mt-2 text-[11px] font-medium text-rose-600">
                      Chưa có phiên bản đã xuất bản — không thể dùng.
                    </p>
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-5 border-t border-border">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-border bg-card text-xs font-semibold hover:bg-muted cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={submitting || loading || !selectedId}
            onClick={handleCreate}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {submitting ? "Đang tạo..." : "Tạo & mở hợp đồng"}
          </button>
        </div>
      </div>
    </div>
  );
}
