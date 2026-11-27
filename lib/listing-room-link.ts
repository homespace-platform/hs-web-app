import type { BranchLayout } from "@/types/branch-layout.type";
import type { CreateListingRequest } from "@/types/listing.type";

export interface RoomOption {
  id: string;
  label: string;
}

/** The room a new listing was started from. Only a plain create can carry it, never edit or duplicate. */
export function readRoomLinkParams(
  mode: "create" | "edit",
  params: { get(name: string): string | null },
): { branchId: string; roomId: string } | null {
  const branchId = params.get("branchId");
  const roomId = params.get("roomId");
  if (mode !== "create" || params.get("duplicateFrom") || !branchId || !roomId) return null;
  return { branchId, roomId };
}

/** Cells with a room code are rooms; the others are aisles and cannot take a link. */
export function listRooms(layout: BranchLayout): RoomOption[] {
  return layout.floors.flatMap((floor) =>
    floor.rows.flatMap((row) =>
      row.slots.flatMap((slot) =>
        slot.roomCode ? [{ id: slot.id, label: `${slot.roomCode} · ${floor.label} · ${row.label}` }] : [],
      ),
    ),
  );
}

/** Without a room, or for an existing or copied listing, the request is returned untouched. */
export function withRoomId(request: CreateListingRequest, roomId: string | null): CreateListingRequest {
  return roomId && !request.id && !request.duplicateSourceListingId ? { ...request, roomId } : request;
}
