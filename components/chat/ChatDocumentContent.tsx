"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import type { ChatDocumentFormat } from "@/lib/chat-document-preview";
import styles from "./ChatDocumentContent.module.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

const wordFrame = `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; base-uri 'none'; form-action 'none'">
<style>body{margin:0;overflow-wrap:break-word}img{max-width:100%;height:auto}a{pointer-events:none;color:inherit}</style>
</head><body></body></html>`;

async function wordPreview(bytes: ArrayBuffer, format: "doc" | "docx") {
  let docx = new Uint8Array(bytes);
  if (format === "doc") {
    const [{ parseDocument }, { generateDocument }] = await Promise.all([
      import("@office-open/doc"), import("@office-open/docx"),
    ]);
    docx = new Uint8Array(await generateDocument(parseDocument(docx)));
  }
  const { renderAsync } = await import("docx-preview");
  const frame = new DOMParser().parseFromString(wordFrame, "text/html");
  const wordStyles = frame.createElement("div");
  await renderAsync(docx, frame.body, wordStyles, {
    inWrapper: false,
    ignoreWidth: true,
    ignoreHeight: true,
    renderAltChunks: false,
    useBase64URL: true,
  });
  frame.head.append(...wordStyles.childNodes);
  frame.body.querySelectorAll("a[href]").forEach((link) => link.removeAttribute("href"));
  return `<!doctype html>${frame.documentElement.outerHTML}`;
}

const loading = <p role="status" className={styles.status}>Đang tải bản xem trước…</p>;

function PdfPreview({ file, onError }: { file: Blob; onError: () => void }) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(320);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return;
    const timer = window.setTimeout(onError, 30_000);
    return () => window.clearTimeout(timer);
  }, [onError, ready]);

  useEffect(() => {
    const target = container.current;
    if (!target) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(1, Math.floor(entry.contentRect.width))));
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return <>
    {pages > 1 && <nav className={styles.toolbar} aria-label="Trang PDF">
      <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>Trang trước</button>
      <span aria-live="polite">{page} / {pages}</span>
      <button type="button" disabled={page === pages} onClick={() => setPage(page + 1)}>Trang sau</button>
    </nav>}
    <div ref={container} className={styles.page}>
      <Document file={file} loading={loading} onSourceError={onError} onLoadError={onError} onLoadSuccess={({ numPages }) => setPages(numPages)}>
        <Page pageNumber={page} width={Math.min(width, 960)} renderAnnotationLayer={false} loading={loading} onLoadError={onError} onRenderError={onError} onRenderSuccess={() => setReady(true)} />
      </Document>
    </div>
  </>;
}

export type ChatDocumentContentProps = {
  file: Blob;
  format: ChatDocumentFormat;
  fileName: string;
  onError: () => void;
};

export default function ChatDocumentContent({ file, format, fileName, onError }: ChatDocumentContentProps) {
  const [word, setWord] = useState<string>();

  useEffect(() => {
    if (format === "pdf") return;
    let current = true;
    const timer = window.setTimeout(onError, 30_000);
    void file.arrayBuffer().then((bytes) => wordPreview(bytes, format)).then((html) => {
      if (current) setWord(html);
    }).catch(() => { if (current) onError(); }).finally(() => window.clearTimeout(timer));
    return () => { current = false; window.clearTimeout(timer); };
  }, [file, format, onError]);

  return <div className={styles.viewer}>
    {format === "pdf" ? <PdfPreview file={file} onError={onError} /> : word
      ? <iframe title={fileName} sandbox="" className={styles.word} srcDoc={word} /> : loading}
  </div>;
}
