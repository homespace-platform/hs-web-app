"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ExternalLink, TriangleAlert } from "lucide-react";
import {
  MANUAL_STATUS_LABEL,
  codeMismatch,
  contractStatusLabel,
  formatDay,
  itemPath,
  listingEditPath,
  listingLinkOutcome,
  listingStatusLabel,
  newRoomListingPath,
  rentalRequestPath,
  roomLines,
  roomPrimary,
  sortContracts,
} from "@/lib/branch-assignment";
import { normalizeRoomCode } from "@/lib/branch-layout";
import branchAssignmentService from "@/services/branch-assignment.service";
import type { AssignmentKind, RoomAssignment, RoomContractLink, RoomListingLink, RoomManualStatus, RoomOption } from "@/types/branch-assignment.type";
import CandidatePicker from "./CandidatePicker";
import { outlineButton, primaryButton } from "./LayoutBoard";
import { ErrorNote, SelectAction, noteClass, useLinkAction } from "./linkUi";

const cardClass = "space-y-2 rounded-xl border border-border p-3 text-sm [overflow-wrap:anywhere]";
const STATUSES = Object.keys(MANUAL_STATUS_LABEL) as RoomManualStatus[];

function OpenLink({ href, children, label, primary = false }: { href: string; children: string; label: string; primary?: boolean }) {
  return (
    <Link href={href} aria-label={label} className={primary ? `${primaryButton} w-full` : outlineButton}>
      {children} <ExternalLink className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="space-y-2">
      <h3 className="text-sm font-bold" aria-hidden="true">{title}</h3>
      {children}
    </section>
  );
}

/**
 * One saved room, top to bottom: status, the one main step, Links (listing, contracts, attach), Flags.
 * Real work happens on the existing pages.
 */
export default function RoomPanel({ branchId, room, code, rooms, lock, status, facts, renameRoom, reload }: {
  branchId: string;
  room: RoomAssignment;
  code: string;
  rooms: RoomOption[];
  /** Why writes are not allowed right now, or null. */
  lock: string | null;
  /** The map's own status label for the room ("Đang thuê", "Trống · Bản nháp"...), when known. */
  status: string | null;
  /** Tenant and next stay, from the status view. */
  facts: string[];
  /** Saves the map with this room's code changed; resolves "" when done, else why not. */
  renameRoom: (code: string) => Promise<string>;
  reload: () => Promise<void>;
}) {
  const { busy, error, run, clearError } = useLinkAction(reload);
  const [picking, setPicking] = useState<AssignmentKind | null>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const disabled = busy || lock !== null;
  const { roomId } = room;
  const open = (kind: AssignmentKind | null) => { clearError(); setPicking(kind); };
  const empty = !room.contracts.length && !room.holds.length && !room.listings.length;
  const name = (contract: RoomContractLink) => (contract.tenantName ? `hợp đồng của ${contract.tenantName}` : "hợp đồng");
  const primary = roomPrimary(room);
  const contract = primary.kind === "CONTRACT" ? room.contracts.find((c) => c.id === primary.id) : undefined;
  const hold = primary.kind === "HOLD" ? room.holds.find((h) => h.rentalRequestId === primary.id) : undefined;
  const takenBy = (value: string) => rooms.some((r) => r.id !== roomId && normalizeRoomCode(r.code) === normalizeRoomCode(value));

  const listingNote = (listing: RoomListingLink): ReactNode => {
    if (!codeMismatch(listing.roomCode, code)) return null;
    const declared = listing.roomCode!.trim();
    return (
      <div role="note" className="space-y-2 rounded-lg border border-amber-500/60 bg-amber-500/10 p-2">
        <p className="flex items-start gap-1.5 font-semibold text-amber-900 dark:text-amber-200">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Mã trên tin ({declared}) khác mã ô ({code}). Sơ đồ là chuẩn.
        </p>
        <div className="flex flex-wrap gap-2">
          {takenBy(declared) ? (
            <p className="text-xs">Mã {declared} đang dùng cho ô khác trên sơ đồ, nên chưa đổi mã ô được.</p>
          ) : (
            <button
              type="button" disabled={disabled}
              onClick={() => void run(async () => { const reason = await renameRoom(declared); if (reason) throw new Error(reason); }, `Đã đổi mã ô thành ${declared}.`)}
              className={outlineButton}
            >
              Đổi mã ô thành {declared}
            </button>
          )}
          <Link href={listingEditPath(listing.id)} aria-label={`Sửa mã trên tin ${listing.title}`} className={outlineButton}>
            Sửa mã trên tin <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        {listing.operationalStatus === "PUBLISHED" ? <p className="text-xs">Tin đang đăng sẽ phải duyệt lại sau khi sửa.</p> : null}
      </div>
    );
  };

  return (
    <section aria-label={`Người thuê và tin đăng của phòng ${code}`} aria-busy={busy} className="space-y-4">
      {lock ? <p className={noteClass}>{lock}</p> : null}
      <ErrorNote message={error} />

      <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-3">
        <div className="[overflow-wrap:anywhere]">
          <p className="text-xs font-semibold text-muted-foreground">Trạng thái</p>
          <p className="text-base font-bold">{status ?? (empty && room.manualStatus === "NONE" ? "Chưa gắn gì" : roomLines(room)[0])}</p>
          {facts.filter(Boolean).map((fact) => <p key={fact} className="text-sm text-muted-foreground">{fact}</p>)}
        </div>
        {primary.kind === "CONTRACT" ? (
          <OpenLink primary href={itemPath("CONTRACT", primary.id)} label={`Mở ${contract ? name(contract) : "hợp đồng"}`}>Mở hợp đồng</OpenLink>
        ) : primary.kind === "HOLD" ? (
          <OpenLink primary href={rentalRequestPath(primary.id)} label={`Mở hồ sơ thuê của ${hold?.tenantName || "người thuê"}`}>Mở hồ sơ thuê</OpenLink>
        ) : primary.kind === "LISTING" ? (
          <OpenLink primary href={itemPath("LISTING", primary.id)} label={`Mở tin ${room.listings.find((l) => l.id === primary.id)?.title ?? ""}`}>Mở tin</OpenLink>
        ) : (
          <button type="button" disabled={disabled} onClick={() => open("LISTING")} className={`${primaryButton} w-full`}>Gắn tin</button>
        )}
      </div>

      <Section title="Liên kết">
        {empty ? <p className="text-sm text-muted-foreground">Phòng này chưa gắn hợp đồng hay tin đăng.</p> : null}

        {sortContracts(room.contracts).map((item) => (
          <div key={item.id} className={cardClass}>
            <p className="font-semibold">Hợp đồng · {item.tenantName || "chưa có tên người thuê"}</p>
            <p className="text-muted-foreground">
              {contractStatusLabel(item.status)}
              {formatDay(item.startDate) ? ` · từ ${formatDay(item.startDate)}` : ""}
              {formatDay(item.endDateExclusive) ? ` đến trước ${formatDay(item.endDateExclusive)}` : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              {primary.kind === "CONTRACT" && primary.id === item.id ? null : (
                <OpenLink href={itemPath("CONTRACT", item.id)} label={`Mở ${name(item)}`}>Mở hợp đồng</OpenLink>
              )}
              <button type="button" disabled={disabled} aria-expanded={moving === item.id} aria-label={`Chuyển phòng cho ${name(item)}`} onClick={() => setMoving(moving === item.id ? null : item.id)} className={outlineButton}>Chuyển phòng</button>
              <button type="button" disabled={disabled} aria-label={`Gỡ ${name(item)} khỏi chi nhánh`} onClick={() => void run(() => branchAssignmentService.removeContract(branchId, item.id), "Đã gỡ hợp đồng khỏi chi nhánh.")} className={outlineButton}>Gỡ khỏi chi nhánh</button>
            </div>
            {moving === item.id ? (
              <SelectAction
                label="Chuyển đến" button="Chuyển" disabled={disabled}
                options={[{ value: "", label: "Khay Chưa xếp phòng" }, ...rooms.filter((r) => r.id !== roomId).map((r) => ({ value: r.id, label: r.label }))]}
                onSubmit={(value) => void run(() => branchAssignmentService.putContract(branchId, item.id, value || null), "Đã chuyển hợp đồng.").then((ok) => { if (ok) setMoving(null); })}
              />
            ) : null}
          </div>
        ))}

        {room.holds.map((item) => (
          <div key={item.rentalRequestId} className={cardClass}>
            <p className="font-semibold">Giữ chỗ · {item.tenantName || "chưa có tên người thuê"}</p>
            {formatDay(item.moveInDate) ? <p className="text-muted-foreground">Ngày vào {formatDay(item.moveInDate)}</p> : null}
            {primary.kind === "HOLD" && primary.id === item.rentalRequestId ? null : (
              <OpenLink href={rentalRequestPath(item.rentalRequestId)} label={`Mở hồ sơ thuê của ${item.tenantName || "người thuê"}`}>Mở hồ sơ thuê</OpenLink>
            )}
          </div>
        ))}

        {room.listings.map((listing) => (
          <div key={listing.id} className={cardClass}>
            <p className="font-semibold">Tin đăng · {listing.title}</p>
            <p className="text-muted-foreground">
              {listingStatusLabel(listing.operationalStatus)}
              {listing.roomCode?.trim() ? ` · mã trên tin ${listing.roomCode.trim()}` : ""}
            </p>
            {listingNote(listing)}
            <div className="flex flex-wrap gap-2">
              {primary.kind === "LISTING" && primary.id === listing.id ? null : (
                <OpenLink href={itemPath("LISTING", listing.id)} label={`Mở tin ${listing.title}`}>Mở tin</OpenLink>
              )}
              <button type="button" disabled={disabled} aria-label={`Gỡ tin ${listing.title} khỏi phòng`} onClick={() => void run(() => branchAssignmentService.unlinkListing(branchId, roomId, listing.id), "Đã gỡ tin khỏi phòng.")} className={outlineButton}>Gỡ khỏi phòng</button>
            </div>
          </div>
        ))}

        {picking ? (
          <CandidatePicker
            key={picking} branchId={branchId} kind={picking} roomId={roomId} cellCode={code} rooms={rooms} disabled={disabled}
            onClose={() => setPicking(null)}
            onPick={async (candidate) => {
              const differs = picking === "LISTING" && codeMismatch(candidate.roomCode, code);
              const ok = await run(
                () => (picking === "CONTRACT"
                  ? branchAssignmentService.putContract(branchId, candidate.id, roomId)
                  : branchAssignmentService.linkListing(branchId, roomId, candidate.id)
                    .then((result) => listingLinkOutcome(result, code, differs ? candidate.roomCode!.trim() : null))),
                `Đã gắn hợp đồng vào phòng ${code}.`,
              );
              if (ok) setPicking(null);
              return ok;
            }}
          />
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={disabled} onClick={() => open("LISTING")} className={outlineButton}>Gắn tin</button>
              {disabled ? (
                <button type="button" disabled className={outlineButton}>Đăng tin cho phòng này</button>
              ) : (
                <Link href={newRoomListingPath(branchId, roomId)} className={outlineButton}>Đăng tin cho phòng này</Link>
              )}
            </div>
            <button type="button" disabled={disabled} onClick={() => open("CONTRACT")} className="min-h-11 rounded text-xs text-muted-foreground underline underline-offset-2 disabled:opacity-50">Gắn hợp đồng có sẵn</button>
            <p className="text-xs text-muted-foreground">Chỉ dùng cho hợp đồng không gắn với tin nào trong chi nhánh này.</p>
          </div>
        )}
      </Section>

      <div role="group" aria-label={`Đánh dấu phòng ${code}`} className="space-y-2">
        <h3 className="text-sm font-bold" aria-hidden="true">Đánh dấu phòng</h3>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((flag) => {
            const active = room.manualStatus === flag;
            return (
              <button
                key={flag} type="button" disabled={disabled} aria-pressed={active}
                onClick={() => { if (!active) void run(() => branchAssignmentService.setManualStatus(branchId, roomId, flag), "Đã cập nhật đánh dấu phòng."); }}
                className={active ? `${primaryButton} border border-primary` : outlineButton}
              >
                {active ? "✓ " : ""}{MANUAL_STATUS_LABEL[flag]}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
