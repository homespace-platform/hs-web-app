"use client";

import React, { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { renderAsync as renderDocxAsync } from "docx-preview";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  X,
  Download,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  FileText,
  Loader2,
  AlertTriangle,
  Layers,
} from "lucide-react";
import type { ContractDocumentResponse } from "@/types/contract.type";

// Configure PDF.js worker
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

interface ContractPdfViewerContentProps {
  onClose: () => void;
  document: ContractDocumentResponse;
}

export default function ContractPdfViewerContent({
  onClose,
  document: doc,
}: ContractPdfViewerContentProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.15);
  const [rotation, setRotation] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<"single" | "continuous">("continuous");
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const docxContainerRef = useRef<HTMLDivElement>(null);

  const isPdf = doc.documentType?.toUpperCase() === "PDF" || doc.fileName?.toLowerCase().endsWith(".pdf");
  const isDocx = doc.documentType?.toUpperCase() === "DOCX" || doc.fileName?.toLowerCase().endsWith(".docx");
  const fileUrl = doc.viewUrl || doc.downloadUrl;

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (isPdf && (e.key === "ArrowLeft" || e.key === "PageUp")) {
        setPageNumber((prev) => Math.max(prev - 1, 1));
      } else if (isPdf && (e.key === "ArrowRight" || e.key === "PageDown")) {
        setPageNumber((prev) => Math.min(prev + 1, numPages || 1));
      } else if (e.key === "+" || e.key === "=") {
        setScale((prev) => Math.min(prev + 0.15, 2.5));
      } else if (e.key === "-") {
        setScale((prev) => Math.max(prev - 0.15, 0.5));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, numPages, isPdf, onClose]);

  // Lock body scroll when modal is mounted
  useEffect(() => {
    const originalOverflow = window.getComputedStyle(window.document.body).overflow;
    window.document.body.style.overflow = "hidden";
    return () => {
      window.document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Handle DOCX rendering
  useEffect(() => {
    if (!isDocx || !fileUrl || !docxContainerRef.current) return;

    let isMounted = true;
    setLoading(true);
    setLoadError(null);

    (async () => {
      try {
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error(`Tải tệp DOCX thất bại (HTTP ${response.status})`);
        }
        const blob = await response.blob();
        if (!isMounted || !docxContainerRef.current) return;

        docxContainerRef.current.innerHTML = "";
        await renderDocxAsync(blob, docxContainerRef.current, undefined, {
          inWrapper: false,
          ignoreWidth: false,
          ignoreHeight: false,
          breakPages: true,
          className: "docx-rendered-page",
        });

        if (isMounted) {
          setLoading(false);
        }
      } catch (err: unknown) {
        console.error("DOCX Render Error:", err);
        if (isMounted) {
          setLoading(false);
          const errorMsg = err instanceof Error ? err.message : "Không thể đọc và hiển thị tệp DOCX này.";
          setLoadError(errorMsg);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isDocx, fileUrl]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setLoadError(null);
  };

  const onDocumentLoadError = (err: Error) => {
    console.error("PDF Load Error:", err);
    setLoading(false);
    setLoadError(err.message || "Không thể tải nội dung tài liệu.");
  };

  const zoomIn = () => setScale((prev) => Math.min(Number((prev + 0.15).toFixed(2)), 2.5));
  const zoomOut = () => setScale((prev) => Math.max(Number((prev - 0.15).toFixed(2)), 0.5));
  const rotate = () => setRotation((prev) => (prev + 90) % 360);
  const toggleFullscreen = () => setIsFullscreen((prev) => !prev);

  const purposeBadgeText =
    doc.purpose === "SIGNED_FINAL"
      ? "Đã ký đủ hai bên"
      : doc.purpose === "SIGNED_LANDLORD"
      ? "Chủ nhà đã ký"
      : doc.purpose === "OFFICIAL"
      ? "Chính thức"
      : "Bản xem trước";

  const renderHeader = () => (
    <header className="h-14 px-4 flex items-center justify-between border-b border-border bg-card/95 backdrop-blur-md shrink-0 z-30">
      {/* Left: Document details */}
      <div className="flex items-center gap-3 min-w-0 max-w-[38%]">
        <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
          <FileText className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-xs sm:text-sm font-bold text-foreground truncate" title={doc.fileName || undefined}>
              {doc.fileName || `Hop_dong_${doc.documentType}.${doc.documentType?.toLowerCase()}`}
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-primary/10 text-primary shrink-0">
              {doc.documentType}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground truncate">{purposeBadgeText}</p>
        </div>
      </div>

      {/* Middle: Controls */}
      {!loadError && (isPdf || isDocx) && (
        <div className="flex items-center gap-1 sm:gap-2 bg-muted/60 p-1 rounded-xl border border-border/70 text-xs">
          {/* Page Navigator for PDF */}
          {isPdf && (
            <>
              <div className="flex items-center gap-0.5 px-1">
                <button
                  type="button"
                  onClick={() => setPageNumber((p) => Math.max(p - 1, 1))}
                  disabled={pageNumber <= 1}
                  className="p-1 rounded-lg hover:bg-background disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
                  title="Trang trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-semibold text-foreground min-w-14 text-center select-none">
                  {numPages > 0 ? `${pageNumber} / ${numPages}` : "—"}
                </span>
                <button
                  type="button"
                  onClick={() => setPageNumber((p) => Math.min(p + 1, numPages || 1))}
                  disabled={pageNumber >= numPages}
                  className="p-1 rounded-lg hover:bg-background disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
                  title="Trang sau"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="w-px h-4 bg-border" />
            </>
          )}

          {/* Zoom Controls */}
          <div className="flex items-center gap-0.5 px-1">
            <button
              type="button"
              onClick={zoomOut}
              className="p-1 rounded-lg hover:bg-background transition-colors cursor-pointer"
              title="Thu nhỏ (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="font-semibold text-foreground min-w-11 text-center select-none">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={zoomIn}
              className="p-1 rounded-lg hover:bg-background transition-colors cursor-pointer"
              title="Phóng to (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Rotate & View Mode for PDF */}
          {isPdf && (
            <>
              <div className="w-px h-4 bg-border" />
              <button
                type="button"
                onClick={rotate}
                className="p-1.5 rounded-lg hover:bg-background transition-colors cursor-pointer"
                title="Xoay 90°"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode((m) => (m === "continuous" ? "single" : "continuous"))}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === "continuous"
                    ? "bg-background text-primary shadow-2xs font-semibold"
                    : "hover:bg-background text-muted-foreground"
                }`}
                title={viewMode === "continuous" ? "Chế độ cuộn liên tục" : "Chế độ từng trang"}
              >
                <Layers className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      )}

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {doc.downloadUrl && (
          <a
            href={doc.downloadUrl}
            download
            target="_blank"
            rel="noreferrer"
            className="h-8 px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors"
            title="Tải tệp về máy"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tải về</span>
          </a>
        )}

        {fileUrl && (
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Mở trong tab mới"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}

        <button
          type="button"
          onClick={toggleFullscreen}
          className="p-2 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors hidden sm:block cursor-pointer"
          title={isFullscreen ? "Thu nhỏ cửa sổ" : "Toàn màn hình"}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg bg-muted hover:bg-destructive/10 hover:text-destructive text-foreground transition-colors cursor-pointer"
          title="Đóng (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </header>
  );

  const renderBody = () => (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto bg-neutral-900/95 dark:bg-neutral-950 p-4 sm:p-8 flex flex-col items-center justify-start relative select-text"
    >
      {/* Loading Indicator */}
      {loading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-xs">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-xs font-semibold text-foreground">
            Đang nạp và kết xuất văn bản hợp đồng ({doc.documentType})...
          </p>
        </div>
      )}

      {/* Load Error State */}
      {loadError && (
        <div className="my-auto max-w-md w-full p-6 rounded-2xl bg-card border border-destructive/30 shadow-xl text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive mx-auto flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-foreground text-base">Không thể hiển thị tài liệu trực tiếp</h4>
            <p className="text-xs text-muted-foreground mt-1">{loadError}</p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            {fileUrl && (
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold inline-flex items-center gap-2 hover:bg-primary/90 transition-colors"
              >
                <ExternalLink className="w-4 h-4" /> Mở liên kết ngoài
              </a>
            )}
            {doc.downloadUrl && (
              <a
                href={doc.downloadUrl}
                download
                className="px-4 py-2 rounded-xl border border-border bg-card text-foreground text-xs font-semibold inline-flex items-center gap-2 hover:bg-muted transition-colors"
              >
                <Download className="w-4 h-4" /> Tải về
              </a>
            )}
          </div>
        </div>
      )}

      {/* PDF Viewer Canvas */}
      {isPdf && fileUrl && !loadError && (
        <Document
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading=""
          className="flex flex-col items-center gap-6 py-4"
        >
          {viewMode === "continuous" ? (
            Array.from(new Array(numPages), (_, index) => (
              <div
                key={`page_${index + 1}`}
                className="relative bg-white shadow-2xl rounded-sm overflow-hidden border border-neutral-700/50"
              >
                <Page
                  pageNumber={index + 1}
                  scale={scale}
                  rotate={rotation}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className="shadow-sm"
                />
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-medium backdrop-blur-xs select-none">
                  Trang {index + 1}
                </div>
              </div>
            ))
          ) : (
            <div className="relative bg-white shadow-2xl rounded-sm overflow-hidden border border-neutral-700/50">
              <Page
                pageNumber={pageNumber}
                scale={scale}
                rotate={rotation}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="shadow-sm"
              />
              <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-medium backdrop-blur-xs select-none">
                Trang {pageNumber} / {numPages}
              </div>
            </div>
          )}
        </Document>
      )}

      {/* DOCX In-browser Render Container */}
      {isDocx && !loadError && (
        <div
          className="w-full flex justify-center py-4 transition-transform duration-150 origin-top"
          style={{ transform: `scale(${scale / 1.15})` }}
        >
          <style jsx global>{`
            .docx-preview-root .docx-rendered-page,
            .docx-preview-root section.docx {
              background: white !important;
              color: black !important;
              padding: 48px 56px !important;
              margin: 0 auto 24px auto !important;
              box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.4), 0 8px 10px -6px rgb(0 0 0 / 0.4) !important;
              border-radius: 2px !important;
              max-width: 860px !important;
              min-height: 1100px !important;
              box-sizing: border-box !important;
            }
            .docx-preview-root table {
              border-collapse: collapse !important;
              width: 100% !important;
              margin: 12px 0 !important;
            }
            .docx-preview-root table td,
            .docx-preview-root table th {
              border: 1px solid #333 !important;
              padding: 6px 8px !important;
            }
            .docx-preview-root p {
              margin: 4px 0 !important;
              line-height: 1.5 !important;
            }
          `}</style>
          <div
            ref={docxContainerRef}
            className="docx-preview-root w-full flex flex-col items-center"
          />
        </div>
      )}
    </div>
  );

  // Fullscreen layout: fills 100% of screen edge-to-edge without any parent gap
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 w-screen h-screen h-[100dvh] flex flex-col bg-neutral-950 overflow-hidden animate-in fade-in duration-150">
        {renderHeader()}
        {renderBody()}
      </div>
    );
  }

  // Windowed layout: centered card with dark backdrop
  return (
    <div className="fixed inset-0 z-50 w-screen h-screen h-[100dvh] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative flex flex-col bg-background w-[96vw] max-w-6xl h-[92vh] max-h-[950px] rounded-2xl border border-border shadow-2xl overflow-hidden">
        {renderHeader()}
        {renderBody()}
      </div>
    </div>
  );
}
