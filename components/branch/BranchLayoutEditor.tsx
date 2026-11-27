"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import { Eye, Hash, Pencil, Plus, Undo2 } from "lucide-react";
import { useActionDialog } from "@/components/common/ActionDialog";
import {
  MAX_FLOORS,
  MAX_ROOMS_PER_BATCH,
  addFloor,
  addRooms,
  addRow,
  applyEdit,
  buildTemplate,
  countRooms,
  createHistory,
  duplicateFloor,
  findSlot,
  fromLayout,
  isSavedCopy,
  nextRoomCode,
  roomCodeError,
  sameLayout,
  setRoomCode,
  toSaveRequest,
  undoEdit,
  validateDraft,
  type DraftHistory,
  type LayoutTemplate,
} from "@/lib/branch-layout";
import { detachIds, lostAttachedRooms, mismatchedListings, permissionBlock, roomLines, roomOptions, unsavedBlock } from "@/lib/branch-assignment";
import { readStoredDraft, removeStoredDraft, writeStoredDraft, type StoredDraft } from "@/lib/branch-layout-draft";
import keycloak from "@/lib/keycloak";
import branchLayoutService from "@/services/branch-layout.service";
import type { RoomAssignment, RoomOption } from "@/types/branch-assignment.type";
import type { AcknowledgedDetach, BranchLayout, DraftSlot, LayoutDraft } from "@/types/branch-layout.type";
import { getApiErrorMessage } from "@/utils/apiError";
import LayoutBoard, { outlineButton, primaryButton, ring } from "./LayoutBoard";
import LayoutDialogs, { type DialogTarget } from "./LayoutDialogs";

const LEAVE = {
  title: "Bỏ thay đổi chưa lưu?",
  description: "Sơ đồ có thay đổi chưa lưu. Nếu rời đi, các thay đổi này sẽ mất.",
  confirmLabel: "Bỏ thay đổi",
  cancelLabel: "Ở lại",
  tone: "warning" as const,
};

/** Warns before the draft is lost: tab close / reload, and clicks on links to another page. */
function useUnsavedGuard(dirty: boolean, confirmLeave: () => Promise<boolean>) {
  const router = useRouter();
  const confirmRef = useRef(confirmLeave);
  useEffect(() => { confirmRef.current = confirmLeave; });
  useEffect(() => {
    if (!dirty) return;
    // Browser Back and code-driven router.push cannot be blocked (App Router has no navigation
    // blocker); the locally stored draft covers them.
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      // Other origins unload the page (beforeunload covers them); the same page keeps the draft.
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      event.preventDefault();
      event.stopPropagation();
      void confirmRef.current().then((ok) => { if (ok) router.push(url.pathname + url.search + url.hash); });
    };
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("click", onClick, true);
    };
  }, [dirty, router]);
}

const NO_DETACH: AcknowledgedDetach = { listingIds: [], contractIds: [] };

const TEMPLATES: { kind: Exclude<LayoutTemplate["kind"], "house">; label: string; hint: string }[] = [
  { kind: "single", label: "Một dãy", hint: "Dãy trọ một hàng phòng." },
  { kind: "double", label: "Hai dãy đối diện", hint: "Hai cột phòng nhìn vào nhau." },
  { kind: "multi", label: "Nhà nhiều tầng", hint: "Đánh số 101, 102, 201…" },
  { kind: "custom", label: "Tự thiết kế", hint: "Bấm nút + để thêm từng phòng." },
];

function TemplatePicker({ onPick, onCancel }: { onPick: (draft: LayoutDraft) => void; onCancel?: () => void }) {
  const [kind, setKind] = useState<(typeof TEMPLATES)[number]["kind"]>("single");
  const [floors, setFloors] = useState("3");
  const [rooms, setRooms] = useState("5");
  const [error, setError] = useState("");
  const name = useId();
  const inRange = (value: string, max: number) => Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= max;

  const field = (label: string, value: string, set: (v: string) => void, max: number) => (
    <label className="block text-sm font-semibold">
      {label}
      <input
        type="number" inputMode="numeric" min={1} max={max} value={value}
        onChange={(e) => { set(e.target.value); setError(""); }}
        className={`mt-1 block min-h-11 w-40 max-w-full rounded-xl border border-border bg-background px-3 text-base sm:text-sm ${ring}`}
      />
    </label>
  );

  return (
    <form
      noValidate
      className="space-y-4 rounded-2xl border border-border bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (kind === "multi" && !inRange(floors, MAX_FLOORS)) return setError(`Số tầng từ 1 đến ${MAX_FLOORS}.`);
        if (kind !== "custom" && !inRange(rooms, MAX_ROOMS_PER_BATCH)) return setError(`Số phòng từ 1 đến ${MAX_ROOMS_PER_BATCH}.`);
        onPick(buildTemplate({ kind, floors: Number(floors), rooms: Number(rooms) }));
      }}
    >
      <fieldset>
        <legend className="mb-2 text-sm font-bold">Chọn mẫu (sửa lại được trước khi lưu)</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {TEMPLATES.map((t) => (
            <label key={t.kind} className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border-2 p-3 ${kind === t.kind ? "border-primary" : "border-border"}`}>
              <input type="radio" name={name} checked={kind === t.kind} onChange={() => { setKind(t.kind); setError(""); }} className="mt-1 h-4 w-4 accent-[var(--primary)]" />
              <span>
                <span className="block text-sm font-semibold">{t.label}</span>
                <span className="block text-xs text-muted-foreground">{t.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {kind !== "custom" ? (
        <div className="flex flex-wrap gap-4">
          {kind === "multi" ? field("Số tầng", floors, setFloors, MAX_FLOORS) : null}
          {field(kind === "single" ? "Số phòng" : kind === "double" ? "Số phòng mỗi dãy" : "Số phòng mỗi tầng", rooms, setRooms, MAX_ROOMS_PER_BATCH)}
        </div>
      ) : null}
      {error ? <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={primaryButton}>Dùng mẫu này</button>
        {onCancel ? <button type="button" onClick={onCancel} className={outlineButton}>Quay lại sơ đồ</button> : null}
      </div>
    </form>
  );
}

/** Phase 2 links, supplied by BranchMap. Without it the editor is the plain map. */
export interface MapLinks {
  /** null = links could not be read (yet): the map behaves as without links. */
  rooms: Map<string, RoomAssignment> | null;
  /** Reads the links now: another tab can attach one without changing the layout revision. */
  readRooms: () => Promise<Map<string, RoomAssignment>>;
  onLayoutSaved: () => void;
  roomPanel: (args: {
    roomId: string;
    code: string;
    options: RoomOption[];
    lock: string | null;
    /** Saves the map with this room's code changed (same path as the save button). Resolves "" on success, else the reason. */
    renameRoom: (code: string) => Promise<string>;
  }) => ReactNode;
  tray: (args: { options: RoomOption[]; lock: string | null; roomLock: string | null }) => ReactNode;
  /** Phase 3 status view of the saved map; absent when it cannot be read. Shown until the owner edits. */
  overview?: (args: { floors: LayoutDraft; openRoom?: (roomId: string) => void }) => ReactNode;
}

export default function BranchLayoutEditor({ branchId, isHouse, canEdit, lockMessage, setup, onExitSetup, links }: {
  branchId: string;
  /** Whole-house branches get a one-cell map automatically. */
  isHouse: boolean;
  canEdit: boolean;
  lockMessage?: string;
  /** Just created: offer to skip the map. */
  setup: boolean;
  onExitSetup: () => void;
  links?: MapLinks;
}) {
  const [phase, setPhase] = useState<"loading" | "error" | "ready">("loading");
  const [loadError, setLoadError] = useState("");
  const [revision, setRevision] = useState(0);
  const [saved, setSaved] = useState<LayoutDraft>([]);
  const [history, setHistory] = useState<DraftHistory>(() => createHistory([]));
  const [saving, setSaving] = useState(false);
  const [saveErrors, setSaveErrors] = useState<string[]>([]);
  /** The server rejected a save: the map changed elsewhere. */
  const [conflict, setConflict] = useState(false);
  /** Set while the screen holds a restored draft: the revision it was edited from. */
  const [restoredFrom, setRestoredFrom] = useState<number | null>(null);
  const [pickingTemplate, setPickingTemplate] = useState(false);
  /** The owner chose the editing board over the status view. */
  const [editing, setEditing] = useState(false);
  /** A draft left on this device, waiting for the owner to restore or drop it. */
  const [offer, setOffer] = useState<StoredDraft | null>(null);
  const [target, setTarget] = useState<DialogTarget | null>(null);
  const [notice, setNotice] = useState("");
  const focusKey = useRef("board");
  const rootRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const loadSeq = useRef(0);
  const houseStarted = useRef(false);
  /** Blocks a second click before the re-render. */
  const requesting = useRef(false);
  /** First reason of the last failed save, for callers that show it themselves. */
  const lastError = useRef("");
  /** Bumped when the owner leaves, so a save still reading links never sends its PUT. */
  const saveAttempt = useRef(0);
  useEffect(() => () => { saveAttempt.current++; }, []);
  const { confirm, dialog } = useActionDialog();

  const draft = history.present;
  const dirty = phase === "ready" && !sameLayout(draft, saved);
  const editable = canEdit && !saving && !offer;
  // A draft from another revision is for re-applying only; saving stays locked, like after a 409.
  const stale = conflict || (restoredFrom !== null && restoredFrom !== revision);
  const draftRevision = restoredFrom ?? revision;
  /** The stored version this tab wrote or took over: the only one it may delete. */
  const owned = useRef<StoredDraft | null>(null);
  const forgetDraft = useCallback(() => {
    if (owned.current) removeStoredDraft(keycloak.subject, branchId, owned.current);
    owned.current = null;
  }, [branchId]);
  /** A confirmed reload drops the draft only once the new map has arrived, also through retries. */
  const discardOnLoad = useRef(false);
  useUnsavedGuard(dirty, async () => {
    setTarget(null); // a link inside the cell dialog: the leave question must not sit under that modal
    const leave = await confirm(LEAVE);
    if (leave) {
      saveAttempt.current++;
      forgetDraft();
    }
    return leave;
  });

  // While an offer is open, the stored draft must stay untouched.
  useEffect(() => {
    if (phase !== "ready" || offer) return;
    if (!dirty) return forgetDraft();
    owned.current = { revision: draftRevision, draft };
    writeStoredDraft(keycloak.subject, branchId, owned.current);
  }, [phase, offer, dirty, draftRevision, draft, branchId, forgetDraft]);

  // A cell opened from the status view gets focus back like one opened from the board.
  useEffect(() => {
    if (target?.type === "cell") focusKey.current = target.key;
  }, [target]);

  const adopt = useCallback((layout: BranchLayout) => {
    const next = fromLayout(layout);
    setRevision(layout.revision);
    setSaved(next);
    setHistory(createHistory(next));
    setSaveErrors([]);
    setConflict(false);
    setRestoredFrom(null);
    setPickingTemplate(false);
  }, []);

  const fetchLayout = useCallback(async () => {
    const seq = ++loadSeq.current;
    try {
      const layout = await branchLayoutService.getLayout(branchId);
      if (seq !== loadSeq.current) return;
      adopt(layout);
      if (discardOnLoad.current) forgetDraft();
      discardOnLoad.current = false;
      const stored = readStoredDraft(keycloak.subject, branchId);
      // Only a draft identical to the loaded tree (ids included) at the same revision holds nothing
      // unsaved. Anything else is offered; the owner decides.
      const unchanged = stored?.revision === layout.revision && sameLayout(stored.draft, fromLayout(layout));
      if (stored && unchanged) removeStoredDraft(keycloak.subject, branchId, stored);
      setOffer(unchanged ? null : stored);
      setPhase("ready");
    } catch (error) {
      if (seq !== loadSeq.current) return;
      setLoadError(axios.isAxiosError(error) && !error.response ? "Không kết nối được máy chủ." : getApiErrorMessage(error));
      setPhase("error");
    }
  }, [branchId, adopt, forgetDraft]);

  useEffect(() => { void fetchLayout(); }, [fetchLayout]);

  const loaded = phase === "ready";
  useEffect(() => {
    if (setup && loaded) headingRef.current?.focus();
  }, [setup, loaded]);

  const showErrors = (messages: string[]) => {
    lastError.current = messages[0] ?? "";
    setSaveErrors(messages);
  };

  /** Returns "links-changed" when the server found links the owner has not confirmed (4093), "saved" on success. */
  const save = async (next: LayoutDraft, expectedRevision: number, acknowledgedDetach: AcknowledgedDetach = NO_DETACH, report: (messages: string[]) => void = showErrors): Promise<"links-changed" | "saved" | void> => {
    const problems = validateDraft(next);
    if (problems.length) {
      report(problems);
      return;
    }
    setSaving(true);
    report([]);
    try {
      adopt(await branchLayoutService.saveLayout(branchId, { ...toSaveRequest(next, expectedRevision), acknowledgedDetach }));
      forgetDraft(); // also when the editor was left while saving
      toast.success("Đã lưu sơ đồ.");
      links?.onLayoutSaved();
      return "saved";
    } catch (error) {
      const response = axios.isAxiosError(error) ? error.response : undefined;
      if (response?.status === 409 && response.data?.code === 4093) return "links-changed"; // nothing was written
      // A lost response (or a 409 from resending it) may mean the save already went through.
      if (!response || response.status === 409) {
        const latest = await branchLayoutService.getLayout(branchId).catch(() => null);
        if (latest && latest.revision === expectedRevision + 1 && isSavedCopy(fromLayout(latest), next, saved)) {
          adopt(latest);
          forgetDraft();
          toast.success("Đã lưu sơ đồ.");
          links?.onLayoutSaved();
          return "saved";
        }
        // Same revision after a 409: nobody changed the map, the server refused this save
        // (e.g. a removed room still has a contract). Show its reason.
        if (response && latest?.revision === expectedRevision) {
          report([getApiErrorMessage(error, "Chưa lưu được sơ đồ.")]);
          links?.onLayoutSaved();
          return;
        }
      }
      if (response?.status === 409) {
        setConflict(true);
        lastError.current = "Sơ đồ đã được thay đổi ở nơi khác. Hãy tải lại sơ đồ rồi làm lại.";
      } else report([response ? getApiErrorMessage(error, "Chưa lưu được sơ đồ.") : "Không kết nối được máy chủ. Hãy thử lưu lại."]);
    } finally {
      setSaving(false);
    }
  };

  const saveRef = useRef(save);
  useEffect(() => { saveRef.current = save; });

  // Whole house without a map: create the one-cell map. If saving fails it stays as a draft.
  useEffect(() => {
    if (!loaded || offer || !isHouse || !canEdit || revision !== 0 || houseStarted.current) return;
    houseStarted.current = true;
    const house = buildTemplate({ kind: "house" });
    queueMicrotask(() => {
      setHistory((h) => applyEdit(h, house));
      void saveRef.current(house, 0);
    });
  }, [loaded, offer, isHouse, canEdit, revision]);

  const edit = (next: LayoutDraft, message = "") => {
    setEditing(true); // stay on the board after saving or undoing
    setHistory((h) => applyEdit(h, next));
    setSaveErrors([]);
    setNotice(message);
  };

  const discard = async () => {
    if (!(await confirm({ ...LEAVE, title: "Hủy các thay đổi?", description: "Sơ đồ trở về bản đã lưu gần nhất.", cancelLabel: "Quay lại" }))) return;
    setHistory(createHistory(saved));
    setRestoredFrom(null);
    setSaveErrors([]);
    setPickingTemplate(false);
  };

  const restore = (stored: StoredDraft) => {
    owned.current = stored;
    setRestoredFrom(stored.revision);
    setHistory(applyEdit(createHistory(saved), stored.draft));
    setOffer(null);
    houseStarted.current = true;
    setNotice("Đã khôi phục bản nháp.");
  };

  const reload = async () => {
    if (!(await confirm({ ...LEAVE, title: "Tải lại sơ đồ?", description: "Bản nháp này sẽ mất. Hãy ghi lại các thay đổi cần áp lại trước khi tải.", confirmLabel: "Tải lại", cancelLabel: "Giữ bản nháp" }))) return;
    discardOnLoad.current = true;
    setPhase("loading");
    await fetchLayout();
  };

  const undo = () => {
    const previous = undoEdit(history);
    if (previous.present === saved) setRestoredFrom(null); // back on the loaded tree
    setHistory(previous);
    setSaveErrors([]);
    setNotice("Đã hoàn tác.");
  };

  const exitSetup = async () => {
    if (dirty && !(await confirm(LEAVE))) return;
    setHistory(createHistory(saved));
    setRestoredFrom(null);
    setSaveErrors([]);
    onExitSetup();
  };

  const restoreFocus = () => {
    const key = CSS.escape(focusKey.current);
    const element = rootRef.current?.querySelector<HTMLElement>(`[data-focus-key="${key}"]`);
    (element ?? headingRef.current)?.focus();
  };

  /** Warns before the save that removes a room with attachments; the server decides what is allowed. */
  /** The links the owner confirmed from a fresh read (empty when nothing is removed), or null when they declined. */
  const acceptsLostRooms = async (again: boolean): Promise<AcknowledgedDetach | null> => {
    const kept = new Set(roomOptions(draft).map((r) => r.id));
    const removed = roomOptions(saved).filter((r) => !kept.has(r.id)).map((r) => r.code);
    if (removed.length === 0) return NO_DETACH;
    const changed = again ? "Liên kết của các phòng này vừa thay đổi. " : "";
    const attempt = saveAttempt.current;
    const latest = await links?.readRooms().catch(() => null);
    if (attempt !== saveAttempt.current) return null;
    // Without this read nobody knows what is attached, so every lost room needs a yes; the server
    // then rejects (4093) if anything is attached, and the question comes back with fresh links.
    if (!latest) return (await confirm({
      title: "Chưa kiểm tra được liên kết của phòng bị bỏ",
      description: `Chưa tải được liên kết mới nhất. Lưu sẽ bỏ phòng ${removed.slice(0, 5).join(", ")}${removed.length > 5 ? ` và ${removed.length - 5} phòng khác` : ""}: tin đăng và hợp đồng cũ trên các phòng này có thể bị gỡ (hợp đồng cũ chuyển về khay Chưa xếp phòng). Nếu còn hợp đồng hiệu lực hoặc giữ chỗ, máy chủ sẽ từ chối cả lần lưu.`,
      confirmLabel: "Vẫn lưu",
      tone: "warning",
    })) ? NO_DETACH : null;
    const lost = lostAttachedRooms(saved, draft, latest);
    if (lost.length === 0) return NO_DETACH;
    return (await confirm({
      title: "Lưu sẽ bỏ phòng đang có liên kết",
      description: (
        <>
          {changed ? <p className="mb-2 font-semibold">{changed}Hãy xem lại danh sách mới.</p> : null}
          <ul className="list-disc pl-5">
            {lost.slice(0, 5).map((r) => <li key={r.id}>Phòng {r.code}: {r.text}</li>)}
            {lost.length > 5 ? <li>và {lost.length - 5} phòng khác</li> : null}
          </ul>
          <p className="mt-2">Nếu còn hợp đồng hiệu lực hoặc giữ chỗ, máy chủ sẽ từ chối cả lần lưu. Nếu chỉ còn tin đăng hoặc hợp đồng cũ: tin được gỡ khỏi phòng, hợp đồng cũ chuyển về khay Chưa xếp phòng.</p>
        </>
      ),
      confirmLabel: "Vẫn lưu",
      tone: "warning",
    })) ? detachIds(saved, draft, latest) : null;
  };

  /** The draft stays locked from the click until the save ends or the owner backs out. */
  const requestSave = async () => {
    if (requesting.current || saving) return;
    requesting.current = true;
    setSaving(true);
    try {
      // 4093: links changed under us. The draft stays; ask again with the fresh links, resend only on a yes.
      for (let attempt = 0; attempt < 3; attempt++) {
        const acknowledged = await acceptsLostRooms(attempt > 0);
        if (!acknowledged || (await save(draft, revision, acknowledged)) !== "links-changed") return;
      }
      setSaveErrors(["Liên kết của phòng bị bỏ liên tục thay đổi nên chưa lưu được. Bản nháp vẫn còn, hãy thử lại sau."]);
    } finally {
      requesting.current = false;
      setSaving(false);
    }
  };

  /** "Đổi mã ô thành <mã tin>": one cell's code through the normal save. Only from a clean map; resolves "" on success. */
  const renameRoomCode = async (slotKey: string, code: string): Promise<string> => {
    if (requesting.current || saving) return "Đang lưu sơ đồ, vui lòng đợi.";
    const blocked = unsavedBlock(dirty, false) ?? (stale ? "Sơ đồ đã được thay đổi ở nơi khác. Hãy tải lại sơ đồ rồi làm lại." : null);
    if (blocked) return blocked;
    const problem = roomCodeError(saved, slotKey, code);
    if (problem) return problem;
    requesting.current = true;
    lastError.current = "";
    try {
      // Nothing is removed, so there is nothing to confirm; a 4093 here would mean the server disagrees.
      const result = await save(setRoomCode(saved, slotKey, code), revision, NO_DETACH, (messages) => { lastError.current = messages[0] ?? ""; });
      if (result === "saved") return "";
      return lastError.current || (result === "links-changed" ? "Liên kết của phòng vừa thay đổi. Hãy thử lại." : "Chưa đổi được mã ô.");
    } finally {
      requesting.current = false;
    }
  };

  const renameRef = useRef(renameRoomCode);
  useEffect(() => { renameRef.current = renameRoomCode; });

  const savedRooms = roomOptions(saved);
  const savedRoomIds = new Set(savedRooms.map((r) => r.id));
  const isSavedRoom = (slot: DraftSlot) => slot.roomCode !== null && !!slot.id && savedRoomIds.has(slot.id);
  const linkRooms = links?.rooms ?? null;
  const linkLock = permissionBlock(canEdit, lockMessage);

  const rooms = countRooms(draft);
  const showPicker = canEdit && !offer && (draft.length === 0 || pickingTemplate);
  // Two explicit modes: Xem (default) and Sửa sơ đồ. Without the link layer the map is the plain editor.
  const switchable = !!links && canEdit && !setup && loaded && draft.length > 0 && !showPicker && !offer;
  const editMode = canEdit && (!links || setup || editing || dirty || showPicker || !!offer);
  const boardEditable = editMode && editable;
  const hasOverview = !!links?.overview && loaded && !setup && !editMode && draft.length > 0;

  const targetSlot = linkRooms && !editMode && target?.type === "cell" ? findSlot(draft, target.key)?.slot : undefined;
  let linkPanel: ReactNode = null;
  if (links && targetSlot && targetSlot.roomCode !== null) {
    linkPanel = isSavedRoom(targetSlot)
      // The ref is only read when the owner clicks "Đổi mã ô", never while rendering.
      // eslint-disable-next-line react-hooks/refs
      ? links.roomPanel({
        roomId: targetSlot.id!,
        code: savedRooms.find((r) => r.id === targetSlot.id)!.code,
        options: savedRooms,
        lock: linkLock ?? unsavedBlock(dirty, saving),
        renameRoom: (code) => renameRef.current(targetSlot.key, code),
      })
      : <p className="rounded-xl border border-amber-500/60 bg-amber-500/10 p-3 text-sm">Phòng này chưa được lưu. Hãy bấm Lưu sơ đồ trước rồi mới gắn hợp đồng hoặc tin đăng.</p>;
  }

  const openRoom = linkRooms ? (roomId: string) => {
    const slot = saved.flatMap((f) => f.rows.flatMap((r) => r.slots)).find((s) => s.id === roomId);
    if (slot) setTarget({ type: "cell", key: slot.key });
  } : undefined;

  return (
    <div ref={rootRef} className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 ref={headingRef} tabIndex={-1} className={`rounded text-lg font-bold ${ring}`}>
            {setup ? "Thiết lập sơ đồ phòng" : "Sơ đồ phòng"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {setup ? "Bước này không bắt buộc, bạn có thể làm sau. " : ""}
            {loaded && draft.length > 0 ? `${rooms} phòng.` : ""}
            {loaded && draft.length > 0 && !showPicker && !setup
              ? editMode
                ? editable ? " Bấm vào ô để sửa mã hoặc vị trí, bấm + để thêm phòng." : ""
                : linkRooms ? " Bấm vào phòng để xem, gắn tin, hợp đồng hoặc đánh dấu." : ""
              : ""}
            {loaded && editable && setup && draft.length > 0 && !showPicker ? " Bấm vào ô để sửa, bấm + để thêm phòng." : ""}
          </p>
        </div>
        {setup ? (
          <button type="button" onClick={() => void exitSetup()} disabled={saving} className={outlineButton}>
            {revision > 0 && !dirty ? "Xong" : "Bỏ qua"}
          </button>
        ) : switchable ? (
          <div role="group" aria-label="Chế độ sơ đồ" className="flex gap-1 rounded-2xl border border-border bg-muted/40 p-1">
            <button type="button" aria-pressed={!editMode} disabled={saving || dirty} onClick={() => { setTarget(null); setEditing(false); }} className={`${outlineButton} ${!editMode ? "!border-primary !bg-primary !text-primary-foreground hover:!bg-primary/90" : "!border-transparent !bg-transparent"}`}>
              <Eye className="h-4 w-4" aria-hidden="true" /> Xem
            </button>
            <button type="button" aria-pressed={editMode} disabled={saving} onClick={() => { setTarget(null); setEditing(true); }} className={`${outlineButton} ${editMode ? "!border-primary !bg-primary !text-primary-foreground hover:!bg-primary/90" : "!border-transparent !bg-transparent"}`}>
              <Pencil className="h-4 w-4" aria-hidden="true" /> Sửa sơ đồ
            </button>
          </div>
        ) : null}
      </div>
      {switchable && dirty ? <p className="text-xs text-muted-foreground">Lưu hoặc hủy thay đổi rồi mới về chế độ Xem.</p> : null}

      <p aria-live="polite" className="sr-only">{notice}</p>

      {phase === "loading" ? (
        <div role="status" className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground motion-safe:animate-pulse">Đang tải sơ đồ…</div>
      ) : phase === "error" ? (
        <div role="alert" className="space-y-3 rounded-2xl border border-destructive/40 bg-card p-6 text-center">
          <p className="text-sm font-semibold">Chưa tải được sơ đồ. {loadError}</p>
          <button type="button" onClick={() => { setPhase("loading"); void fetchLayout(); }} className={outlineButton}>Thử lại</button>
        </div>
      ) : (
        <>
          {!canEdit ? (
            <p className="rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
              {lockMessage ?? "Bạn chưa có quyền sửa sơ đồ."}
              {draft.length === 0 ? " Chi nhánh này chưa có sơ đồ." : ""}
            </p>
          ) : null}

          {canEdit && offer ? (
            <div role="alert" className="space-y-2 rounded-xl border border-amber-500/60 bg-amber-500/10 p-3 text-sm">
              <p>
                Trên máy này còn bản nháp sơ đồ chưa lưu ({countRooms(offer.draft)} phòng).
                {offer.revision !== revision
                  ? " Sơ đồ đã lưu đã thay đổi sau bản nháp này. Bạn có thể mở lại bản nháp để xem nhưng không lưu đè được: hãy ghi lại thay đổi, tải lại sơ đồ rồi làm lại."
                  : ""}
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => restore(offer)} className={primaryButton}>Khôi phục bản nháp</button>
                <button type="button" onClick={() => { removeStoredDraft(keycloak.subject, branchId, offer); setOffer(null); }} className={outlineButton}>Bỏ bản nháp</button>
              </div>
            </div>
          ) : null}

          {editMode && !offer && (draft.length > 0 || history.past.length > 0) ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={!editable || history.past.length === 0} onClick={undo} className={outlineButton}>
                <Undo2 className="h-4 w-4" aria-hidden="true" /> Hoàn tác
              </button>
              {draft.length > 0 && !showPicker ? (
                <>
                  <button type="button" disabled={!editable || draft.length >= MAX_FLOORS} onClick={() => edit(addFloor(draft), "Đã thêm tầng.")} className={outlineButton}>
                    <Plus className="h-4 w-4" aria-hidden="true" /> Thêm tầng
                  </button>
                  <button type="button" disabled={!editable || rooms === 0} onClick={() => { focusKey.current = "board"; setTarget({ type: "recode", key: "" }); }} className={outlineButton}>
                    <Hash className="h-4 w-4" aria-hidden="true" /> Đặt lại mã
                  </button>
                  <button type="button" disabled={!editable} onClick={() => setPickingTemplate(true)} className={outlineButton}>Chọn mẫu khác</button>
                </>
              ) : null}
            </div>
          ) : null}

          {hasOverview ? links!.overview!({ floors: saved, openRoom }) : showPicker ? (
            <TemplatePicker
              onPick={(next) => { if (saving) return; edit(next, "Đã tạo sơ đồ nháp. Bấm Lưu sơ đồ để giữ lại."); setPickingTemplate(false); }}
              onCancel={draft.length > 0 ? () => setPickingTemplate(false) : undefined}
            />
          ) : (
            <LayoutBoard
              draft={draft}
              editable={boardEditable}
              warn={linkRooms ? (slot) => isSavedRoom(slot) && mismatchedListings(linkRooms.get(slot.id!), slot.roomCode ?? "").length > 0 : undefined}
              info={linkRooms ? (slot) => {
                const room = isSavedRoom(slot) ? linkRooms.get(slot.id!) : undefined;
                return room ? roomLines(room) : [];
              } : undefined}
              canOpen={linkRooms ? isSavedRoom : undefined}
              onOpen={(next) => { focusKey.current = next.key; setTarget(next); }}
              onAddRoom={(rowKey) => edit(addRooms(draft, rowKey), `Đã thêm phòng ${nextRoomCode(draft, rowKey)}.`)}
              onAddRow={(floorKey) => edit(addRow(draft, floorKey), "Đã thêm dãy.")}
              onDuplicate={(floorKey) => {
                if (draft.length >= MAX_FLOORS) toast.error(`Sơ đồ có tối đa ${MAX_FLOORS} tầng.`);
                else edit(duplicateFloor(draft, floorKey), "Đã nhân bản tầng với mã phòng mới.");
              }}
            />
          )}

          {stale ? (
            <div role="alert" className="space-y-2 rounded-xl border border-amber-500/60 bg-amber-500/10 p-3 text-sm">
              <p>Sơ đồ đã được thay đổi ở nơi khác nên chưa lưu được. Bản nháp của bạn vẫn còn đây. Hãy tải lại sơ đồ rồi làm lại các thay đổi.</p>
              <button type="button" onClick={() => void reload()} className={outlineButton}>Tải lại sơ đồ</button>
            </div>
          ) : null}

          {saveErrors.length > 0 ? (
            <div role="alert" className="rounded-xl border border-destructive/50 bg-card p-3 text-sm">
              <p className="font-semibold text-red-700 dark:text-red-300">Chưa lưu được. Bản nháp vẫn còn.</p>
              <ul className="mt-1 list-disc pl-5">
                {saveErrors.slice(0, 5).map((message, i) => <li key={i}>{message}</li>)}
              </ul>
            </div>
          ) : null}

          {editMode && (dirty || saving) ? (
            // Extra right padding on phones keeps the buttons clear of the floating chat button.
            <div className="sticky bottom-2 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3 pr-20 shadow-lg sm:pr-24">
              <p className="w-full text-sm font-semibold sm:mr-auto sm:w-auto">Có thay đổi chưa lưu</p>
              <button type="button" disabled={saving} onClick={() => void discard()} className={outlineButton}>Hủy thay đổi</button>
              {/* aria-disabled keeps focus here, so a closed dialog can hand it back. */}
              <button type="button" disabled={stale} aria-disabled={saving} onClick={() => void requestSave()} className={`${primaryButton} aria-disabled:opacity-50`}>
                {saving ? "Đang lưu…" : "Lưu sơ đồ"}
              </button>
            </div>
          ) : null}

          {links && !setup ? links.tray({ options: savedRooms, lock: linkLock, roomLock: unsavedBlock(dirty, saving) }) : null}
        </>
      )}

      <LayoutDialogs
        draft={draft}
        editable={boardEditable}
        linkPanel={linkPanel}
        linkHint={!!linkRooms}
        target={boardEditable || linkPanel ? target : null}
        onTarget={setTarget}
        apply={(next, key, message) => { focusKey.current = key; edit(next, message); setTarget(null); }}
        onCloseFocus={restoreFocus}
      />
      {dialog}
    </div>
  );
}
