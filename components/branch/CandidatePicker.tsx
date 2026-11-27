"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { candidateState, codeMatches, codeMismatch, pageCount, sortCandidates } from "@/lib/branch-assignment";
import branchAssignmentService from "@/services/branch-assignment.service";
import { foldText } from "@/services/branch-overview.service";
import type { AssignmentCandidate, AssignmentKind, PageOf, RoomOption } from "@/types/branch-assignment.type";
import { outlineButton, ring } from "./LayoutBoard";
import { ErrorNote, Pager, inputClass, linkError } from "./linkUi";

/** The server allows 1-100 per page; a whole branch usually fits, so the search box covers it. */
const CANDIDATE_PAGE_SIZE = 100;

/** Paged list of existing listings or lease contracts that can be put in `roomId` (null = the tray). */
export default function CandidatePicker({ branchId, kind, roomId, cellCode, rooms, trayIds, disabled, onPick, onClose }: {
  branchId: string;
  kind: AssignmentKind;
  roomId: string | null;
  /** Code of the cell the item is going into: listings with the same code come first, a different one is flagged. */
  cellCode?: string;
  rooms: RoomOption[];
  trayIds?: Set<string>;
  disabled: boolean;
  /** Resolves true when the write succeeded; on failure the list is read again. */
  onPick: (candidate: AssignmentCandidate) => Promise<boolean>;
  onClose: () => void;
}) {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<PageOf<AssignmentCandidate> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const searchId = useId();
  const seq = useRef(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const noun = kind === "CONTRACT" ? "hợp đồng" : "tin đăng";

  const load = useCallback(async () => {
    const mine = ++seq.current;
    try {
      const next = await branchAssignmentService.getCandidates(branchId, kind, page, CANDIDATE_PAGE_SIZE);
      if (mine !== seq.current) return;
      setError("");
      const last = pageCount(next) - 1;
      if (page > last) return setPage(last);
      setData(next);
      setLoading(false);
    } catch (failure) {
      if (mine !== seq.current) return;
      setData(null);
      setError(linkError(failure, `Chưa tải được danh sách ${noun}.`));
      setLoading(false);
    }
  }, [branchId, kind, page, noun]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { headingRef.current?.focus(); }, []);

  const needle = foldText(query.trim());
  const shown = data ? sortCandidates(data.items, kind === "LISTING" ? cellCode : undefined)
    .filter((item) => !needle || foldText(`${item.label} ${item.roomCode ?? ""}`).includes(needle)) : [];

  return (
    <div className="space-y-3 rounded-xl border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <h4 ref={headingRef} tabIndex={-1} className={`min-w-0 rounded text-sm font-bold ${ring}`}>Chọn {noun}</h4>
        <button type="button" onClick={onClose} className={outlineButton}>Đóng danh sách</button>
      </div>

      {loading ? <p role="status" className="text-sm text-muted-foreground">Đang tải…</p> : null}
      {error ? (
        <>
          <ErrorNote message={error} />
          <button type="button" onClick={() => { setLoading(true); setError(""); void load(); }} className={outlineButton}>Thử lại</button>
        </>
      ) : null}

      {!loading && data && data.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {kind === "CONTRACT" ? "Không có hợp đồng thuê nào để chọn." : (
            <>
              Chưa có tin nào thuộc chi nhánh này. Muốn dùng tin ở nơi khác, hãy đổi chi nhánh trong trang sửa tin tại{" "}
              <Link href="/dashboard/properties" className={`rounded font-semibold text-primary underline ${ring}`}>danh sách tin</Link>.
            </>
          )}
        </p>
      ) : null}

      {!loading && data && data.items.length > 0 ? (
        <div>
          <label htmlFor={searchId} className="mb-1 block text-sm font-semibold">Tìm {noun}</label>
          <input id={searchId} type="search" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" placeholder={kind === "LISTING" ? "Tên tin hoặc mã phòng" : "Tên người thuê hoặc phòng"} className={inputClass} />
          <p aria-live="polite" className="mt-1 text-xs text-muted-foreground">
            {needle ? (shown.length ? `${shown.length} kết quả` : "Không có kết quả khớp.") : ""}
            {needle && pageCount(data) > 1 ? " Chỉ tìm trong trang này." : ""}
          </p>
        </div>
      ) : null}

      {!loading && data && shown.length > 0 ? (
        <ul className="space-y-2">
          {shown.map((item) => {
            const state = candidateState(kind, item, roomId, rooms, trayIds?.has(item.id));
            const same = kind === "LISTING" && !!cellCode && codeMatches(item.roomCode, cellCode);
            const differs = kind === "LISTING" && !!cellCode && codeMismatch(item.roomCode, cellCode);
            return (
              <li key={item.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2">
                <div className="min-w-0 space-y-0.5 text-sm [overflow-wrap:anywhere]">
                  <p className="font-semibold">{item.label}</p>
                  {kind === "LISTING" && item.roomCode?.trim() ? (
                    <p className="text-xs">Mã trên tin: <span className="font-semibold">{item.roomCode.trim()}</span>{same ? " · trùng mã ô" : ""}</p>
                  ) : null}
                  {differs ? (
                    <p className="flex items-start gap-1 text-xs font-semibold text-amber-800 dark:text-amber-300">
                      <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> Khác mã ô {cellCode}. Vẫn gắn được, sau đó có thể đổi mã ô cho khớp.
                    </p>
                  ) : null}
                  {state.note ? <p className="text-xs text-muted-foreground">{state.note}</p> : null}
                </div>
                <button
                  type="button"
                  disabled={disabled || state.disabled}
                  aria-label={`${state.action} ${noun} ${item.label}`}
                  onClick={() => void onPick(item).then((ok) => { if (!ok) void load(); })}
                  className={`${outlineButton} shrink-0`}
                >
                  {state.action}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {data ? <Pager label={`Trang ${noun}`} page={page} pages={pageCount(data)} disabled={loading} onPage={(next) => { setLoading(true); setPage(next); }} /> : null}
    </div>
  );
}
