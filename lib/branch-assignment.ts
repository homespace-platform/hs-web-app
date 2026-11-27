/**
 * Pure helpers for linking listings and contracts to map rooms (Phase 2). Business rules live on the
 * server; these only read its responses and decide what the screen can offer.
 */
import { LISTING_STATUS_CONFIG } from "@/config/listing-status.config";
import { normalizeRoomCode } from "@/lib/branch-layout";
import { contractDetailPath } from "@/lib/contract-routes";
import { contractStatus } from "@/lib/rental-labels";
import type {
  AssignmentCandidate,
  AssignmentKind,
  BranchAssignments,
  PageOf,
  RoomAssignment,
  RoomContractLink,
  RoomManualStatus,
  RoomOption,
} from "@/types/branch-assignment.type";
import type { ListingStatus } from "@/types/listing.type";
import type { LayoutDraft } from "@/types/branch-layout.type";

export const PAGE_SIZE = 20;

export const MANUAL_STATUS_LABEL: Record<RoomManualStatus, string> = {
  NONE: "Không đánh dấu",
  EXTERNAL_RENT: "Thuê ngoài",
  REPAIR: "Đang sửa chữa",
};

/** One label set with the listing management page; a status this client does not know reads "Đang cập nhật". */
export const listingStatusLabel = (status: string) =>
  Object.hasOwn(LISTING_STATUS_CONFIG, status) ? LISTING_STATUS_CONFIG[status as ListingStatus].label : "Đang cập nhật";
export const contractStatusLabel = (status: string) => contractStatus(status).label;

/** "2026-11-26..." -> "26/11/2026", without time zone conversion; anything else -> "". */
export function formatDay(value: string | null | undefined): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? "");
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

/* ---------- links to existing pages ---------- */

export const newRoomListingPath = (branchId: string, roomId: string) =>
  `/dashboard/properties/new?branchId=${encodeURIComponent(branchId)}&roomId=${encodeURIComponent(roomId)}`;
export const listingViewPath = (listingId: string) => `/dashboard/properties/view?id=${encodeURIComponent(listingId)}`;
export const rentalRequestPath = (requestId: string) => `/dashboard/rental-requests?requestId=${encodeURIComponent(requestId)}`;
export const listingEditPath = (listingId: string) => `/dashboard/properties/${encodeURIComponent(listingId)}/edit`;
export const itemPath = (kind: AssignmentKind, id: string) =>
  kind === "CONTRACT" ? contractDetailPath("landlord", id) : listingViewPath(id);

/* ---------- responses ---------- */

const BAD_RESPONSE = "Máy chủ trả về dữ liệu không đúng định dạng.";

function parsePage<T>(value: unknown): PageOf<T> {
  const page = value as PageOf<T> | null | undefined;
  if (!page || !Array.isArray(page.items) || ![page.page, page.size, page.totalElements].every(Number.isFinite)) {
    throw new Error(BAD_RESPONSE);
  }
  return page;
}

/** Rejects anything that is not the agreed shape (e.g. an HTML page); fills lists the server left out. */
export function parseAssignments(value: unknown): BranchAssignments {
  const result = value as BranchAssignments | null | undefined;
  if (!result || !Array.isArray(result.rooms)) throw new Error(BAD_RESPONSE);
  return {
    rooms: result.rooms.map((r) => ({
      roomId: r.roomId,
      manualStatus: r.manualStatus ?? "NONE",
      listings: r.listings ?? [],
      contracts: r.contracts ?? [],
      holds: r.holds ?? [],
    })),
    unplaced: parsePage(result.unplaced),
  };
}

export function parseCandidates(value: unknown): PageOf<AssignmentCandidate> {
  const page = parsePage<AssignmentCandidate>(value);
  return { ...page, items: page.items.map((c) => ({ ...c, roomId: c.roomId ?? null })) };
}

export const pageCount = (page: { size: number; totalElements: number }) =>
  Math.max(1, Math.ceil(page.totalElements / Math.max(1, page.size)));

/* ---------- room codes: the map is the reference ---------- */

/** The code on a listing when it is a real, non-blank one; the server sends none for a whole house. */
const declaredCode = (code: string | null | undefined) => (typeof code === "string" && code.trim() ? code.trim() : null);

/** True only when the listing declares a code and it differs from the cell's (trimmed, case-insensitive). Unknown = false. */
export function codeMismatch(listingCode: string | null | undefined, cellCode: string): boolean {
  const declared = declaredCode(listingCode);
  return declared !== null && normalizeRoomCode(declared) !== normalizeRoomCode(cellCode);
}

export const codeMatches = (listingCode: string | null | undefined, cellCode: string): boolean => {
  const declared = declaredCode(listingCode);
  return declared !== null && normalizeRoomCode(declared) === normalizeRoomCode(cellCode);
};

/** Listings of the room whose declared code differs from the cell's code. */
export const mismatchedListings = (room: RoomAssignment | undefined, cellCode: string) =>
  (room?.listings ?? []).filter((listing) => codeMismatch(listing.roomCode, cellCode));

/** Listings with the cell's code first; the server's order is kept inside each group. Sorts one page only. */
export function sortCandidates(items: AssignmentCandidate[], cellCode: string | undefined): AssignmentCandidate[] {
  if (!cellCode) return items;
  return [...items.filter((i) => codeMatches(i.roomCode, cellCode)), ...items.filter((i) => !codeMatches(i.roomCode, cellCode))];
}

/* ---------- rooms ---------- */

export const emptyRoom = (roomId: string): RoomAssignment =>
  ({ roomId, manualStatus: "NONE", listings: [], contracts: [], holds: [] });

/** Rooms of the saved map, in on-screen order. Cells without an id or code cannot hold links. */
export function roomOptions(saved: LayoutDraft): RoomOption[] {
  return saved.flatMap((f) => f.rows.flatMap((r) => r.slots.flatMap((s) =>
    s.id && s.roomCode !== null ? [{ id: s.id, code: s.roomCode, label: `${s.roomCode} · ${f.label}, ${r.label}` }] : [])));
}

const ENDED = new Set(["CLOSED", "TERMINATED", "CANCELLED"]);
const contractRank = (c: RoomContractLink) => (c.status === "ACTIVE" ? 0 : ENDED.has(c.status) ? 2 : 1);
/** Running contract first, ended ones last, so a cell never leads with history. */
export const sortContracts = (contracts: RoomContractLink[]) => [...contracts].sort((a, b) => contractRank(a) - contractRank(b));

/** The one main step for a room: its running contract, else a hold, else a listing, else history, else attach a listing. */
export type RoomPrimary = { kind: "CONTRACT" | "LISTING" | "HOLD"; id: string } | { kind: "ATTACH" };
export function roomPrimary(room: RoomAssignment): RoomPrimary {
  const [first] = sortContracts(room.contracts);
  const live = first && !ENDED.has(first.status) ? first : undefined;
  if (live) return { kind: "CONTRACT", id: live.id };
  if (room.holds[0]) return { kind: "HOLD", id: room.holds[0].rentalRequestId };
  if (room.listings[0]) return { kind: "LISTING", id: room.listings[0].id };
  return first ? { kind: "CONTRACT", id: first.id } : { kind: "ATTACH" };
}

/** Short text shown inside a map cell. */
export function roomLines(room: RoomAssignment): string[] {
  const lines: string[] = [];
  if (room.manualStatus !== "NONE") lines.push(MANUAL_STATUS_LABEL[room.manualStatus] ?? "Đang cập nhật");
  const [first, ...rest] = sortContracts(room.contracts);
  if (first) lines.push(`HĐ: ${first.tenantName || "chưa có tên"} (${contractStatusLabel(first.status)})`);
  if (rest.length) lines.push(`+${rest.length} HĐ khác`);
  if (room.holds.length) {
    const more = room.holds.length > 1 ? ` +${room.holds.length - 1}` : "";
    lines.push(`Giữ chỗ: ${room.holds[0].tenantName || "chưa có tên"}${more}`);
  }
  if (room.listings.length) lines.push(`${room.listings.length} tin đăng`);
  return lines;
}

function attachmentText(room: RoomAssignment): string {
  return [
    room.contracts.length ? `${room.contracts.length} hợp đồng` : "",
    room.holds.length ? `${room.holds.length} lượt giữ chỗ` : "",
    room.listings.length ? `${room.listings.length} tin đăng` : "",
  ].filter(Boolean).join(", ");
}

/** Saved rooms with attachments that saving `next` would remove (deleted, or turned into an empty cell). */
export function lostAttachedRooms(saved: LayoutDraft, next: LayoutDraft, rooms: Map<string, RoomAssignment>) {
  const kept = new Set(roomOptions(next).map((r) => r.id));
  return roomOptions(saved).flatMap((r) => {
    const room = rooms.get(r.id);
    const text = room && !kept.has(r.id) ? attachmentText(room) : "";
    return text ? [{ id: r.id, code: r.code, text }] : [];
  });
}

/** Listing and contract ids on the rooms saving `next` removes: what the owner confirms (acknowledgedDetach). */
export function detachIds(saved: LayoutDraft, next: LayoutDraft, rooms: Map<string, RoomAssignment>) {
  const lost = lostAttachedRooms(saved, next, rooms).map((r) => rooms.get(r.id)!);
  return { listingIds: lost.flatMap((r) => r.listings.map((l) => l.id)), contractIds: lost.flatMap((r) => r.contracts.map((c) => c.id)) };
}

/* ---------- what the screen allows ---------- */

/** Why linking is locked for the whole map, or null. */
export function permissionBlock(canEdit: boolean, lockMessage?: string): string | null {
  return canEdit ? null : lockMessage ?? "Bạn chưa có quyền thay đổi liên kết.";
}

/** Why actions that point at a room must wait for the map to be saved, or null. */
export function unsavedBlock(dirty: boolean, saving: boolean): string | null {
  if (saving) return "Đang lưu sơ đồ, vui lòng đợi.";
  return dirty ? "Sơ đồ có thay đổi chưa lưu. Hãy Lưu sơ đồ (hoặc Hủy thay đổi) rồi mới gắn, gỡ hoặc đăng tin cho phòng." : null;
}

/** Whether a candidate can be put in `roomId` (null = the tray), and what to say about where it is now. */
export function candidateState(
  kind: AssignmentKind,
  candidate: AssignmentCandidate,
  roomId: string | null,
  rooms: RoomOption[],
  inTray = false,
): { disabled: boolean; note: string; action: string } {
  const current = candidate.roomId;
  const idle = roomId === null ? "Thêm" : "Gắn";
  if (current) {
    if (current === roomId) return { disabled: true, note: "Đã ở phòng này.", action: idle };
    const code = rooms.find((r) => r.id === current)?.code;
    const where = `phòng ${code ?? "khác"}`;
    // A listing must be detached first; a contract can move between rooms of the branch.
    if (kind === "LISTING") return { disabled: true, note: `Đang gắn ${where}. Hãy gỡ ở phòng đó trước.`, action: idle };
    if (roomId === null) return { disabled: true, note: `Đang ở ${where}. Muốn đưa về khay, hãy mở phòng đó.`, action: idle };
    return { disabled: false, note: `Đang ở ${where}.`, action: "Chuyển đến" };
  }
  if (inTray && roomId === null) return { disabled: true, note: "Đã có trong khay.", action: idle };
  return { disabled: false, note: inTray ? "Đang ở khay Chưa xếp phòng." : "", action: idle };
}

/** What attaching a listing did to the lease; an older server sends neither field. */
export interface ListingLinkResult { contractId: string | null; contractNote: string | null }

export function parseListingLink(body: unknown): ListingLinkResult {
  const b = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  return { contractId: text(b.contractId), contractNote: text(b.contractNote) };
}

/** `codeWarning` = the listing's declared code when it differs from the cell, else null. */
export function listingLinkOutcome(result: ListingLinkResult, code: string, codeWarning: string | null) {
  return {
    success: result.contractId
      ? `Đã gắn tin và hợp đồng đang hiệu lực vào phòng ${code}.`
      : `Đã gắn tin vào phòng ${code}.${codeWarning ? ` Mã trên tin (${codeWarning}) khác mã ô.` : ""}`,
    note: result.contractNote,
  };
}
