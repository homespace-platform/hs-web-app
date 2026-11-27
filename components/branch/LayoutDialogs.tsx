"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import {
  MAX_ROOMS_PER_BATCH,
  addEmptyCell,
  addRooms,
  addRow,
  duplicateFloor,
  findSlot,
  moveSlot,
  moveSlotToRow,
  recodeRooms,
  removeFloor,
  removeRow,
  removeSlot,
  renameFloor,
  renameRow,
  roomCodeError,
  setRoomCode,
  toggleEmptyCell,
} from "@/lib/branch-layout";
import type { LayoutDraft } from "@/types/branch-layout.type";
import { outlineButton, primaryButton, ring, type BoardTarget } from "./LayoutBoard";

export type DialogTarget = BoardTarget | { type: "recode"; key: string };

const inputClass = `min-h-11 w-full min-w-0 rounded-xl border border-border bg-background px-3 text-base sm:text-sm ${ring}`;
const dangerButton = `${outlineButton} w-full !border-destructive/50 text-red-700 dark:text-red-300`;

/** Called with the edited draft and the `data-focus-key` that should get focus back. */
type Apply = (next: LayoutDraft, focusKey: string, notice: string) => void;

/** One text/number field with its submit button (rename, add many). */
function InlineForm({ label, initial, button, onSubmit, validate, type = "text", maxLength = 50 }: {
  label: string; initial: string; button: string; type?: "text" | "number"; maxLength?: number;
  validate?: (value: string) => string | null; onSubmit: (value: string) => void;
}) {
  const id = useId();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const problem = validate ? validate(value) : value.trim() ? null : "Vui lòng nhập nội dung.";
    if (problem) setError(problem);
    else onSubmit(value);
  };
  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">{label}</label>
      <div className="flex gap-2">
        <input
          id={id} type={type} value={value} maxLength={maxLength} autoComplete="off"
          {...(type === "number" ? { min: 1, max: MAX_ROOMS_PER_BATCH, inputMode: "numeric" as const } : {})}
          onChange={(e) => { setValue(e.target.value); setError(""); }}
          aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} className={inputClass}
        />
        <button type="submit" className={`${primaryButton} shrink-0`}>{button}</button>
      </div>
      {error ? <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p> : null}
    </form>
  );
}

function CellBody({ draft, slotKey, apply }: { draft: LayoutDraft; slotKey: string; apply: Apply }) {
  const found = findSlot(draft, slotKey)!;
  const { slot, row, index } = found;
  const others = draft.flatMap((f) => f.rows.filter((r) => r.key !== row.key).map((r) => ({ key: r.key, label: `${f.label} · ${r.label}` })));
  const [targetRow, setTargetRow] = useState(others[0]?.key ?? "");
  const selectId = useId();
  return (
    <>
      {slot.roomCode !== null ? (
        <InlineForm
          label="Mã phòng" initial={slot.roomCode} button="Đổi mã"
          validate={(value) => roomCodeError(draft, slotKey, value)}
          onSubmit={(value) => apply(setRoomCode(draft, slotKey, value), slotKey, `Đã đổi mã thành ${value.trim()}.`)}
        />
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={index === 0} onClick={() => apply(moveSlot(draft, slotKey, -1), slotKey, "Đã chuyển lên.")} className={outlineButton}>Chuyển lên</button>
        <button type="button" disabled={index === row.slots.length - 1} onClick={() => apply(moveSlot(draft, slotKey, 1), slotKey, "Đã chuyển xuống.")} className={outlineButton}>Chuyển xuống</button>
      </div>
      {others.length > 0 ? (
        <div>
          <label htmlFor={selectId} className="mb-1 block text-sm font-semibold">Chuyển sang dãy khác</label>
          <div className="flex gap-2">
            <select id={selectId} value={targetRow} onChange={(e) => setTargetRow(e.target.value)} className={inputClass}>
              {others.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
            <button type="button" onClick={() => apply(moveSlotToRow(draft, slotKey, targetRow), slotKey, "Đã chuyển sang dãy khác.")} className={`${outlineButton} shrink-0`}>Chuyển</button>
          </div>
        </div>
      ) : null}
      <button type="button" onClick={() => apply(toggleEmptyCell(draft, slotKey), slotKey, "Đã đổi loại ô.")} className={`${outlineButton} w-full`}>
        {slot.roomCode === null ? "Đổi thành phòng" : "Đổi thành ô trống (cầu thang, lối đi)"}
      </button>
      <button type="button" onClick={() => apply(removeSlot(draft, slotKey), `add-${row.key}`, "Đã xóa ô. Bấm Hoàn tác nếu xóa nhầm.")} className={dangerButton}>Xóa ô này</button>
    </>
  );
}

function RowBody({ draft, rowKey, label, floorKey, apply }: { draft: LayoutDraft; rowKey: string; label: string; floorKey: string; apply: Apply }) {
  return (
    <>
      <InlineForm label="Tên dãy" initial={label} button="Đổi tên" onSubmit={(value) => apply(renameRow(draft, rowKey, value), rowKey, "Đã đổi tên dãy.")} />
      <InlineForm
        label="Thêm nhiều phòng (số lượng)" initial="5" button="Thêm" type="number"
        validate={(value) => (Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= MAX_ROOMS_PER_BATCH ? null : `Nhập số từ 1 đến ${MAX_ROOMS_PER_BATCH}.`)}
        onSubmit={(value) => apply(addRooms(draft, rowKey, Number(value)), rowKey, `Đã thêm ${Number(value)} phòng.`)}
      />
      <button type="button" onClick={() => apply(addEmptyCell(draft, rowKey), rowKey, "Đã thêm ô trống.")} className={`${outlineButton} w-full`}>Thêm ô trống (cầu thang, lối đi)</button>
      <button type="button" onClick={() => apply(removeRow(draft, rowKey), floorKey, "Đã xóa dãy. Bấm Hoàn tác nếu xóa nhầm.")} className={dangerButton}>Xóa dãy này</button>
    </>
  );
}

function FloorBody({ draft, floorKey, label, apply, openRecode }: { draft: LayoutDraft; floorKey: string; label: string; apply: Apply; openRecode: () => void }) {
  return (
    <>
      <InlineForm label="Tên tầng hoặc khu" initial={label} button="Đổi tên" onSubmit={(value) => apply(renameFloor(draft, floorKey, value), floorKey, "Đã đổi tên tầng.")} />
      <button type="button" onClick={() => apply(addRow(draft, floorKey), floorKey, "Đã thêm dãy.")} className={`${outlineButton} w-full`}>Thêm dãy</button>
      <button type="button" onClick={() => apply(duplicateFloor(draft, floorKey), floorKey, "Đã nhân bản tầng với mã phòng mới.")} className={`${outlineButton} w-full`}>Nhân bản tầng</button>
      <button type="button" onClick={openRecode} className={`${outlineButton} w-full`}>Đặt lại mã phòng của tầng</button>
      <button type="button" onClick={() => apply(removeFloor(draft, floorKey), "board", "Đã xóa tầng. Bấm Hoàn tác nếu xóa nhầm.")} className={dangerButton}>Xóa tầng này</button>
    </>
  );
}

/** `target.key` is a floor key, or "" for all floors. */
function RecodeBody({ draft, initialFloor, apply }: { draft: LayoutDraft; initialFloor: string; apply: Apply }) {
  const [floorKey, setFloorKey] = useState(initialFloor);
  const [prefix, setPrefix] = useState("");
  const [start, setStart] = useState("");
  const ids = { scope: useId(), prefix: useId(), start: useId() };
  const next = recodeRooms(draft, { floorKey: floorKey || undefined, prefix, start: start.trim() ? Number(start) : undefined });
  const sample = next
    .filter((f) => !floorKey || f.key === floorKey)
    .flatMap((f) => f.rows.flatMap((r) => r.slots.flatMap((s) => (s.roomCode === null ? [] : [s.roomCode]))));
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => { e.preventDefault(); apply(next, floorKey || "board", "Đã đặt lại mã phòng."); }}
    >
      <div>
        <label htmlFor={ids.scope} className="mb-1 block text-sm font-semibold">Áp dụng cho</label>
        <select id={ids.scope} value={floorKey} onChange={(e) => setFloorKey(e.target.value)} className={inputClass}>
          <option value="">Tất cả các tầng</option>
          {draft.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor={ids.prefix} className="mb-1 block text-sm font-semibold">Chữ đứng trước mã (không bắt buộc)</label>
        <input id={ids.prefix} value={prefix} maxLength={10} onChange={(e) => setPrefix(e.target.value)} placeholder="Ví dụ: P" autoComplete="off" className={inputClass} />
      </div>
      {floorKey ? (
        <div>
          <label htmlFor={ids.start} className="mb-1 block text-sm font-semibold">Số bắt đầu (bỏ trống để đánh theo tầng)</label>
          <input id={ids.start} value={start} inputMode="numeric" maxLength={6} onChange={(e) => setStart(e.target.value.replace(/\D/g, ""))} placeholder="Ví dụ: 101" autoComplete="off" className={inputClass} />
        </div>
      ) : null}
      <p aria-live="polite" className="text-sm text-muted-foreground [overflow-wrap:anywhere]">
        {sample.length ? `Mã mới: ${sample.slice(0, 4).join(", ")}${sample.length > 4 ? ` … ${sample[sample.length - 1]}` : ""}` : "Không có phòng nào để đặt mã."}
      </p>
      <button type="submit" disabled={sample.length === 0} className={`${primaryButton} w-full`}>Đặt lại mã</button>
    </form>
  );
}

/** Radix dialog: traps focus and closes on Esc; bottom sheet on phones. */
export default function LayoutDialogs({ draft, editable, linkPanel, linkHint, target, onTarget, apply, onCloseFocus }: {
  draft: LayoutDraft;
  /** false: only the link panel of a cell is shown. */
  editable: boolean;
  /** What is attached to the target room, with its actions. */
  linkPanel?: ReactNode;
  /** The cell menu is the structural one: point to the view mode for links. */
  linkHint?: boolean;
  target: DialogTarget | null;
  onTarget: (target: DialogTarget | null) => void;
  apply: Apply;
  onCloseFocus: () => void;
}) {
  let title = "";
  let body: ReactNode = null;
  if (target?.type === "cell") {
    const found = findSlot(draft, target.key);
    if (found) {
      title = `${found.slot.roomCode === null ? "Ô trống" : `Phòng ${found.slot.roomCode}`} · ${found.floor.label}, ${found.row.label}`;
      body = (
        <>
          {linkPanel}
          {editable ? (
            <div className={linkPanel ? "space-y-4 border-t border-border pt-4" : "space-y-4"}>
              {linkPanel ? <h3 className="text-sm font-bold">Sửa ô trên sơ đồ</h3> : null}
              {linkHint && found.slot.roomCode !== null ? (
                <p className="text-sm text-muted-foreground">Chỉ sửa ô trên sơ đồ. Muốn gắn tin, hợp đồng hoặc đánh dấu phòng, bấm Xem rồi chọn phòng này.</p>
              ) : null}
              <CellBody draft={draft} slotKey={target.key} apply={apply} />
            </div>
          ) : null}
        </>
      );
    }
  } else if (target?.type === "row") {
    const floor = draft.find((f) => f.rows.some((r) => r.key === target.key));
    const row = floor?.rows.find((r) => r.key === target.key);
    if (floor && row) {
      title = `${row.label} · ${floor.label}`;
      body = <RowBody draft={draft} rowKey={row.key} label={row.label} floorKey={floor.key} apply={apply} />;
    }
  } else if (target?.type === "floor") {
    const floor = draft.find((f) => f.key === target.key);
    if (floor) {
      title = floor.label;
      body = <FloorBody draft={draft} floorKey={floor.key} label={floor.label} apply={apply} openRecode={() => onTarget({ type: "recode", key: floor.key })} />;
    }
  } else if (target?.type === "recode") {
    title = "Đặt lại mã phòng";
    body = <RecodeBody draft={draft} initialFloor={target.key} apply={apply} />;
  }

  return (
    <Dialog.Root open={body !== null} onOpenChange={(open) => { if (!open) onTarget(null); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => { event.preventDefault(); onCloseFocus(); }}
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col overflow-hidden rounded-t-3xl border border-border bg-background text-foreground shadow-2xl sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <Dialog.Title className="min-w-0 text-base font-bold [overflow-wrap:anywhere]">{title}</Dialog.Title>
            <Dialog.Close aria-label="Đóng" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted ${ring}`}>
              <X className="h-5 w-5" aria-hidden="true" />
            </Dialog.Close>
          </div>
          <div key={`${target?.type}-${target?.key}`} className="space-y-4 overflow-y-auto p-4">{body}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
