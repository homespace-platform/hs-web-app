"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Search } from "lucide-react";

export type SearchableSelectOption = {
  value: string;
  label: string;
};

type SearchableSelectProps = {
  value: string;
  options: SearchableSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  loading?: boolean;
};

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function SearchableSelect({
  value,
  options,
  onChange,
  placeholder = "Chọn",
  searchPlaceholder = "Tìm...",
  emptyText = "Không tìm thấy",
  disabled = false,
  loading = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = options.find((option) => option.value === value);

  const filtered = useMemo(() => {
    const needle = normalize(query);
    if (!needle) return options;
    return options.filter((option) => normalize(option.label).includes(needle));
  }, [options, query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
          setQuery("");
        }}
        className={`flex w-full h-10 items-center justify-between gap-2 px-3.5 rounded-xl border text-left text-xs sm:text-sm transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
          open
            ? "border-primary bg-background text-foreground"
            : "border-border bg-muted/50 text-foreground hover:border-primary/40"
        }`}
      >
        <span className={`truncate ${selected ? "font-medium" : "text-muted-foreground"}`}>
          {loading && !selected ? "Đang tải..." : selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 z-40 bg-popover text-popover-foreground rounded-2xl shadow-2xl border border-border p-2 animate-in fade-in-50 zoom-in-95">
          <div className="relative mb-2 px-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted rounded-lg border border-border focus:outline-none focus:border-primary text-foreground"
              autoFocus
            />
          </div>
          <div className="max-h-56 overflow-y-auto space-y-0.5">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                <span>Đang tải danh sách...</span>
              </div>
            ) : filtered.length > 0 ? (
              filtered.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-primary/10 text-primary font-bold"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">{emptyText}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
