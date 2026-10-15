"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { canonicalVnd, formatVndInput, parsePastedVnd, vndSuggestions } from "@/lib/vnd-input";
import { cn } from "@/lib/utils";

interface Props {
  label?: string; ariaLabel?: string; value: unknown; onValueChange: (value: string) => void;
  disabled?: boolean; min?: number; max?: number; placeholder?: string; hint?: ReactNode; className?: string;
}
export default function VndMoneyInput({ label, ariaLabel, value, onValueChange, disabled, min = 0, max = 1_000_000_000, placeholder = "Nhập số tiền", hint, className }: Props) {
  const id = useId(), root = useRef<HTMLDivElement>(null), input = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false), [edited, setEdited] = useState(false), [inputError, setInputError] = useState("");
  const raw = canonicalVnd(value), display = formatVndInput(value);
  const numeric = Number(raw);
  const rangeError = raw && (!/^\d+$/.test(raw) || !Number.isSafeInteger(numeric) || numeric < min || numeric > max)
    ? `Nhập số tiền VNĐ nguyên từ ${formatVndInput(min)} đến ${formatVndInput(max)} đ.` : "";
  const error = inputError || rangeError;
  const suggestions = focused && edited && !disabled && !error ? vndSuggestions(raw,max) : [];
  const restoreCaret = (digitsBefore: number, next: string) => {
    requestAnimationFrame(() => {
      if (!input.current || document.activeElement !== input.current) return;
      const formatted = formatVndInput(next); let position = 0, count = 0;
      while (position < formatted.length && count < digitsBefore) { if (/\d/.test(formatted[position])) count++; position++; }
      input.current.setSelectionRange(position,position);
    });
  };
  const change = (next: string, digitsBefore: number) => {
    const clean = next.replace(/^0+(?=\d)/, "");
    setInputError(""); setEdited(true); onValueChange(clean); restoreCaret(digitsBefore,clean);
  };
  return <div ref={root} className={cn("min-w-0",className)} onBlurCapture={e => {
    if (!root.current?.contains(e.relatedTarget as Node | null)) setFocused(false);
  }}>
    {label && <label htmlFor={id} className="block text-xs font-medium">{label}</label>}
    <div className="relative mt-1">
      <input ref={input} id={id} type="text" inputMode="numeric" autoComplete="off" aria-label={ariaLabel ?? label}
        aria-invalid={!!error} aria-describedby={`${id}-hint ${id}-error`} value={display} disabled={disabled} placeholder={placeholder}
        onFocus={() => setFocused(true)} onChange={e => {
          const entered = e.target.value;
          if (!/^[\d.,\s]*$/.test(entered)) { setInputError("Chỉ nhập số tiền VNĐ nguyên, không dùng số âm hoặc ký hiệu e."); return; }
          const before = entered.slice(0,e.target.selectionStart ?? entered.length).replace(/\D/g, "").length;
          change(entered.replace(/\D/g, ""),before);
        }}
        onPaste={e => {
          e.preventDefault(); const pasted = parsePastedVnd(e.clipboardData.getData("text"));
          if (pasted === null) { setInputError("Dán số tiền VNĐ nguyên; không nhập số âm hoặc phần thập phân."); return; }
          const start = e.currentTarget.selectionStart ?? display.length, end = e.currentTarget.selectionEnd ?? start;
          const before = display.slice(0,start).replace(/\D/g, ""), after = display.slice(end).replace(/\D/g, "");
          change(before + pasted + after,before.length + pasted.length);
        }}
        onKeyDown={e => {
          const element = e.currentTarget, position = element.selectionStart ?? 0;
          if (position !== element.selectionEnd) return;
          const remove = e.key === "Backspace" && display[position - 1] === "." ? position - 2
            : e.key === "Delete" && display[position] === "." ? position + 1 : -1;
          if (remove < 0 || remove >= display.length) return;
          e.preventDefault(); const next = (display.slice(0,remove) + display.slice(remove + 1)).replace(/\D/g, "");
          change(next,display.slice(0,e.key === "Backspace" ? remove : position).replace(/\D/g, "").length);
        }}
        className={cn("w-full min-w-0 rounded-lg border border-input bg-background py-2.5 pl-3 pr-9 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-muted disabled:text-muted-foreground",error && "border-rose-400")}
      />
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">đ</span>
    </div>
    {suggestions.length > 0 && <div role="group" aria-label={`Gợi ý số tiền ${ariaLabel ?? label ?? ""}`} className="mt-2 rounded-lg border bg-muted/20 p-2">
      <p className="mb-1.5 text-[11px] text-muted-foreground">Chọn nhanh số tiền · Không tự cộng thêm số 0</p>
      <div className="flex flex-wrap gap-1.5">{suggestions.map(amount => <button key={amount} type="button" disabled={disabled} onMouseDown={e => e.preventDefault()}
        onClick={() => { onValueChange(amount); setInputError(""); setEdited(false); input.current?.focus(); }}
        className="rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium text-primary hover:border-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-primary">{formatVndInput(amount)} đ</button>)}</div>
    </div>}
    <div id={`${id}-error`} aria-live="polite">{error && <p className="mt-1 text-xs text-rose-700">{error}</p>}</div>
    <div id={`${id}-hint`}>{hint && <p className="mt-1 text-xs font-normal text-muted-foreground">{hint}</p>}</div>
  </div>;
}
