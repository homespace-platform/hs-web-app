"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { clampPage, getVisiblePages } from "@/lib/pagination";

const btn = "inline-flex size-9 items-center justify-center rounded-lg border bg-card text-sm font-semibold hover:bg-muted disabled:opacity-40 disabled:hover:bg-card";

export default function Pagination({
  page,
  pages,
  total,
  onPage,
  disabled = false,
}: {
  page: number;
  pages: number;
  total: number;
  onPage: (page: number) => void;
  disabled?: boolean;
}) {
  const current = clampPage(page, pages),
    go = (p: number) => () => onPage(clampPage(p, pages));
  return (
    <nav aria-label="Phân trang" className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-muted-foreground">
        Trang {current} / {pages} · {total} giao dịch
      </p>
      <div className="flex items-center gap-1.5">
        <button type="button" aria-label="Trang đầu" disabled={disabled || current <= 1} onClick={go(1)} className={btn}>
          <ChevronsLeft className="size-4" />
        </button>
        <button type="button" aria-label="Trang trước" disabled={disabled || current <= 1} onClick={go(current - 1)} className={btn}>
          <ChevronLeft className="size-4" />
        </button>
        {getVisiblePages(current, pages).map((p, i) => p === "ellipsis" ? (
          <span key={`gap${i}`} aria-hidden className="px-1 text-muted-foreground">…</span>
        ) : (
          <button
            key={p}
            type="button"
            aria-label={`Trang ${p}`}
            aria-current={p === current ? "page" : undefined}
            disabled={disabled}
            onClick={go(p)}
            className={`${btn} ${p === current ? "border-primary bg-primary text-primary-foreground hover:bg-primary" : ""}`}
          >
            {p}
          </button>
        ))}
        <button type="button" aria-label="Trang sau" disabled={disabled || current >= pages} onClick={go(current + 1)} className={btn}>
          <ChevronRight className="size-4" />
        </button>
        <button type="button" aria-label="Trang cuối" disabled={disabled || current >= pages} onClick={go(pages)} className={btn}>
          <ChevronsRight className="size-4" />
        </button>
      </div>
    </nav>
  );
}
