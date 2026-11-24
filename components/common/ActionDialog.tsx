"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Info } from "lucide-react";

/**
 * Replacement for window.prompt / window.confirm on important actions (cancel, forfeit, confirm receipt…).
 *   const { confirm, askReason, dialog } = useActionDialog();
 *   const reason = await askReason({ title: "Đề nghị hủy", minLength: 10 });   // string | null (null = dismissed)
 *   if (await confirm({ title: "Xác nhận?", tone: "danger" })) …               // boolean
 *   return <>…{dialog}</>;
 * The text box shows how many characters are still missing instead of silently ignoring a short answer.
 */
export type DialogTone = "default" | "warning" | "danger";
interface Base { title: string; description?: ReactNode; confirmLabel?: string; cancelLabel?: string; tone?: DialogTone }
export interface ReasonOptions extends Base { label?: string; placeholder?: string; minLength?: number; maxLength?: number }
type Pending =
  | { id: number; kind: "confirm"; opts: Base; resolve: (value: boolean) => void }
  | { id: number; kind: "reason"; opts: ReasonOptions; resolve: (value: string | null) => void };
type NewPending = Omit<Extract<Pending, { kind: "confirm" }>, "id"> | Omit<Extract<Pending, { kind: "reason" }>, "id">;
let nextId = 0;

const stack: symbol[] = [];

export function useActionDialog() {
  const [pending, setPending] = useState<Pending | null>(null);
  const open = useRef<Pending | null>(null);
  // A second request while one is open dismisses the first (false / null) so its caller never waits forever.
  const show = useCallback((next: NewPending) => {
    const previous = open.current;
    if (previous?.kind === "confirm") previous.resolve(false); else previous?.resolve(null);
    const entry = { ...next, id: ++nextId } as Pending;
    open.current = entry;
    setPending(entry);
  }, []);
  const confirm = useCallback((opts: Base) => new Promise<boolean>((resolve) => show({ kind: "confirm", opts, resolve })), [show]);
  const askReason = useCallback((opts: ReasonOptions) => new Promise<string | null>((resolve) => show({ kind: "reason", opts, resolve })), [show]);

  const dialog = pending ? (
    <ActionDialogView
      key={pending.id}
      pending={pending}
      onDone={(value) => {
        if (pending.kind === "confirm") pending.resolve(Boolean(value));
        else pending.resolve(typeof value === "string" ? value : null);
        if (open.current === pending) open.current = null;
        setPending(null);
      }}
    />
  ) : null;
  return { confirm, askReason, dialog };
}

const toneStyle: Record<DialogTone, { tile: string; button: string; Icon: typeof Info }> = {
  default: { tile: "bg-primary/10 text-primary", button: "bg-primary text-primary-foreground hover:bg-primary/90", Icon: Info },
  warning: { tile: "bg-amber-500/10 text-amber-700 dark:text-amber-300", button: "bg-amber-600 text-white hover:bg-amber-600/90", Icon: AlertTriangle },
  danger: { tile: "bg-destructive/10 text-destructive", button: "bg-destructive text-white hover:bg-destructive/90", Icon: AlertTriangle },
};

function ActionDialogView({ pending, onDone }: { pending: Pending; onDone: (value: boolean | string | null) => void }) {
  const { opts } = pending;
  const tone = toneStyle[opts.tone ?? "default"];
  const isReason = pending.kind === "reason";
  const min = isReason ? (pending.opts.minLength ?? 10) : 0;
  const max = isReason ? (pending.opts.maxLength ?? 500) : 0;
  const [text, setText] = useState("");
  const [touched, setTouched] = useState(false);
  const titleId = useId();
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const okRef = useRef<HTMLButtonElement>(null);
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });

  const trimmed = text.trim();
  const missing = Math.max(0, min - trimmed.length);
  const valid = !isReason || missing === 0;

  useEffect(() => {
    const me = Symbol("action-dialog");
    stack.push(me);
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    (areaRef.current ?? okRef.current)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && stack[stack.length - 1] === me) {
        e.stopPropagation();
        doneRef.current(isReason ? null : false);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      stack.splice(stack.indexOf(me), 1);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [isReason]);

  const submit = () => {
    if (!valid) { setTouched(true); areaRef.current?.focus(); return; }
    onDone(isReason ? trimmed : true);
  };

  return createPortal(
    <div className="fixed inset-0 z-[20000] flex items-end justify-center sm:items-center sm:p-4">
      <div aria-hidden="true" className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => onDone(isReason ? null : false)} />
      <div
        role="dialog" aria-modal="true" aria-labelledby={titleId}
        className="relative z-10 flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-border bg-card text-card-foreground shadow-2xl motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 sm:rounded-3xl"
      >
        <div className="flex items-start gap-3 px-5 pt-5">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone.tile}`} aria-hidden="true"><tone.Icon className="h-5 w-5" /></div>
          <div className="min-w-0">
            <h3 id={titleId} className="text-base font-bold leading-snug">{opts.title}</h3>
            {opts.description ? <div className="mt-1 text-sm leading-relaxed text-muted-foreground">{opts.description}</div> : null}
          </div>
        </div>
        {isReason ? (
          <div className="px-5 pt-4">
            <label className="mb-1.5 block text-sm font-semibold" htmlFor={`${titleId}-reason`}>{pending.opts.label ?? "Lý do"}</label>
            <textarea
              id={`${titleId}-reason`} ref={areaRef} value={text} maxLength={max} rows={4}
              onChange={(e) => setText(e.target.value)} onBlur={() => setTouched(true)}
              placeholder={pending.opts.placeholder ?? `Nhập ít nhất ${min} ký tự`}
              aria-invalid={touched && !valid} aria-describedby={`${titleId}-hint`}
              className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-destructive"
            />
            <p id={`${titleId}-hint`} className={`mt-1 flex justify-between text-xs ${touched && !valid ? "font-semibold text-destructive" : "text-muted-foreground"}`}>
              <span>{missing > 0 ? `Cần nhập thêm ${missing} ký tự` : "Đã đủ nội dung"}</span>
              <span>{trimmed.length}/{max}</span>
            </p>
          </div>
        ) : null}
        <div className="mt-5 flex flex-col-reverse gap-2 border-t border-border bg-muted/30 px-5 py-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => onDone(isReason ? null : false)} className="min-h-11 rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {opts.cancelLabel ?? "Quay lại"}
          </button>
          <button ref={okRef} type="button" onClick={submit} className={`min-h-11 rounded-xl px-5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${tone.button} ${valid ? "" : "opacity-60"}`}>
            {opts.confirmLabel ?? "Xác nhận"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
