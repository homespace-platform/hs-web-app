"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ChevronRight, RefreshCw } from "lucide-react";
import { useNowMs } from "@/hooks/useNowMs";
import { useRefetchOnReturn } from "@/hooks/useRefetchOnReturn";
import { pageCount } from "@/lib/branch-assignment";
import branchOverviewService, {
  PRIORITY_LABEL, targetHref, workContext, workDeadline, workLabel, type WorkPriority,
} from "@/services/branch-overview.service";
import { outlineButton, ring } from "./LayoutBoard";
import { ErrorNote, Pager, linkError } from "./linkUi";

const PRIORITY_CLASS: Record<WorkPriority, string> = {
  URGENT: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  SOON: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  NORMAL: "bg-muted text-foreground",
};
const describe = (error: unknown) => linkError(error, "Máy chủ chưa trả lời được.");

/** "Cần chú ý" of one branch. Mounted only while its tab is shown, so coming back always reads again. */
export default function BranchAttentionList({ branchId }: { branchId: string }) {
  const [page, setPage] = useState(0);
  const load = useCallback(() => branchOverviewService.getAttention(branchId, page), [branchId, page]);
  const { data, error, at, loading, reload } = useRefetchOnReturn(load, describe);
  // Countdowns start from the server's clock and move with the time passed since the answer arrived.
  const now = useNowMs();
  const pages = data ? pageCount(data) : 1;
  // Work done elsewhere can empty the last page; adjusting while rendering is React's way to follow it.
  if (data && page >= pages) setPage(pages - 1);

  return (
    <section aria-labelledby="branch-attention-title" aria-busy={loading} className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="branch-attention-title" className="text-lg font-bold">Cần chú ý{data ? ` (${data.totalElements})` : ""}</h2>
          <p className="text-sm text-muted-foreground">Việc gấp ở trên. Bấm để mở đúng nơi xử lý; xử lý xong thì việc tự mất.</p>
        </div>
        <button type="button" disabled={loading} onClick={() => void reload()} className={outlineButton}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Làm mới
        </button>
      </div>

      {loading && !data ? <p role="status" className="text-sm text-muted-foreground">Đang tải việc cần chú ý…</p> : null}
      {error ? (
        <div className="space-y-2">
          <ErrorNote message={`${data ? "Chưa tải lại được, danh sách có thể đã cũ." : "Chưa tải được danh sách việc. Các phần khác của chi nhánh vẫn dùng được."} ${error}`} />
          <button type="button" disabled={loading} onClick={() => void reload()} className={outlineButton}>Thử lại</button>
        </div>
      ) : null}

      {data ? (
        <>
          {data.totalElements === 0 ? (
            <p role="status" className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">Không có việc nào cần chú ý.</p>
          ) : (
            <ul className="space-y-2">
              {data.items.map((work) => {
                const [group, label] = workLabel(work.type);
                const href = targetHref(work.target);
                const context = workContext(work);
                const deadline = workDeadline(work, data, now - at);
                const body = (
                  <>
                    <span className="min-w-0 flex-1 space-y-1 [overflow-wrap:anywhere]">
                      <span className="flex flex-wrap items-center gap-2 text-xs">
                        <span className={`rounded-md px-2 py-0.5 font-bold ${PRIORITY_CLASS[work.priority]}`}>{PRIORITY_LABEL[work.priority]}</span>
                        <span className="text-muted-foreground">{group}</span>
                      </span>
                      <span className="block text-sm font-semibold">{label}</span>
                      {context ? <span className="block text-sm">{context}</span> : null}
                      {deadline ? <span className="block text-xs text-muted-foreground">{deadline}</span> : null}
                    </span>
                    {href ? <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" /> : null}
                  </>
                );
                const box = "flex items-center gap-3 rounded-2xl border border-border bg-card p-3";
                return (
                  <li key={work.key}>
                    {href ? <Link href={href} className={`${box} hover:bg-muted ${ring}`}>{body}</Link> : <div className={box}>{body}</div>}
                  </li>
                );
              })}
            </ul>
          )}
          <Pager label="Trang việc cần chú ý" page={page} pages={pages} disabled={loading} onPage={setPage} />
        </>
      ) : null}
    </section>
  );
}
