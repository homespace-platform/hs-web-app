"use client";

import React from "react";
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
  if (!isOpen || !doc) return null;

  return (
    <DynamicPdfViewerContent
      key={`${doc.id}_${doc.viewUrl || doc.downloadUrl}`}
      onClose={onClose}
      document={doc}
    />
  );
}
