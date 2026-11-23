"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Info, TriangleAlert, X } from "lucide-react";

const TONES = {
  info: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100",
  warning: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
  neutral: "border-border bg-muted/40 text-muted-foreground",
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
    <div className={`rounded-xl border px-3 py-2 text-xs sm:text-sm ${TONES[tone]} ${className}`}>
      <div className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0" aria-hidden>
          {icon ?? (tone === "warning" ? <TriangleAlert className="h-4 w-4" /> : <Info className="h-4 w-4" />)}
        </span>
        <div className="min-w-0 flex-1 font-medium">{summary}</div>
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
          className="mt-2 space-y-1.5 pl-6 font-normal leading-relaxed motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Inline button that opens an accessible dialog with the full terms (for consent labels).
 * onAgree (optional) renders "Đồng ý & đóng" which should set the same state the checkbox sets.
 * Portaled above other modals (z-[20000]); Esc closes only this dialog.
 */
export function TermsDialog({
  label,
  title,
  version,
  children,
  onAgree,
}: {
  label: ReactNode;
  title: string;
  version?: string;
  children: ReactNode;
  onAgree?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    closeRef.current?.focus();
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
            className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/60 p-4"
            onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-border bg-card text-card-foreground shadow-xl"
            >
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <h2 id={titleId} className="text-sm font-bold">{title}</h2>
                <button type="button" aria-label="Đóng" onClick={() => setOpen(false)} className="rounded-lg p-1 hover:bg-muted cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm leading-relaxed">
                {children}
                {version ? <p className="mt-3 text-xs text-muted-foreground">Phiên bản: {version}</p> : null}
              </div>
              <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
                <button ref={closeRef} type="button" onClick={() => setOpen(false)} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted cursor-pointer">
                  Đã hiểu
                </button>
                {onAgree ? (
                  <button
                    type="button"
                    onClick={() => {
                      onAgree();
                      setOpen(false);
                    }}
                    className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground cursor-pointer"
                  >
                    Đồng ý &amp; đóng
                  </button>
                ) : null}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
