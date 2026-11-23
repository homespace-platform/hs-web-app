"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import type { Bank } from "@/types/bank-account.type";
import BankLogo from "./BankLogo";

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").toLowerCase();

export default function BankPicker({
  banks,
  value,
  onChange,
  loading = false,
  error = false,
  onRetry,
}: {
  banks: Bank[];
  value: string;
  onChange: (bin: string) => void;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  const selected = banks.find((b) => b.bin === value) ?? banks[0];
  const unavailable = !selected;

  const list = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return banks;
    return banks.filter((b) => norm(`${b.code} ${b.shortName} ${b.name} ${b.bin}`).includes(q));
  }, [query, banks]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (open) document.getElementById(`${id}-opt-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, open, id]);

  function openPicker() {
    setQuery("");
    setActive(Math.max(0, banks.findIndex((b) => b.bin === selected?.bin)));
    setOpen(true);
  }

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function pick(bin: string) {
    onChange(bin);
    close();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, list.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (list[active]) pick(list[active].bin);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  }

  if (unavailable) {
    return error ? (
      <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
        <span>Không thể tải danh sách ngân hàng.</span>
        <button type="button" onClick={onRetry} className="shrink-0 rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2">
          Thử lại
        </button>
      </div>
    ) : (
      <button type="button" disabled aria-busy={loading} aria-label="Ngân hàng thụ hưởng" className="flex h-12 w-full animate-pulse items-center gap-3 rounded-xl border border-border bg-muted px-3 text-left text-sm text-muted-foreground">
        Đang tải danh sách ngân hàng...
      </button>
    );
  }

  return (
    <div ref={rootRef} className="space-y-2">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Ngân hàng thụ hưởng"
        onClick={() => (open ? setOpen(false) : openPicker())}
        className="flex h-12 w-full items-center gap-3 rounded-xl border border-border bg-background px-3 text-left transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <BankLogo src={selected.logo} code={selected.code} className="h-8 w-12" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-foreground">{selected.shortName}</span>
          <span className="block truncate text-xs text-muted-foreground">{selected.name}</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              role="combobox"
              aria-expanded
              aria-controls={`${id}-list`}
              aria-activedescendant={list[active] ? `${id}-opt-${active}` : undefined}
              aria-label="Tìm ngân hàng"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Tìm theo tên, mã ngân hàng..."
              className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <ul id={`${id}-list`} role="listbox" aria-label="Danh sách ngân hàng" className="max-h-56 overflow-y-auto p-1">
            {list.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">Không tìm thấy ngân hàng phù hợp.</li>
            )}
            {list.map((b, i) => (
              <li
                key={b.bin}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={b.bin === selected.bin}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(b.bin)}
                className={`flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 ${
                  i === active ? "bg-muted" : ""
                }`}
              >
                <BankLogo src={b.logo} code={b.code} className="h-8 w-12" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-foreground">{b.shortName}</span>
                  <span className="block truncate text-xs text-muted-foreground">{b.name}</span>
                </span>
                {b.bin === selected.bin && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
