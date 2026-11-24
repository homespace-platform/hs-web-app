"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

const stack: symbol[] = [];

/**
 * Shared frame of the rental modals: bottom sheet on phones, centred card on desktop, Esc / backdrop close, scroll lock.
 * A plain overlay (not a native <dialog>) on purpose: ActionDialog renders above it, a top-layer <dialog> would hide that.
 */
export default function ModalShell({ title, icon, headerExtra, onClose, closeDisabled = false, size = "lg", footer, children }: {
  title: ReactNode; icon?: ReactNode; headerExtra?: ReactNode; onClose: () => void; closeDisabled?: boolean;
  size?: "md" | "lg" | "xl"; footer?: ReactNode; children: ReactNode;
}) {
  const titleId = useId();
  const closeRef = useRef(onClose);
  const lockedRef = useRef(closeDisabled);
  useEffect(() => { closeRef.current = onClose; lockedRef.current = closeDisabled; });
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const me = Symbol("rental-modal");
    stack.push(me);
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && stack[stack.length - 1] === me && !lockedRef.current) closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      stack.splice(stack.indexOf(me), 1);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);

  const width = size === "md" ? "sm:max-w-xl" : size === "xl" ? "sm:max-w-5xl" : "sm:max-w-3xl";
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div aria-hidden="true" className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => { if (!closeDisabled) onClose(); }} />
      <div
        ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId}
        className={`relative z-10 flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-background text-foreground shadow-2xl outline-none motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 sm:max-h-[90dvh] sm:rounded-3xl ${width}`}
      >
        <header className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            {icon ? <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">{icon}</span> : null}
            <h2 id={titleId} className="min-w-0 truncate text-base font-bold sm:text-lg">{title}</h2>
            {headerExtra}
          </div>
          <button
            type="button" disabled={closeDisabled} onClick={onClose} aria-label="Đóng"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6 sm:py-5">{children}</div>
        {footer ? <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-card px-4 py-3 sm:px-6">{footer}</footer> : null}
      </div>
    </div>
  );
}
