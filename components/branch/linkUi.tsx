"use client";

import { useEffect, useId, useRef, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/utils/apiError";
import { outlineButton, ring } from "./LayoutBoard";

export const inputClass = `min-h-11 w-full min-w-0 rounded-xl border border-border bg-background px-3 text-base sm:text-sm ${ring}`;
export const noteClass = "rounded-xl border border-amber-500/60 bg-amber-500/10 p-3 text-sm";

/** The server's own reason when it sends one; otherwise plain Vietnamese. */
export function linkError(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return getApiErrorMessage(error, fallback);
  if (!error.response) return "Không kết nối được máy chủ.";
  const data = error.response.data as { message?: unknown; errors?: unknown } | undefined;
  return data?.message || data?.errors ? getApiErrorMessage(error, fallback) : `${fallback} (mã ${error.response.status})`;
}

/** One link write at a time. Reloads afterwards either way: a 409 or a lost response means the screen is stale. */
export function useLinkAction(reload: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const running = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const run = async (action: () => Promise<void>, success: string) => {
    if (running.current) return false;
    running.current = true;
    setBusy(true);
    setError("");
    let ok = false;
    try {
      await action();
      ok = true;
      toast.success(success);
    } catch (failure) {
      const reason = linkError(failure, "Chưa thực hiện được.");
      if (mounted.current) setError(reason);
      else toast.error(reason);
    }
    await reload();
    running.current = false;
    setBusy(false);
    return ok;
  };

  return { busy, error, run, clearError: () => setError("") };
}

export function ErrorNote({ message }: { message: string }) {
  return message ? (
    <p role="alert" className="rounded-xl border border-destructive/50 bg-card p-3 text-sm text-red-700 [overflow-wrap:anywhere] dark:text-red-300">{message}</p>
  ) : null;
}

/** `page` is 0-based. */
export function Pager({ page, pages, disabled, onPage, label }: {
  page: number; pages: number; disabled?: boolean; onPage: (page: number) => void; label: string;
}) {
  if (pages <= 1) return null;
  return (
    <nav aria-label={label} className="flex items-center justify-between gap-2">
      <button type="button" disabled={disabled || page <= 0} onClick={() => onPage(page - 1)} className={outlineButton}>Trước</button>
      <p aria-live="polite" className="text-sm text-muted-foreground">Trang {page + 1}/{pages}</p>
      <button type="button" disabled={disabled || page >= pages - 1} onClick={() => onPage(page + 1)} className={outlineButton}>Sau</button>
    </nav>
  );
}

/** A select with its confirm button ("move to", "place in"). */
export function SelectAction({ label, options, button, disabled, onSubmit }: {
  label: string; options: { value: string; label: string }[]; button: string; disabled?: boolean; onSubmit: (value: string) => void;
}) {
  const id = useId();
  const [chosen, setChosen] = useState(options[0]?.value ?? "");
  const value = options.some((o) => o.value === chosen) ? chosen : (options[0]?.value ?? "");
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">{label}</label>
      <div className="flex gap-2">
        <select id={id} value={value} onChange={(e) => setChosen(e.target.value)} className={inputClass}>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button type="button" disabled={disabled || options.length === 0} onClick={() => onSubmit(value)} className={`${outlineButton} shrink-0`}>{button}</button>
      </div>
    </div>
  );
}
