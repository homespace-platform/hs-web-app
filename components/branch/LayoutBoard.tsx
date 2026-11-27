"use client";

import { Copy, MoreHorizontal, Plus } from "lucide-react";
import type { DraftSlot, LayoutDraft } from "@/types/branch-layout.type";

export const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
export const outlineButton = `inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 text-sm font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 ${ring}`;
export const primaryButton = `inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 ${ring}`;

export type BoardTarget = { type: "cell" | "row" | "floor"; key: string };

const roomClass = "flex min-h-14 w-full items-center justify-center rounded-lg border-2 border-primary/40 bg-card px-1.5 py-1 text-center text-sm font-bold text-foreground [overflow-wrap:anywhere]";
const emptyClass = "flex min-h-14 w-full items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/40 px-1.5 py-1 text-center text-xs font-medium text-muted-foreground";

/** Each floor is a block, each row ("dãy") a column of cells stacked top to bottom. */
export default function LayoutBoard({ draft, editable, info, canOpen, onOpen, onAddRoom, onAddRow, onDuplicate }: {
  draft: LayoutDraft;
  editable: boolean;
  /** Short text about what is attached to a room, shown inside its cell. */
  info?: (slot: DraftSlot) => string[];
  /** Cells that open even when the map cannot be edited (to see what is attached). */
  canOpen?: (slot: DraftSlot) => boolean;
  onOpen: (target: BoardTarget) => void;
  onAddRoom: (rowKey: string) => void;
  onAddRow: (floorKey: string) => void;
  onDuplicate: (floorKey: string) => void;
}) {
  return (
    <div className="space-y-4">
      {draft.map((floor) => (
        <section key={floor.key} aria-label={floor.label} className="min-w-0 rounded-2xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
            <h3 className="min-w-0 text-sm font-bold [overflow-wrap:anywhere]">{floor.label}</h3>
            {editable ? (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => onAddRow(floor.key)} className={outlineButton}>
                  <Plus className="h-4 w-4" aria-hidden="true" /> Thêm dãy
                </button>
                <button type="button" onClick={() => onDuplicate(floor.key)} className={outlineButton} aria-label={`Nhân bản ${floor.label}`}>
                  <Copy className="h-4 w-4" aria-hidden="true" /> Nhân bản
                </button>
                <button type="button" data-focus-key={floor.key} onClick={() => onOpen({ type: "floor", key: floor.key })} className={outlineButton} aria-label={`Tùy chọn ${floor.label}`}>
                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </div>

          {/* The map scrolls sideways in here so the page itself never does. */}
          <div
            className={`overflow-x-auto p-3 ${ring}`}
            {...(editable ? {} : { tabIndex: 0, role: "group", "aria-label": `Sơ đồ ${floor.label}` })}
          >
            {floor.rows.length === 0 ? <p className="text-sm text-muted-foreground">Tầng này chưa có dãy.</p> : null}
            <div className="flex w-max items-start gap-3">
              {floor.rows.map((row) => (
                <div key={row.key} className={`flex ${info ? "w-36" : "w-28"} shrink-0 flex-col items-center gap-2`}>
                  {editable ? (
                    <button type="button" data-focus-key={row.key} onClick={() => onOpen({ type: "row", key: row.key })} aria-label={`Tùy chọn ${row.label}, ${floor.label}`} className={`${outlineButton} w-full !px-1.5 !text-xs`}>
                      <span className="truncate">{row.label}</span>
                      <MoreHorizontal className="h-4 w-4 shrink-0" aria-hidden="true" />
                    </button>
                  ) : (
                    <p className="w-full truncate text-center text-xs font-semibold text-muted-foreground" title={row.label}>{row.label}</p>
                  )}
                  <ul aria-label={`${row.label}, ${floor.label}`} className="w-full space-y-2">
                    {row.slots.map((slot) => {
                      const empty = slot.roomCode === null;
                      const text = empty ? "Ô trống" : slot.roomCode;
                      const lines = empty ? [] : (info?.(slot) ?? []);
                      const name = [empty ? "Ô trống" : `Phòng ${slot.roomCode}`, row.label, floor.label, ...lines].join(", ");
                      const openable = editable || !!canOpen?.(slot);
                      const content = lines.length === 0 ? text : (
                        <span className="flex w-full min-w-0 flex-col gap-0.5">
                          <span>{text}</span>
                          {lines.map((line, i) => <span key={i} className="line-clamp-2 text-xs font-medium text-muted-foreground">{line}</span>)}
                        </span>
                      );
                      return (
                        <li key={slot.key}>
                          {openable ? (
                            <button type="button" data-focus-key={slot.key} onClick={() => onOpen({ type: "cell", key: slot.key })} aria-label={`${name}. Mở tùy chọn`} className={`${empty ? emptyClass : roomClass} scroll-mb-28 hover:bg-muted ${ring}`}>
                              {content}
                            </button>
                          ) : (
                            <div className={empty ? emptyClass : roomClass}>{content}</div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {editable ? (
                    <button type="button" data-focus-key={`add-${row.key}`} onClick={() => onAddRoom(row.key)} aria-label={`Thêm phòng vào ${row.label}, ${floor.label}`} className={`flex h-11 w-11 scroll-mb-28 items-center justify-center rounded-full border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground ${ring}`}>
                      <Plus className="h-5 w-5" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
