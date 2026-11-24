"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { BookOpenText, Check, FileText, Info, TriangleAlert, X } from "lucide-react";
import { splitSentences } from "@/lib/split-sentences";

/** Policy codes like "RESERVATION_DEFAULT_V3" are internal; users only see "Phiên bản 3". */
function versionLabel(version?: string) {
  const n = version?.trim().match(/v?(\d+(?:\.\d+)*)$/i)?.[1];
  return n ? `Phiên bản ${n}` : null;
}

// Open dialogs, last = topmost. Esc closes only the topmost one.
const stack: symbol[] = [];

/** Modal shell for any wordy content (rules, terms, policies, notes). Use PolicyNotice / PolicyConsent on pages. */
export function PolicyDialog({
  open,
  onClose,
  title,
  subtitle,
  version,
  icon,
  children,
  text,
  footer,
  footerNote,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  version?: string;
  icon?: ReactNode;
  /** Rich body (lists keep their markup). Takes precedence over `text`. */
  children?: ReactNode;
  /** Plain text body: several sentences render as a numbered list, one sentence as a paragraph. */
  text?: string;
  /** Custom actions; default is a single primary "Đã hiểu". The first button gets focus. */
  footer?: ReactNode;
  footerNote?: ReactNode;
}) {
  const [edges, setEdges] = useState({ top: false, bottom: false });
  const bodyRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const measure = () => {
    const el = bodyRef.current;
    if (el) setEdges({ top: el.scrollTop > 2, bottom: el.scrollTop + el.clientHeight < el.scrollHeight - 2 });
  };

  useEffect(() => {
    if (!open) return;
    const me = Symbol("policy-dialog");
    stack.push(me);
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    footerRef.current?.querySelector<HTMLElement>("button")?.focus();
    measure();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || stack[stack.length - 1] !== me) return;
      e.preventDefault();
      e.stopPropagation(); // keep window-level Esc handlers of parent modals from closing too
      onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      stack.splice(stack.indexOf(me), 1);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  const items = children == null && text ? splitSentences(text) : [];

  return createPortal(
    <div
      className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:duration-200"
      >
        <div className="flex items-start gap-3 px-6 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden>
            {icon ?? <FileText className="h-5 w-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-base font-bold leading-tight">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p> : null}
            {versionLabel(version) ? (
              <span className="mt-1.5 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">{versionLabel(version)}</span>
            ) : null}
          </div>
          <button type="button" aria-label="Đóng" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div
          ref={bodyRef}
          onScroll={measure}
          tabIndex={0}
          className={`max-h-[60vh] min-h-0 flex-1 space-y-2.5 overflow-y-auto border-y px-6 py-5 text-sm leading-relaxed text-foreground/85 [scrollbar-width:thin] transition-colors [&_ul]:list-disc [&_ul]:space-y-2.5 [&_ul]:pl-5 [&_ul]:marker:text-primary [&_ol]:list-decimal [&_ol]:space-y-2.5 [&_ol]:pl-5 [&_ol]:marker:font-semibold [&_ol]:marker:text-primary ${edges.top ? "border-t-border" : "border-t-transparent"} ${edges.bottom ? "border-b-border" : "border-b-transparent"}`}
        >
          {children != null ? (
            children
          ) : items.length > 1 ? (
            <ol className="max-w-prose">
              {items.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ol>
          ) : (
            <p className="max-w-prose">{text}</p>
          )}
        </div>
        <div className="flex flex-col gap-3 bg-muted/30 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-[11px] text-muted-foreground">{footerNote}</div>
          <div ref={footerRef} className="flex justify-end gap-2">
            {footer ?? (
              <button type="button" onClick={onClose} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 cursor-pointer">
                Đã hiểu
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

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

/** Page-level replacement for wordy text: one short line + an icon button that opens the full content in a PolicyDialog. */
export function PolicyNotice({
  summary,
  title,
  children,
  text,
  tone = "info",
  icon,
  actionLabel = "Xem nội dung đầy đủ",
  subtitle,
  version,
  className = "",
}: {
  /** One short line. Omit when `text` is given to use its first sentence. */
  summary?: ReactNode;
  /** Modal title. */
  title: string;
  children?: ReactNode;
  text?: string;
  tone?: keyof typeof TONES;
  icon?: ReactNode;
  /** Never rendered: only the aria-label ("{actionLabel}: {title}") and tooltip. The trigger is an icon so it is not read as a feature. */
  actionLabel?: string;
  subtitle?: string;
  version?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ToneIcon = tone === "warning" ? TriangleAlert : Info;
  return (
    <>
    {/* Row click is a mouse convenience; the icon <button> stays the only tab stop. */}
    <div onClick={() => setOpen(true)} className={`flex cursor-pointer items-start gap-2 rounded-2xl border px-3 py-2.5 text-xs sm:text-sm ${TONES[tone]} ${className}`}>
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${TILES[tone]}`} aria-hidden>
        {icon ?? <ToneIcon className="h-4 w-4" />}
      </span>
      <div className="min-w-0 flex-1 self-center font-medium">{summary ?? (text ? splitSentences(text)[0] : null)}</div>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={`${actionLabel}: ${title}`}
        title={actionLabel}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center self-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:h-8 sm:w-8"
      >
        <BookOpenText className="h-4 w-4" aria-hidden />
      </button>
    </div>
    {/* Sibling, not child: portal events bubble through React and would re-trigger the row onClick. */}
    <PolicyDialog open={open} onClose={() => setOpen(false)} title={title} subtitle={subtitle} version={version} icon={icon ?? <ToneIcon className="h-5 w-5" />} text={text}>
      {children}
    </PolicyDialog>
    </>
  );
}

/**
 * Inline link inside a consent sentence that opens the full terms.
 * "Đồng ý & đóng" calls onAgree (should set the same state as the checkbox); "Đã hiểu" never does.
 */
export function PolicyConsent({
  label,
  title,
  version,
  text,
  children,
  onAgree,
}: {
  label: ReactNode;
  title: string;
  version?: string;
  text?: string;
  children?: ReactNode;
  onAgree?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <>
      <button type="button" aria-haspopup="dialog" onClick={() => setOpen(true)} className="font-semibold text-primary underline underline-offset-2 cursor-pointer">
        {label}
      </button>
      <PolicyDialog
        open={open}
        onClose={close}
        title={title}
        subtitle="Vui lòng đọc kỹ trước khi đồng ý"
        version={version}
        text={text}
        footerNote="Bạn vẫn cần tích ô đồng ý trong biểu mẫu"
        footer={
          <>
            <button type="button" onClick={close} className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted cursor-pointer">
              Đã hiểu
            </button>
            {onAgree ? (
              <button
                type="button"
                onClick={() => {
                  onAgree();
                  close();
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 cursor-pointer"
              >
                <Check className="h-4 w-4" aria-hidden />
                Đồng ý &amp; đóng
              </button>
            ) : null}
          </>
        }
      >
        {children}
      </PolicyDialog>
    </>
  );
}
