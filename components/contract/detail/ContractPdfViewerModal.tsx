"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import type { ContractDocumentResponse } from "@/types/contract.type";
import { requiresVerifiedContent } from "@/lib/contract-document-history";
import { contractService } from "@/services/contract.service";

interface ContractPdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: ContractDocumentResponse | null;
}

// Dynamically import PDF viewer content with SSR disabled so pdfjs doesn't evaluate on Node server
const DynamicPdfViewerContent = dynamic(
  () => import("./ContractPdfViewerContent"),
  { ssr: false }
);

function SignedPdfContent({ document: doc, onClose }: { document: ContractDocumentResponse; onClose: () => void }) {
  const [content, setContent] = useState<{ identity: string; url?: string; error?: string } | null>(null);
  const [retry, setRetry] = useState(0);
  const identity = `${doc.id}:${doc.revisionId}`;
  useEffect(() => {
    const request = new AbortController();
    let url: string | undefined;
    contractService.getDocumentContent(doc.id, false, request.signal).then(bytes => {
      if (request.signal.aborted) return;
      url = URL.createObjectURL(bytes);
      setContent({ identity, url });
    }).catch(error => {
      if (!request.signal.aborted) setContent({ identity, error: error instanceof Error ? error.message : "Chưa xác thực được tài liệu." });
    });
    return () => { request.abort(); if (url) URL.revokeObjectURL(url); };
  }, [doc.id, identity, retry]);
  if (content?.identity === identity && content.url) {
    return <DynamicPdfViewerContent document={{ ...doc, viewUrl: content.url, downloadUrl: content.url }} onClose={onClose}/>;
  }
  return <div className="flex h-full items-center justify-center bg-background p-6"><div className="max-w-lg space-y-4 rounded-xl border p-6">
    {content?.identity === identity && content.error ? <>
      <p role="alert" className="text-sm">{content.error}</p>
      <button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={() => { setContent(null); setRetry(n => n + 1); }}>Thử lại</button>
    </> : <p role="status" className="text-sm">Đang kiểm tra và tải PDF đã ký…</p>}
    <button type="button" className="ml-3 rounded-lg border px-4 py-2 text-sm" onClick={onClose}>Đóng</button>
  </div></div>;
}

export default function ContractPdfViewerModal({
  isOpen,
  onClose,
  document: doc,
}: ContractPdfViewerModalProps) {
  const container = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!isOpen || !doc) return;
    const { body, activeElement: previous } = window.document;
    const originalOverflow = body.style.overflow;
    // Lock immediately, including while the PDF viewer chunk is still loading.
    body.style.overflow = "hidden";
    container.current?.focus({ preventScroll: true });
    return () => {
      body.style.overflow = originalOverflow;
      if (previous instanceof HTMLElement && previous.isConnected) {
        previous.focus({ preventScroll: true });
      }
    };
  }, [isOpen, doc]);
  if (!isOpen || !doc) return null;

  return createPortal(
    <div ref={container} role="dialog" aria-modal="true" aria-label={`Xem hợp đồng: ${doc.fileName || "PDF"}`} tabIndex={-1}
      className="fixed inset-0 z-[100]" onClick={event => event.stopPropagation()} onKeyDown={event => {
        if (event.key !== "Tab") return;
        const elements = Array.from(container.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex="0"]') ?? [])
          .filter(element => element.getClientRects().length > 0);
        const first = elements[0], last = elements[elements.length - 1];
        if (!first) { event.preventDefault(); return; }
        if (event.shiftKey && (window.document.activeElement === first || window.document.activeElement === container.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (window.document.activeElement === last || window.document.activeElement === container.current)) { event.preventDefault(); first.focus(); }
      }}>
    {requiresVerifiedContent(doc) ? <SignedPdfContent key={`${doc.id}:${doc.revisionId}`} document={doc} onClose={onClose}/> : <DynamicPdfViewerContent
      key={`${doc.id}_${doc.viewUrl || doc.downloadUrl}`}
      onClose={onClose}
      document={doc}
    />}
    </div>, window.document.body
  );
}
