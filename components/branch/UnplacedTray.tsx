"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ExternalLink, Plus, RefreshCw } from "lucide-react";
import { itemPath, pageCount } from "@/lib/branch-assignment";
import branchAssignmentService from "@/services/branch-assignment.service";
import type { BranchAssignments, RoomOption, UnplacedItem } from "@/types/branch-assignment.type";
import CandidatePicker from "./CandidatePicker";
import { outlineButton, ring } from "./LayoutBoard";
import { ErrorNote, Pager, SelectAction, inputClass, noteClass, useLinkAction } from "./linkUi";

/** Contracts and listings of the branch that have no room yet, plus adding old contracts to the branch. */
export default function UnplacedTray({ branchId, unplaced, loading, loadError, onPage, reload, rooms, lock, roomLock }: {
  branchId: string;
  unplaced: BranchAssignments["unplaced"] | null;
  loading: boolean;
  loadError: string;
  onPage: (page: number) => void;
  reload: () => Promise<void>;
  rooms: RoomOption[];
  /** Why nothing can be written, or null. */
  lock: string | null;
  /** Why writes that point at a room must wait, or null. */
  roomLock: string | null;
}) {
  const { busy, error, run, clearError } = useLinkAction(reload);
  const [adding, setAdding] = useState(false);
  const [addTo, setAddTo] = useState("");
  const [placing, setPlacing] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const selectId = useId();
  const hashHandled = useRef(false);
  // "#unplaced" links focus the tray once it is loaded and visible. No dependency list: the map stays mounted
  // behind the other tabs, and Next changes the hash without a hashchange event.
  useEffect(() => {
    if (window.location.hash !== "#unplaced") { hashHandled.current = false; return; }
    const heading = headingRef.current;
    if (hashHandled.current || !unplaced || !heading?.offsetParent) return;
    hashHandled.current = true;
    heading.scrollIntoView({ block: "start" });
    heading.focus({ preventScroll: true });
  });
  const targetRoom = !roomLock && rooms.some((r) => r.id === addTo) ? addTo : null;
  const roomChoices = rooms.map((r) => ({ value: r.id, label: r.label }));
  const keyOf = (item: UnplacedItem) => `${item.kind}-${item.id}`;
  /** The row that was acted on disappears, so focus goes back to the tray heading. */
  const act = (action: () => Promise<void>, success: string) =>
    void run(action, success).then((ok) => { if (ok) { setPlacing(null); headingRef.current?.focus(); } });

  return (
    <section id="unplaced" aria-labelledby={`${selectId}-title`} aria-busy={busy || loading} className="space-y-3 rounded-2xl border border-border bg-card p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={`${selectId}-title`} ref={headingRef} tabIndex={-1} className={`scroll-mt-24 rounded text-sm font-bold ${ring}`}>
          Chưa xếp phòng{unplaced ? ` (${unplaced.totalElements})` : ""}
        </h3>
        {unplaced ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={loading || busy} onClick={() => void reload()} className={outlineButton}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Làm mới
            </button>
            <button type="button" disabled={lock !== null} aria-expanded={adding} onClick={() => { clearError(); setAdding(!adding); }} className={outlineButton}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Thêm hợp đồng cũ
            </button>
          </div>
        ) : null}
      </div>

      {loading && !unplaced ? <p role="status" className="text-sm text-muted-foreground">Đang tải liên kết tin và hợp đồng…</p> : null}
      {loadError ? (
        <div className="space-y-2">
          <ErrorNote message={`${unplaced ? "Chưa tải lại được, danh sách có thể đã cũ." : "Chưa tải được phần gắn tin và hợp đồng. Sơ đồ vẫn sửa được."} ${loadError}`} />
          <button type="button" disabled={loading} onClick={() => void reload()} className={outlineButton}>Thử lại</button>
        </div>
      ) : null}

      {unplaced ? (
        <>
          {lock ? <p className={noteClass}>{lock}</p> : roomLock ? <p className={noteClass}>{roomLock}</p> : null}
          <ErrorNote message={error} />

          {adding && !lock ? (
            <div className="space-y-2">
              <div>
                <label htmlFor={selectId} className="mb-1 block text-sm font-semibold">Thêm hợp đồng vào</label>
                <select id={selectId} value={targetRoom ?? ""} disabled={roomLock !== null} onChange={(e) => setAddTo(e.target.value)} className={inputClass}>
                  <option value="">Khay Chưa xếp phòng (chưa biết phòng)</option>
                  {roomChoices.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <CandidatePicker
                branchId={branchId} kind="CONTRACT" roomId={targetRoom} rooms={rooms} disabled={busy}
                trayIds={new Set(unplaced.items.filter((i) => i.kind === "CONTRACT").map((i) => i.id))}
                onClose={() => { setAdding(false); headingRef.current?.focus(); }}
                onPick={async (candidate) => {
                  const ok = await run(
                    () => targetRoom
                      ? branchAssignmentService.putContract(branchId, candidate.id, targetRoom)
                      : branchAssignmentService.addContractToTray(branchId, candidate.id),
                    "Đã thêm hợp đồng vào chi nhánh.",
                  );
                  if (ok) { setAdding(false); headingRef.current?.focus(); }
                  return ok;
                }}
              />
            </div>
          ) : null}

          {unplaced.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Không có hợp đồng hay tin nào chờ xếp phòng.</p>
          ) : (
            <ul className="space-y-2">
              {unplaced.items.map((item) => {
                const key = keyOf(item);
                const noun = item.kind === "CONTRACT" ? "hợp đồng" : "tin";
                return (
                  <li key={key} className="space-y-2 rounded-xl border border-border p-3 text-sm">
                    <p className="[overflow-wrap:anywhere]">
                      <span className="font-semibold">{item.kind === "CONTRACT" ? "Hợp đồng" : "Tin đăng"}</span> · {item.label}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Link href={itemPath(item.kind, item.id)} aria-label={`Mở ${noun} ${item.label}`} className={outlineButton}>
                        Mở <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      </Link>
                      <button type="button" disabled={busy || !!lock || !!roomLock || rooms.length === 0} aria-expanded={placing === key} aria-label={`Xếp phòng cho ${noun} ${item.label}`} onClick={() => setPlacing(placing === key ? null : key)} className={outlineButton}>Xếp phòng</button>
                      {item.kind === "CONTRACT" ? (
                        <button type="button" disabled={busy || !!lock} aria-label={`Gỡ hợp đồng ${item.label} khỏi chi nhánh`} onClick={() => act(() => branchAssignmentService.removeContract(branchId, item.id), "Đã gỡ hợp đồng khỏi chi nhánh.")} className={outlineButton}>Gỡ khỏi chi nhánh</button>
                      ) : null}
                    </div>
                    {placing === key && !lock && !roomLock ? (
                      <SelectAction
                        label="Chọn phòng" button="Xếp vào" disabled={busy} options={roomChoices}
                        onSubmit={(roomId) => act(
                          () => (item.kind === "CONTRACT"
                            ? branchAssignmentService.putContract(branchId, item.id, roomId)
                            : branchAssignmentService.linkListing(branchId, roomId, item.id)),
                          "Đã xếp phòng.",
                        )}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
          {rooms.length === 0 && unplaced.items.length > 0 ? <p className="text-sm text-muted-foreground">Sơ đồ chưa có phòng đã lưu. Tạo và lưu sơ đồ rồi mới xếp phòng được.</p> : null}
          <Pager label="Trang khay chưa xếp phòng" page={unplaced.page} pages={pageCount(unplaced)} disabled={loading || busy} onPage={onPage} />
        </>
      ) : null}
    </section>
  );
}
