"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, FileText, Info, TriangleAlert, X } from "lucide-react";
import { splitSentences } from "@/lib/split-sentences";

const TONES = {
  info: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100",
  warning: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
  neutral: "border-border bg-muted/40 text-muted-foreground",
} as const;
const TILES = {
  info: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
  warning: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
  neutral: "bg-primary/10 text-primary",
} as const;

type Tone = keyof typeof TONES;

/** Compact notice: one-line summary always visible, full text expands in place on demand. */
export function InfoDisclosure({
  summary,
  children,
  tone = "info",
  icon,
  toggleLabel = "Xem chi tiết",
  className = "",
}: {
  summary: ReactNode;
  children?: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
  toggleLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className={`rounded-2xl border px-3 py-2.5 text-xs sm:text-sm ${TONES[tone]} ${className}`}>
      <div className="flex items-start gap-2">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${TILES[tone]}`} aria-hidden>
          {icon ?? (tone === "warning" ? <TriangleAlert className="h-4 w-4" /> : <Info className="h-4 w-4" />)}
        </span>
        <div className="min-w-0 flex-1 self-center font-medium">{summary}</div>
        {children ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={id}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex shrink-0 items-center gap-1 rounded-md font-semibold underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 cursor-pointer"
          >
            {open ? "Thu gọn" : toggleLabel}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} aria-hidden />
          </button>
        ) : null}
      </div>
      {children ? (
        <div
          id={id}
          hidden={!open}
          className="mt-2 space-y-1.5 pl-9 font-normal leading-relaxed motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Inline button that opens an accessible dialog with the full terms (for consent labels).
 * onAgree renders "Đồng ý & đóng" which should set the same state the checkbox sets ("Đã hiểu" never does).
 * Portaled above other modals (z-[20000]); Esc closes only this dialog.
 */
export function TermsDialog({
  label,
  title,
  version,
  text,
  onAgree,
}: {
  label: ReactNode;
  title: string;
  version?: string;
  text: string;
  onAgree?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [edges, setEdges] = useState({ top: false, bottom: false });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const items = splitSentences(text);

  const measure = () => {
    const el = bodyRef.current;
    if (el) setEdges({ top: el.scrollTop > 2, bottom: el.scrollTop + el.clientHeight < el.scrollHeight - 2 });
  };

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    closeRef.current?.focus();
    measure();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation(); // keep window-level Esc handlers of parent modals from closing too
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="font-semibold text-primary underline underline-offset-2 cursor-pointer"
      >
        {label}
      </button>
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
            onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:duration-200"
            >
              <div className="flex items-start gap-3 px-6 py-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden>
                  <FileText className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 id={titleId} className="text-base font-bold leading-tight">{title}</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">Vui lòng đọc kỹ trước khi đồng ý</p>
                  {version ? (
                    <span className="mt-1.5 inline-block rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">{version}</span>
                  ) : null}
                </div>
                <button type="button" aria-label="Đóng" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div
                ref={bodyRef}
                onScroll={measure}
                tabIndex={0}
                className={`max-h-[60vh] min-h-0 flex-1 overflow-y-auto border-y px-6 py-5 [scrollbar-width:thin] transition-colors ${edges.top ? "border-t-border" : "border-t-transparent"} ${edges.bottom ? "border-b-border" : "border-b-transparent"}`}
              >
                {items.length > 1 ? (
                  <ol className="max-w-prose space-y-2.5 text-sm leading-relaxed text-foreground/85">
                    {items.map((t, i) => (
                      <li key={i} className="flex gap-2.5">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary" aria-hidden>{i + 1}</span>
                        <span className="min-w-0">{t}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="max-w-prose text-sm leading-relaxed text-foreground/85">{text}</p>
                )}
              </div>
              <div className="flex flex-col gap-3 bg-muted/30 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[11px] text-muted-foreground">Bạn vẫn cần tích ô đồng ý trong biểu mẫu</p>
                <div className="flex justify-end gap-2">
                  <button ref={closeRef} type="button" onClick={() => setOpen(false)} className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted cursor-pointer">
                    Đã hiểu
                  </button>
                  {onAgree ? (
                    <button
                      type="button"
                      onClick={() => {
                        onAgree();
                        setOpen(false);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 cursor-pointer"
                    >
                      <Check className="h-4 w-4" aria-hidden />
                      Đồng ý &amp; đóng
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
