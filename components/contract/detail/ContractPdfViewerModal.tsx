"use client";

import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import type { ContractDocumentResponse } from "@/types/contract.type";

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

export default function ContractPdfViewerModal({
  isOpen,
  onClose,
  document: doc,
}: ContractPdfViewerModalProps) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen || !doc) return;
    const previous = window.document.activeElement;
    container.current?.focus();
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, [isOpen, doc]);
  if (!isOpen || !doc) return null;

  return createPortal(
    <div ref={container} role="dialog" aria-modal="true" aria-label={`Xem hợp đồng: ${doc.fileName || "PDF"}`} tabIndex={-1}
      className="relative z-[100]" onClick={event => event.stopPropagation()} onKeyDown={event => {
        if (event.key !== "Tab") return;
        const elements = Array.from(container.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex="0"]') ?? [])
          .filter(element => element.getClientRects().length > 0);
        const first = elements[0], last = elements[elements.length - 1];
        if (!first) { event.preventDefault(); return; }
        if (event.shiftKey && (window.document.activeElement === first || window.document.activeElement === container.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (window.document.activeElement === last || window.document.activeElement === container.current)) { event.preventDefault(); first.focus(); }
      }}>
    <DynamicPdfViewerContent
      key={`${doc.id}_${doc.viewUrl || doc.downloadUrl}`}
      onClose={onClose}
      document={doc}
    />
    </div>, window.document.body
  );
}
