"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import { useSearchParams } from "next/navigation";
import { emptyRoom, formatDay, mismatchedListings, pageCount } from "@/lib/branch-assignment";
import branchAssignmentService from "@/services/branch-assignment.service";
import branchOverviewService, { isMonth, isOverviewLayer, monthLabel, roomLayerLabel, type BranchOverview } from "@/services/branch-overview.service";
import type { BranchAssignments } from "@/types/branch-assignment.type";
import BranchOverviewLayers, { UnplacedPayments } from "./BranchOverviewLayers";
import BranchLayoutEditor from "./BranchLayoutEditor";
import RoomPanel from "./RoomPanel";
import UnplacedTray from "./UnplacedTray";
import { outlineButton } from "./LayoutBoard";
import { ErrorNote, linkError, noteClass } from "./linkUi";

/**
 * Status of the branch for one month, read again when the month changes and when the owner comes back to the
 * window. `current` is the answer for the month on screen; null while it is still loading.
 */
function useBranchOverview(branchId: string, month: string) {
  const [result, setResult] = useState<{ month: string; data: BranchOverview | null; error: string; at: number } | null>(null);
  const seq = useRef(0);
  const monthRef = useRef(month);

  const load = useCallback(async () => {
    const mine = ++seq.current;
    const asked = monthRef.current;
    try {
      const data = await branchOverviewService.getOverview(branchId, asked || undefined);
      if (mine === seq.current) setResult({ month: asked, data, error: "", at: Date.now() });
    } catch (failure) {
      if (mine !== seq.current) return;
      const error = linkError(failure, "Máy chủ chưa trả lời được.");
      // A failed refresh keeps what is on screen; data of another month is never shown.
      setResult((old) => ({ month: asked, data: old?.month === asked ? old.data : null, error, at: old?.at ?? 0 }));
    }
  }, [branchId]);

  useEffect(() => {
    monthRef.current = month;
    void load();
  }, [month, load]);

  useEffect(() => {
    const refresh = () => void load();
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
    };
  }, [load]);

  const current = result?.month === month ? result : null;
  // While another month loads after a good answer, the view stays but without the old month's data.
  return { current, available: current ? !!current.data : !!result?.data, reload: load };
}

/** Keeps floor / layer / month in the address, so Back from another page restores them. */
function setView(patch: Partial<Record<"floor" | "layer" | "month", string>>) {
  const params = new URLSearchParams(window.location.search);
  for (const [key, value] of Object.entries(patch)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  window.history.replaceState(null, "", `?${params}`);
}

const byRoom = (data: BranchAssignments) => new Map(data.rooms.map((r) => [r.roomId, r]));

/** The floor map plus its links to listings and contracts. If the links cannot be read, the map still works. */
export default function BranchMap(props: Omit<ComponentProps<typeof BranchLayoutEditor>, "links">) {
  const { branchId } = props;
  const [page, setPage] = useState(0);
  const [data, setData] = useState<BranchAssignments | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const seq = useRef(0);
  /** The page asked for last, so a reload after a slow write does not go back to an older one. */
  const wanted = useRef(0);

  const fetchPage = useCallback(async () => {
    const mine = ++seq.current;
    const asked = wanted.current;
    try {
      const next = await branchAssignmentService.getAssignments(branchId, asked);
      if (mine !== seq.current) return;
      const last = pageCount(next.unplaced) - 1;
      if (asked > last) {
        // The last item of the last page was just removed.
        wanted.current = last;
        setPage(last);
        return;
      }
      setData(next);
      setLoadError("");
    } catch (error) {
      if (mine !== seq.current) return;
      setLoadError(linkError(error, "Máy chủ chưa trả lời được."));
    }
    setLoading(false);
  }, [branchId]);

  useEffect(() => { void fetchPage(); }, [fetchPage, page]);

  const searchParams = useSearchParams();
  const askedMonth = searchParams.get("month");
  const month = isMonth(askedMonth) ? askedMonth : "";
  const askedLayer = searchParams.get("layer");
  const layer = isOverviewLayer(askedLayer) ? askedLayer : "rooms";
  const status = useBranchOverview(branchId, month);
  const reloadStatus = status.reload;
  const overview = status.current?.data ?? null;
  const fetchedAt = status.current?.at ?? 0;

  /** After any write both the links and the status may have changed. */
  const reload = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchPage(), reloadStatus()]);
  }, [fetchPage, reloadStatus]);

  const goToPage = (next: number) => {
    wanted.current = next;
    setLoading(true);
    setPage(next);
  };

  const rooms = useMemo(() => (data ? byRoom(data) : null), [data]);

  return (
    <div className="min-w-0 space-y-4">
      {status.current && !status.current.data ? (
        <div role="alert" className={`${noteClass} space-y-2`}>
          <p>Chưa tải được tình trạng phòng và thu tiền{month ? ` (${monthLabel(month)})` : ""}. Sơ đồ vẫn dùng được. {status.current.error}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void reloadStatus()} className={outlineButton}>Thử lại</button>
            {month ? <button type="button" onClick={() => setView({ month: "" })} className={outlineButton}>Về tháng hiện tại</button> : null}
          </div>
        </div>
      ) : null}
    <BranchLayoutEditor
      {...props}
      links={{
        rooms,
        readRooms: async () => byRoom(await branchAssignmentService.getAssignments(branchId)),
        onLayoutSaved: () => void reload(),
        overview: status.available ? ({ floors, openRoom }) => (
          <BranchOverviewLayers
            floors={floors} openRoom={openRoom} overview={overview} month={month}
            fetchedAt={fetchedAt} error={overview ? status.current?.error ?? "" : ""}
            layer={layer} floorId={searchParams.get("floor")} onView={setView} onRefresh={() => void reload()}
            mismatch={rooms ? (roomId, code) => mismatchedListings(rooms.get(roomId), code).length > 0 : undefined}
          />
        ) : undefined,
        roomPanel: ({ roomId, code, options, lock, renameRoom }) => {
          const status = overview?.rooms.find((r) => r.roomId === roomId);
          const next = status?.nextStay;
          return (
          <>
            {/* The tray's own warning is hidden behind the cell dialog. */}
            <ErrorNote message={loadError && `Chưa tải lại được, thông tin phòng có thể đã cũ. ${loadError}`} />
            <RoomPanel
              branchId={branchId} room={rooms?.get(roomId) ?? emptyRoom(roomId)} code={code} rooms={options} lock={lock}
              status={status ? roomLayerLabel(status, "rooms") : null}
              facts={[status?.tenantName ?? "", next ? `Sắp vào ${formatDay(next.moveInDate)}: ${next.tenantName || "chưa có tên"}` : ""]}
              renameRoom={renameRoom} reload={reload}
            />
          </>
          );
        },
        tray: ({ options, lock, roomLock }) => (
          <>
            {overview ? <UnplacedPayments overview={overview} fetchedAt={fetchedAt} /> : null}
            <UnplacedTray
              branchId={branchId} unplaced={data?.unplaced ?? null} loading={loading} loadError={loadError}
              onPage={goToPage} reload={reload} rooms={options} lock={lock} roomLock={roomLock}
            />
          </>
        ),
      }}
    />
    </div>
  );
}
