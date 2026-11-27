import Link from "next/link";
import type { RoomOption } from "@/lib/listing-room-link";

interface Props {
  roomId: string;
  branchId: string;
  /** null = still loading. */
  rooms: RoomOption[] | "error" | null;
  /** false when the editor could not apply the branch of this room. */
  isBranchApplied: boolean;
  onPickRoom: (roomId: string) => void;
  onRetry: () => void;
  onRemove: () => void;
}

const BUTTON_CLASS = "rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted";

/** Tells the owner which room the new listing will be linked to, or why it cannot be yet. */
export default function RoomLinkBanner({ roomId, branchId, rooms, isBranchApplied, onPickRoom, onRetry, onRemove }: Props) {
  const list = Array.isArray(rooms) ? rooms : [];
  const room = list.find((r) => r.id === roomId);

  if (rooms === null || (room && isBranchApplied)) {
    return (
      <div role="status" className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
        {room ? (
          <>Tin mới sẽ được gắn vào phòng <strong>{room.label}</strong>.</>
        ) : (
          "Đang tải thông tin phòng sẽ gắn với tin mới..."
        )}
      </div>
    );
  }

  return (
    <div role="alert" className="space-y-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
      <p>
        {rooms === "error"
          ? "Không tải được sơ đồ chi nhánh nên chưa kiểm tra được phòng cần gắn."
          : !room
          ? "Phòng đã chọn không còn trong sơ đồ. Vui lòng chọn lại phòng trước khi tạo tin."
          : "Chưa áp dụng được chi nhánh của phòng. Vui lòng chọn lại chi nhánh trong mục Thông tin cơ bản trước khi tạo tin."}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {!room && list.length > 0 && (
          <select aria-label="Chọn lại phòng" value="" onChange={(e) => onPickRoom(e.target.value)} className={BUTTON_CLASS}>
            <option value="" disabled>Chọn lại phòng</option>
            {list.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        )}
        {rooms === "error" && (
          <button type="button" onClick={onRetry} className={BUTTON_CLASS}>Thử lại</button>
        )}
        <button type="button" onClick={onRemove} className={BUTTON_CLASS}>Đăng tin không gắn phòng</button>
        <Link href={`/dashboard/branches/${encodeURIComponent(branchId)}`} target="_blank" className="text-xs font-semibold underline">
          Mở chi nhánh (tab mới)
        </Link>
      </div>
    </div>
  );
}
