"use client";

import React from "react";
import { FileText, Download, ExternalLink, Clock, AlertCircle } from "lucide-react";
import { str } from "./utils";
import type { ContractDocumentResponse } from "@/types/contract.type";

interface ContractDocumentSectionProps {
  documents: ContractDocumentResponse[];
}

function formatFileSize(bytes?: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ContractDocumentSection({
  documents,
}: ContractDocumentSectionProps) {
  if (documents.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-4.5 space-y-3 shadow-2xs">
      <div className="flex items-center justify-between border-b border-border/70 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <FileText className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-foreground">
            Tài liệu văn bản hợp đồng đã kết xuất
          </h3>
        </div>
        <span className="text-[11px] font-semibold text-muted-foreground px-2 py-0.5 rounded-md bg-muted">
          {documents.length} tệp
        </span>
      </div>

      <div className="space-y-2">
        {documents.map((doc) => {
          const isReady = doc.status === "READY";
          const isGenerating = doc.status === "GENERATING";
          const isFailed = doc.status === "FAILED";

          return (
            <div
              key={doc.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/35 transition-colors"
            >
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-background border border-border shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-foreground truncate">
                      {doc.fileName || `Hop_dong_${doc.documentType}.${doc.documentType.toLowerCase()}`}
                    </p>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-black uppercase bg-primary/10 text-primary">
                      {doc.documentType}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                      {doc.purpose === "SIGNED_FINAL" ? "Đã ký đủ hai bên" : doc.purpose === "SIGNED_LANDLORD" ? "Chủ nhà đã ký" : doc.purpose === "OFFICIAL" ? "Chính thức" : "Bản xem trước"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>Dung lượng: {formatFileSize(doc.fileSize)}</span>
                    {doc.generatedAt && (
                      <>
                        <span>•</span>
                        <span>
                          Thời điểm: {str(doc.generatedAt)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {isReady && (
                  <>
                    {doc.viewUrl && (
                      <a
                        href={doc.viewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="h-8 px-3 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Xem
                      </a>
                    )}
                    {doc.downloadUrl && (
                      <a
                        href={doc.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="h-8 px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Tải về
                      </a>
                    )}
                  </>
                )}
                {isGenerating && (
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-medium inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    Đang tạo tài liệu...
                  </span>
                )}
                {isFailed && (
                  <span className="text-xs text-rose-600 dark:text-rose-400 font-medium inline-flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Lỗi kết xuất
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
