"use client";

import { useCallback, useEffect, useState, type ComponentType } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Download, X } from "lucide-react";
import { toast } from "sonner";
import { fetchChatDocument, type ChatDocumentFormat } from "@/lib/chat-document-preview";
import type { ChatDocumentContentProps } from "./ChatDocumentContent";

const timeoutMs = 25_000;

export default function ChatDocumentModal({ fileName, format, getUrl, onClose }: {
  fileName: string;
  format: ChatDocumentFormat;
  getUrl: () => Promise<string>;
  onClose: () => void;
}) {
  const [preview, setPreview] = useState<{ file: Blob; Content: ComponentType<ChatDocumentContentProps> }>();
  const [failed, setFailed] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const reportFailure = useCallback(() => setFailed(true), []);

  useEffect(() => {
    let current = true;
    const request = new AbortController();
    const timer = window.setTimeout(() => {
      request.abort();
      if (current) setFailed(true);
    }, timeoutMs);
    void Promise.all([fetchChatDocument(getUrl, request.signal), import("./ChatDocumentContent")])
      .then(([file, { default: Content }]) => {
        if (current && !request.signal.aborted) setPreview({ file, Content });
      })
      .catch(() => { if (current) setFailed(true); })
      .finally(() => window.clearTimeout(timer));
    return () => { current = false; request.abort(); window.clearTimeout(timer); };
  }, [attempt, getUrl]);

  async function download() {
    setDownloading(true);
    try {
      const file = preview?.file ?? await fetchChatDocument(getUrl, AbortSignal.timeout(timeoutMs));
      const objectUrl = URL.createObjectURL(file);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = fileName;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      toast.error("Không thể tải tệp đính kèm");
    } finally {
      setDownloading(false);
    }
  }

  return <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/65" />
      <Dialog.Content aria-describedby={undefined} className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-card sm:inset-6 sm:rounded-2xl">
        <header className="flex min-h-14 shrink-0 items-center gap-2 border-b border-border px-3 sm:px-4">
          <Dialog.Title className="min-w-0 flex-1 truncate text-sm font-semibold" title={fileName}>{fileName}</Dialog.Title>
          <button type="button" onClick={() => void download()} disabled={downloading} aria-label="Tải xuống" className="inline-flex h-11 items-center gap-2 rounded-lg px-3 text-sm hover:bg-muted disabled:opacity-50">
            <Download className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">{downloading ? "Đang tải…" : "Tải xuống"}</span>
          </button>
          <Dialog.Close aria-label="Đóng tài liệu" className="grid size-11 place-items-center rounded-lg hover:bg-muted"><X className="size-5" /></Dialog.Close>
        </header>
        {failed ? <div className="m-auto grid justify-items-center gap-3 p-4 text-center">
          <p role="alert">Không thể mở tài liệu.</p>
          <button type="button" onClick={() => { setPreview(undefined); setFailed(false); setAttempt((value) => value + 1); }} className="rounded-lg border border-border px-3 py-2 text-sm">Thử lại</button>
        </div> : preview ? <preview.Content file={preview.file} format={format} fileName={fileName} onError={reportFailure} /> : <p role="status" className="m-auto p-4">Đang tải bản xem trước…</p>}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
