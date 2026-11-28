import type { ReactNode } from "react";

export type PdfState = "READY" | "PENDING" | "FAILED";

const action = "inline-flex min-h-9 items-center rounded-lg border bg-card px-3 text-sm font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-card";

/** One receipt row, identical on the rental and membership tabs: icon, title, subtitle, amount, status, Xem + Tải PDF. */
export default function ReceiptRow({
  icon,
  title,
  subtitle,
  amount,
  status,
  pdfStatus,
  busy = false,
  onView,
  onPdf,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  amount: string;
  /** Status badge under the amount; a not-ready PDF replaces it with "Đang tạo PDF". */
  status: ReactNode;
  pdfStatus: PdfState;
  busy?: boolean;
  onView: () => void;
  onPdf: () => void;
}) {
  const ready = pdfStatus === "READY";
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <span className="shrink-0 text-primary" aria-hidden>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{title}</span>
        <span className="block truncate text-sm text-muted-foreground">{subtitle}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-sm font-bold tabular-nums text-primary">{amount}</span>
        {pdfStatus === "PENDING" ? (
          <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-800">Đang tạo PDF</span>
        ) : (
          status
        )}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <button type="button" aria-label={`Xem biên nhận ${title}`} onClick={onView} className={`${action} border-primary/30 text-primary`}>
          Xem
        </button>
        {/* title sits on the wrapper: disabled buttons do not show tooltips in every browser. */}
        <span title={ready ? undefined : pdfStatus === "FAILED" ? "PDF chưa tạo được. Mở Xem để thử lại." : "PDF đang được tạo"}>
          <button type="button" aria-label={`Tải PDF ${title}`} disabled={!ready || busy} onClick={onPdf} className={action}>
            Tải PDF
          </button>
        </span>
      </span>
    </li>
  );
}

export const Badge = ({ tone = "ok", children }: { tone?: "ok" | "warn"; children: ReactNode }) => (
  <span
    className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${tone === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}
  >
    {children}
  </span>
);

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
