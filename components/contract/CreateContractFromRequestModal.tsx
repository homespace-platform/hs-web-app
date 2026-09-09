"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Shield, User, X, Check, FileCheck } from "lucide-react";
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

type TabType = "SYSTEM" | "LANDLORD";

export default function CreateContractFromRequestModal({ request, onClose }: Props) {
  const router = useRouter();
  const [templates, setTemplates] = useState<ContractTemplateResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("SYSTEM");

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const existing = await contractService.getByRentalRequest(request.id);
        if (cancelled) return;
        if (existing?.id) {
          toast.info("Yêu cầu này đã có hợp đồng. Đang mở bản nháp...");
          onCloseRef.current();
          routerRef.current.push(`/dashboard/contracts/${existing.id}`);
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
  }, [request.id]);

  const systemTemplates = useMemo(
    () => templates.filter((t) => t.source === "SYSTEM"),
    [templates]
  );

  const landlordTemplates = useMemo(
    () => templates.filter((t) => t.source === "LANDLORD" || t.source !== "SYSTEM"),
    [templates]
  );

  const displayedTemplates = useMemo(() => {
    if (activeTab === "SYSTEM") return systemTemplates;
    return landlordTemplates;
  }, [activeTab, systemTemplates, landlordTemplates]);

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

  const selectedTemplate = templates.find((t) => t.id === selectedId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={() => !submitting && onClose()}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-start justify-between gap-4 p-6 border-b border-border bg-card">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0 border border-primary/20">
              <FileText className="w-6 h-6" />
            </div>
            <div className="min-w-0 space-y-1">
              <h3 className="font-bold text-lg text-foreground tracking-tight">Tạo hợp đồng thuê</h3>
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                Tin đăng: <strong className="text-foreground">{request.listingTitle}</strong> — Chọn mẫu hợp đồng phù hợp để hệ thống tự động trích xuất dữ liệu.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TABS HEADER (Đã đưa Mẫu hệ thống lên trước) */}
        {!loading && templates.length > 0 && (
          <div className="px-6 pt-4 pb-2 bg-muted/20 border-b border-border">
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-muted/60 rounded-xl border border-border text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab("SYSTEM")}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg transition-all cursor-pointer ${
                  activeTab === "SYSTEM"
                    ? "bg-card text-foreground shadow-xs font-bold border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Shield className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span>Mẫu hệ thống</span>
                <span
                  className={`ml-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    activeTab === "SYSTEM"
                      ? "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {systemTemplates.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("LANDLORD")}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg transition-all cursor-pointer ${
                  activeTab === "LANDLORD"
                    ? "bg-card text-foreground shadow-xs font-bold border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <User className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                <span>Mẫu của bạn</span>
                <span
                  className={`ml-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    activeTab === "LANDLORD"
                      ? "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {landlordTemplates.length}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* TEMPLATE LIST BODY */}
        <div className="p-6 space-y-3.5 overflow-y-auto flex-1 bg-background/50">
          {loading ? (
            <div className="flex min-h-48 flex-col items-center justify-center text-sm text-muted-foreground gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
              <span className="font-medium">Đang tải danh sách mẫu hợp đồng...</span>
            </div>
          ) : templates.length === 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200 space-y-2">
              <p className="font-bold flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
                Chưa có mẫu hợp đồng phù hợp
              </p>
              <p className="leading-relaxed">
                Chưa có mẫu hợp đồng đã xuất bản cho loại hình tin đăng này. Hãy tải mẫu lên tại mục{" "}
                <strong>Hợp đồng → Biểu mẫu</strong> và xuất bản phiên bản Word để sử dụng.
              </p>
            </div>
          ) : displayedTemplates.length === 0 ? (
            <div className="py-12 text-center space-y-2 bg-card rounded-2xl border border-dashed border-border p-6">
              <p className="text-sm font-bold text-foreground">
                {activeTab === "SYSTEM"
                  ? "Chưa có mẫu hệ thống nào cho loại hình này"
                  : "Bạn chưa tạo mẫu hợp đồng cá nhân nào cho loại hình này"}
              </p>
              <p className="text-xs text-muted-foreground">
                Vui lòng chuyển sang tab <strong>{activeTab === "SYSTEM" ? "Mẫu của bạn" : "Mẫu hệ thống"}</strong> để lựa chọn mẫu phù hợp.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {displayedTemplates.map((tpl) => {
                const ready = Boolean(tpl.latestPublishedVersionId);
                const selected = selectedId === tpl.id;
                const isSystem = tpl.source === "SYSTEM";

                return (
                  <div
                    key={tpl.id}
                    onClick={() => ready && !submitting && setSelectedId(tpl.id)}
                    className={`group text-left rounded-2xl border p-4 sm:p-5 transition-all duration-150 ${
                      !ready
                        ? "opacity-60 border-border bg-muted/40 cursor-not-allowed"
                        : selected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/30 shadow-sm cursor-pointer"
                        : "border-border bg-card hover:border-primary/50 hover:bg-muted/30 cursor-pointer"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Checkmark Radio */}
                      <div
                        className={`w-5 h-5 rounded-full border mt-0.5 flex items-center justify-center transition-all shrink-0 ${
                          selected
                            ? "border-primary bg-primary text-primary-foreground shadow-xs"
                            : "border-muted-foreground/40 bg-background group-hover:border-primary/70"
                        }`}
                      >
                        {selected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-base font-bold text-foreground line-clamp-1">
                            {tpl.name}
                          </p>

                          <span
                            className={`inline-flex items-center gap-1 shrink-0 rounded-md px-2.5 py-1 text-[11px] font-bold ${
                              isSystem
                                ? "bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800"
                                : "bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800"
                            }`}
                          >
                            {isSystem ? (
                              <Shield className="w-3.5 h-3.5" />
                            ) : (
                              <User className="w-3.5 h-3.5" />
                            )}
                            {isSystem ? "Hệ thống" : "Của bạn"}
                          </span>
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {tpl.description || "Mẫu hợp đồng tiêu chuẩn dành cho giao dịch cho thuê."}
                        </p>

                        <div className="pt-1 flex items-center gap-2 flex-wrap">
                          {tpl.category && (
                            <span className="inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-[11px] font-semibold bg-muted text-muted-foreground border border-border">
                              {CATEGORY_NAMES[tpl.category] || tpl.category}
                            </span>
                          )}

                          {ready ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              <FileCheck className="w-3.5 h-3.5" />
                              Đã xuất bản (Sẵn sàng dùng)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                              Chưa xuất bản phiên bản Word
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between gap-4 p-6 border-t border-border bg-card">
          <div className="text-xs text-muted-foreground min-w-0 hidden sm:block">
            {selectedTemplate ? (
              <span className="truncate block max-w-xs">
                Mẫu đang chọn: <strong className="text-foreground font-bold">{selectedTemplate.name}</strong>
              </span>
            ) : (
              <span>Vui lòng chọn 1 mẫu hợp đồng</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 shrink-0 ml-auto">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={submitting || loading || !selectedId}
              onClick={handleCreate}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 disabled:opacity-50 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? "Đang tạo..." : "Tạo & mở hợp đồng"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
