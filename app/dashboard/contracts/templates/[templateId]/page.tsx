"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Plus,
  Layers,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Play,
  Clock,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { contractService } from "@/services/contract.service";
import storageService from "@/services/storage.service";
import type {
  ContractTemplateResponse,
  ContractTemplateVersionResponse,
} from "@/types/contract.type";
import { CATEGORY_DESCRIPTIONS, CATEGORY_NAMES } from "@/types/contract.type";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function ContractTemplateDetailPage() {
  const params = useParams<{ templateId: string }>();
  const templateId = params?.templateId;

  const [template, setTemplate] = useState<ContractTemplateResponse | null>(null);
  const [versions, setVersions] = useState<ContractTemplateVersionResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const [isNewVersionModalOpen, setIsNewVersionModalOpen] = useState(false);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  const isSystem = template?.source === "SYSTEM" || !template?.source;
  const canManage = !isSystem;

  const loadData = async (id: string) => {
    setLoading(true);
    try {
      const [tData, vData] = await Promise.all([
        contractService.getTemplate(id),
        contractService.getVersions(id),
      ]);
      setTemplate(tData);
      setVersions(vData || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Không thể tải mẫu hợp đồng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (templateId) loadData(templateId);
  }, [templateId]);

  const copyPlaceholder = (key: string) => {
    navigator.clipboard.writeText(`{{${key}}}`);
    toast.success(`Đã sao chép {{${key}}}`);
  };

  const handleCreateVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateId || !newFile?.name.endsWith(".docx")) {
      toast.error("Vui lòng chọn file Word (.docx)");
      return;
    }
    setIsSubmitting(true);
    try {
      toast.info("Đang tải file lên...");
      const storageId = await storageService.uploadContractDocx(newFile);
      toast.info("Đang phân tích mã trường...");
      await contractService.createVersion(templateId, {
        storageObjectId: storageId,
        originalFileName: newFile.name,
      });
      toast.success("Đã thêm phiên bản mới");
      setIsNewVersionModalOpen(false);
      setNewFile(null);
      loadData(templateId);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Lỗi khi thêm phiên bản");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = async (versionId: string, verNumber: number) => {
    if (!templateId) return;
    const target = versions.find((v) => v.id === versionId);
    const hasBlocking =
      (target?.invalidPlaceholders?.length ?? 0) > 0 ||
      (target?.missingRequiredFields?.length ?? 0) > 0 ||
      (target?.validationWarnings?.length ?? 0) > 0;
    if (hasBlocking) {
      toast.error(
        "Không thể xuất bản: còn mã trường không hợp lệ hoặc thiếu trường bắt buộc."
      );
      return;
    }
    if (
      !window.confirm(
        `Xuất bản Phiên bản ${verNumber}? Phiên bản này sẽ dùng cho các hợp đồng mới của bạn.`
      )
    ) {
      return;
    }
    try {
      await contractService.publishVersion(templateId, versionId);
      toast.success(`Đã xuất bản Phiên bản ${verNumber}`);
      loadData(templateId);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Không thể xuất bản");
    }
  };

  const handleTestPreview = async (versionId: string, verNumber: number) => {
    if (!templateId) return;
    setPreviewLoading(true);
    toast.info(`Đang tạo bản xem thử Phiên bản ${verNumber}...`);
    try {
      const { blob, contentType } = await contractService.testPreviewVersion(
        templateId,
        versionId
      );
      const isPdf = contentType.includes("application/pdf");
      const url = URL.createObjectURL(blob);
      if (isPdf) {
        setPreviewUrl(url);
        setIsPreviewModalOpen(true);
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = `preview_v${verNumber}.docx`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Đã tải file xem thử DOCX");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Không thể tạo bản xem thử");
    } finally {
      setPreviewLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Đang tải chi tiết mẫu...
      </div>
    );
  }

  if (!template) {
    return (
      <div className="py-16 text-center space-y-3">
        <p className="text-sm text-muted-foreground">Không tìm thấy mẫu hợp đồng</p>
        <Link href="/dashboard/contracts/templates">
          <Button variant="outline" size="sm">
            Quay lại
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-2">
          <Link
            href="/dashboard/contracts/templates"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Quay lại danh sách mẫu
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            {template.name}
            {isSystem && (
              <Badge className="ml-2 align-middle bg-primary/10 text-primary border-primary/20 text-[10px]">
                Mẫu hệ thống
              </Badge>
            )}
          </h1>
          <p className="text-xs text-muted-foreground">
            {template.description || "Không có mô tả chi tiết."}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/dashboard/contracts/fields" target="_blank">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <ExternalLink className="w-3.5 h-3.5" />
              Từ điển mã trường
            </Button>
          </Link>
          {canManage && (
            <Button
              size="sm"
              onClick={() => setIsNewVersionModalOpen(true)}
              className="gap-1.5 text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              Thêm phiên bản Word mới
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl border border-border bg-card shadow-2xs">
          <div className="text-[11px] font-medium text-muted-foreground uppercase">
            Loại BĐS áp dụng
          </div>
          <div className="text-sm font-bold mt-1">
            {template.category ? CATEGORY_NAMES[template.category] : "—"}
          </div>
          {template.category && (
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {CATEGORY_DESCRIPTIONS[template.category]}
            </div>
          )}
        </div>
        <div className="p-4 rounded-2xl border border-border bg-card shadow-2xs">
          <div className="text-[11px] font-medium text-muted-foreground uppercase">
            Tổng số phiên bản
          </div>
          <div className="text-sm font-bold mt-1">{versions.length} phiên bản</div>
        </div>
        <div className="p-4 rounded-2xl border border-border bg-card shadow-2xs">
          <div className="text-[11px] font-medium text-muted-foreground uppercase">
            Trạng thái
          </div>
          <div className="mt-1">
            {template.status === "ACTIVE" ? (
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                Đang hoạt động
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">
                Đã lưu trữ
              </Badge>
            )}
          </div>
        </div>
      </div>

      {isSystem && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-800 dark:text-amber-200">
          Đây là mẫu hệ thống do HomeSpace quản lý. Bạn chỉ có thể xem và xem thử — không thể
          tải lên phiên bản mới hay xuất bản.
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-base font-bold flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          Lịch sử các phiên bản file Word
        </h2>

        {versions.length === 0 ? (
          <div className="p-12 text-center border border-dashed rounded-2xl bg-card text-muted-foreground text-xs">
            Chưa có phiên bản Word nào.
          </div>
        ) : (
          <div className="space-y-3">
            {versions.map((v) => {
              const isPublished = v.status === "PUBLISHED";
              const isDraft = v.status === "DRAFT";
              const invalidFields = v.invalidPlaceholders || [];
              const missingFields = v.missingRequiredFields || [];
              const legacyWarnings = v.validationWarnings || [];
              const hasStructured =
                invalidFields.length > 0 || missingFields.length > 0;
              const warningCount = hasStructured
                ? invalidFields.length + missingFields.length
                : legacyWarnings.length;
              const hasWarnings = warningCount > 0;

              return (
                <div
                  key={v.id}
                  className={`p-4 sm:p-5 rounded-2xl border bg-card ${
                    isPublished
                      ? "border-emerald-500/40 ring-1 ring-emerald-500/20"
                      : "border-border"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm sm:text-base">
                          Phiên bản {v.versionNumber}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          ({v.originalFileName || "template.docx"})
                        </span>
                        {isPublished ? (
                          <Badge className="bg-emerald-600 text-white text-[10px]">
                            Đang có hiệu lực
                          </Badge>
                        ) : isDraft ? (
                          <Badge
                            variant="outline"
                            className="text-amber-600 border-amber-500/40 text-[10px]"
                          >
                            Bản nháp
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            Đã thay thế
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Tạo: {new Date(v.createdAt).toLocaleString("vi-VN")}
                        </span>
                        {v.publishedAt && (
                          <span className="flex items-center gap-1 text-emerald-600 font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            Xuất bản: {new Date(v.publishedAt).toLocaleString("vi-VN")}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={previewLoading}
                        onClick={() => handleTestPreview(v.id, v.versionNumber)}
                        className="gap-1.5 text-xs font-semibold text-primary"
                      >
                        <Play className="w-3.5 h-3.5 fill-primary" />
                        Xem thử
                      </Button>
                      {canManage && !isPublished && (
                        <Button
                          size="sm"
                          disabled={hasWarnings}
                          onClick={() => handlePublish(v.id, v.versionNumber)}
                          className="gap-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                          title={
                            hasWarnings
                              ? "Không thể xuất bản khi còn cảnh báo mã trường"
                              : "Xuất bản phiên bản này"
                          }
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Xuất bản
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-border/60 flex flex-wrap items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Mã trường:</span>
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {v.placeholders?.length || 0} trường
                      </Badge>
                    </div>
                    {hasWarnings ? (
                      <div className="flex items-center gap-1.5 text-amber-600 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {warningCount} mã trường cần xử lý
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-emerald-600 text-[11px] font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Toàn bộ mã trường hợp lệ
                      </div>
                    )}
                  </div>

                  {!hasStructured && legacyWarnings.length > 0 && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 space-y-1">
                      <ul className="list-disc list-inside text-[11px]">
                        {legacyWarnings.map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {invalidFields.length > 0 && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 space-y-1.5">
                      <div className="font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {invalidFields.length} mã trường không có trong từ điển:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {invalidFields.map((key) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => copyPlaceholder(key)}
                            className="px-1.5 py-0.5 rounded bg-rose-500/15 text-[10px] font-mono cursor-pointer"
                          >
                            {"{{"}
                            {key}
                            {"}}"}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {missingFields.length > 0 && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 space-y-1.5">
                      <div className="font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Thiếu {missingFields.length} trường bắt buộc:
                      </div>
                      <ul className="space-y-1 text-[11px]">
                        {missingFields.map((f) => (
                          <li key={f.key} className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => copyPlaceholder(f.key)}
                              className="px-1.5 py-0.5 rounded bg-amber-500/15 font-mono cursor-pointer"
                            >
                              {"{{"}
                              {f.key}
                              {"}}"}
                            </button>
                            <span>{f.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isNewVersionModalOpen && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
                Thêm phiên bản Word mới
              </h3>
              <button
                type="button"
                onClick={() => !isSubmitting && setIsNewVersionModalOpen(false)}
                className="text-muted-foreground font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateVersion} className="space-y-3 text-xs">
              <div className="border-2 border-dashed border-border rounded-xl p-4 text-center">
                <input
                  type="file"
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setNewFile(e.target.files[0]);
                  }}
                  className="hidden"
                  id="new-version-docx"
                />
                <label htmlFor="new-version-docx" className="cursor-pointer space-y-1 block">
                  <FileText className="w-6 h-6 mx-auto text-muted-foreground" />
                  {newFile ? (
                    <span className="font-bold text-primary">{newFile.name}</span>
                  ) : (
                    <span>Chọn file .docx</span>
                  )}
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => setIsNewVersionModalOpen(false)}
                >
                  Hủy
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? "Đang xử lý..." : "Tải lên & Phân tích"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isPreviewModalOpen && previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-5xl h-[85vh] rounded-2xl bg-card border border-border overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-bold">Xem thử mẫu hợp đồng (PDF)</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsPreviewModalOpen(false);
                  if (previewUrl) URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                }}
              >
                Đóng
              </Button>
            </div>
            <iframe src={previewUrl} className="flex-1 w-full" title="Contract preview" />
          </div>
        </div>
      )}
    </div>
  );
}
