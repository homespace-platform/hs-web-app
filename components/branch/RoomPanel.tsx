"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import {
  MANUAL_STATUS_LABEL,
  contractStatusLabel,
  formatDay,
  itemPath,
  listingStatusLabel,
  newRoomListingPath,
  rentalRequestPath,
  sortContracts,
} from "@/lib/branch-assignment";
import branchAssignmentService from "@/services/branch-assignment.service";
import type { AssignmentKind, RoomAssignment, RoomContractLink, RoomManualStatus, RoomOption } from "@/types/branch-assignment.type";
import CandidatePicker from "./CandidatePicker";
import { outlineButton, primaryButton } from "./LayoutBoard";
import { ErrorNote, SelectAction, noteClass, useLinkAction } from "./linkUi";

const cardClass = "space-y-2 rounded-xl border border-border p-3 text-sm [overflow-wrap:anywhere]";
const STATUSES = Object.keys(MANUAL_STATUS_LABEL) as RoomManualStatus[];

function OpenLink({ href, children, label }: { href: string; children: string; label: string }) {
  return (
    <Link href={href} aria-label={label} className={outlineButton}>
      {children} <ExternalLink className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}

/** What is attached to one saved room, and the actions on it. Real work happens on the existing pages. */
export default function RoomPanel({ branchId, room, code, rooms, lock, reload }: {
  branchId: string;
  room: RoomAssignment;
  code: string;
  rooms: RoomOption[];
  /** Why writes are not allowed right now, or null. */
  lock: string | null;
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

  return (
    <section aria-label={`Người thuê và tin đăng của phòng ${code}`} aria-busy={busy} className="space-y-3">
      {lock ? <p className={noteClass}>{lock}</p> : null}
      <ErrorNote message={error} />
      {empty ? <p className="text-sm text-muted-foreground">Phòng này chưa gắn hợp đồng hay tin đăng.</p> : null}

      {sortContracts(room.contracts).map((contract) => (
        <div key={contract.id} className={cardClass}>
          <p className="font-semibold">Hợp đồng · {contract.tenantName || "chưa có tên người thuê"}</p>
          <p className="text-muted-foreground">
            {contractStatusLabel(contract.status)}
            {formatDay(contract.startDate) ? ` · từ ${formatDay(contract.startDate)}` : ""}
            {formatDay(contract.endDateExclusive) ? ` đến trước ${formatDay(contract.endDateExclusive)}` : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            <OpenLink href={itemPath("CONTRACT", contract.id)} label={`Mở ${name(contract)}`}>Mở hợp đồng</OpenLink>
            <button type="button" disabled={disabled} aria-expanded={moving === contract.id} aria-label={`Chuyển phòng cho ${name(contract)}`} onClick={() => setMoving(moving === contract.id ? null : contract.id)} className={outlineButton}>Chuyển phòng</button>
            <button type="button" disabled={disabled} aria-label={`Gỡ ${name(contract)} khỏi chi nhánh`} onClick={() => void run(() => branchAssignmentService.removeContract(branchId, contract.id), "Đã gỡ hợp đồng khỏi chi nhánh.")} className={outlineButton}>Gỡ khỏi chi nhánh</button>
          </div>
          {moving === contract.id ? (
            <SelectAction
              label="Chuyển đến" button="Chuyển" disabled={disabled}
              options={[{ value: "", label: "Khay Chưa xếp phòng" }, ...rooms.filter((r) => r.id !== roomId).map((r) => ({ value: r.id, label: r.label }))]}
              onSubmit={(value) => void run(() => branchAssignmentService.putContract(branchId, contract.id, value || null), "Đã chuyển hợp đồng.").then((ok) => { if (ok) setMoving(null); })}
            />
          ) : null}
        </div>
      ))}

      {room.holds.map((hold) => (
        <div key={hold.rentalRequestId} className={cardClass}>
          <p className="font-semibold">Giữ chỗ · {hold.tenantName || "chưa có tên người thuê"}</p>
          {formatDay(hold.moveInDate) ? <p className="text-muted-foreground">Ngày vào {formatDay(hold.moveInDate)}</p> : null}
          <OpenLink href={rentalRequestPath(hold.rentalRequestId)} label={`Mở hồ sơ thuê của ${hold.tenantName || "người thuê"}`}>Mở hồ sơ thuê</OpenLink>
        </div>
      ))}

      {room.listings.map((listing) => (
        <div key={listing.id} className={cardClass}>
          <p className="font-semibold">Tin đăng · {listing.title}</p>
          <p className="text-muted-foreground">{listingStatusLabel(listing.operationalStatus)}</p>
          <div className="flex flex-wrap gap-2">
            <OpenLink href={itemPath("LISTING", listing.id)} label={`Mở tin ${listing.title}`}>Mở tin</OpenLink>
            <button type="button" disabled={disabled} aria-label={`Gỡ tin ${listing.title} khỏi phòng`} onClick={() => void run(() => branchAssignmentService.unlinkListing(branchId, roomId, listing.id), "Đã gỡ tin khỏi phòng.")} className={outlineButton}>Gỡ khỏi phòng</button>
          </div>
        </div>
      ))}

      {picking ? (
        <CandidatePicker
          key={picking} branchId={branchId} kind={picking} roomId={roomId} rooms={rooms} disabled={disabled}
          onClose={() => setPicking(null)}
          onPick={async (candidate) => {
            const ok = await run(
              () => (picking === "CONTRACT"
                ? branchAssignmentService.putContract(branchId, candidate.id, roomId)
                : branchAssignmentService.linkListing(branchId, roomId, candidate.id)),
              picking === "CONTRACT" ? `Đã gắn hợp đồng vào phòng ${code}.` : `Đã gắn tin vào phòng ${code}.`,
            );
            if (ok) setPicking(null);
            return ok;
          }}
        />
      ) : (
        <div className="grid gap-2">
          <button type="button" disabled={disabled} onClick={() => open("CONTRACT")} className={`${outlineButton} w-full`}>Gắn hợp đồng có sẵn</button>
          <button type="button" disabled={disabled} onClick={() => open("LISTING")} className={`${outlineButton} w-full`}>Gắn tin có sẵn</button>
          {disabled ? (
            <button type="button" disabled className={`${primaryButton} w-full`}>Đăng tin cho phòng này</button>
          ) : (
            <Link href={newRoomListingPath(branchId, roomId)} className={`${primaryButton} w-full`}>Đăng tin cho phòng này</Link>
          )}
        </div>
      )}

      <div role="group" aria-label={`Đánh dấu phòng ${code}`}>
        <p className="mb-1 text-sm font-semibold" aria-hidden="true">Đánh dấu phòng</p>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((status) => {
            const active = room.manualStatus === status;
            return (
              <button
                key={status} type="button" disabled={disabled} aria-pressed={active}
                onClick={() => { if (!active) void run(() => branchAssignmentService.setManualStatus(branchId, roomId, status), "Đã cập nhật đánh dấu phòng."); }}
                className={active ? `${primaryButton} border border-primary` : outlineButton}
              >
                {active ? "✓ " : ""}{MANUAL_STATUS_LABEL[status]}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
