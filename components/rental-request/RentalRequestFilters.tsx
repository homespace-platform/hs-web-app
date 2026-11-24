"use client";

import type { RequestFilter } from "./useRentalRequestList";

const STATUS_FILTER_TABS: Array<{ key: RequestFilter; label: string }> = [
  { key: "ALL", label: "Tất cả" },
  { key: "PENDING", label: "Chờ duyệt" },
  { key: "ACCEPTED", label: "Đang xử lý thuê" },
  { key: "COMPLETED", label: "Đã thuê" },
  { key: "REJECTED", label: "Bị từ chối" },
  { key: "EXPIRED", label: "Hết hạn" },
  { key: "CANCELLED", label: "Đã hủy" },
];

/** Status filter chips. Scrolls sideways on a phone (no page-level horizontal scroll). */
export default function RentalRequestFilters({ value, onChange }: { value: RequestFilter; onChange: (filter: RequestFilter) => void }) {
  return (
    <div role="group" aria-label="Lọc theo trạng thái" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
      {STATUS_FILTER_TABS.map((tab) => (
        <button
          key={tab.key} type="button" aria-pressed={value === tab.key} onClick={() => onChange(tab.key)}
          className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            value === tab.key ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
