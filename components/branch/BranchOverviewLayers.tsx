"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import {
  AlarmClock, AlertTriangle, BadgeCheck, Ban, Bookmark, CalendarClock, ChevronLeft, ChevronRight, CircleDashed,
  DoorOpen, ExternalLink, FileText, Hourglass, KeyRound, LogIn, Megaphone, Minus, RefreshCw, Search, TriangleAlert, Unlink, Wrench, X,
  type LucideIcon,
} from "lucide-react";
import {
  LAYER_LABEL,
  LAYER_STATUS_LABEL,
  confirmationCountdown,
  formatInstant,
  layerReady,
  monthLabel,
  paymentKindLabel,
  roomLayerLabel,
  roomLayerStatus,
  roomMatches,
  shiftMonth,
  statusLabel,
  targetHref,
  type BranchOverview,
  type OverviewExpiry,
  type OverviewLayer,
  type OverviewMeter,
  type OverviewPayment,
  type OverviewRoom,
} from "@/services/branch-overview.service";
import { formatDay } from "@/lib/branch-assignment";
import type { DraftSlot, LayoutDraft } from "@/types/branch-layout.type";
import { outlineButton, ring } from "./LayoutBoard";
import { inputClass } from "./linkUi";

interface Look { icon: LucideIcon; tone: string }

const NEUTRAL: Look = { icon: Minus, tone: "border-border bg-card text-foreground" };
const green = "border-green-600 bg-green-50 text-green-950 dark:border-green-500 dark:bg-green-950 dark:text-green-50";
const purple = "border-purple-600 bg-purple-50 text-purple-950 dark:border-purple-400 dark:bg-purple-950 dark:text-purple-50";
const blue = "border-blue-600 bg-blue-50 text-blue-950 dark:border-blue-400 dark:bg-blue-950 dark:text-blue-50";
const orange = "border-orange-600 bg-orange-50 text-orange-950 dark:border-orange-400 dark:bg-orange-950 dark:text-orange-50";
const red = "border-red-600 bg-red-50 text-red-950 dark:border-red-400 dark:bg-red-950 dark:text-red-50";
const gray = "border-dashed border-slate-500 bg-slate-100 text-slate-900 dark:border-slate-400 dark:bg-slate-800 dark:text-slate-50";
const muted = "border-border bg-muted text-muted-foreground";
const teal = "border-teal-600 bg-teal-50 text-teal-950 dark:border-teal-400 dark:bg-teal-950 dark:text-teal-50";
const amber = "border-amber-600 bg-amber-50 text-amber-950 dark:border-amber-400 dark:bg-amber-950 dark:text-amber-50";

const LOOKS: Record<OverviewLayer, Record<string, Look>> = {
  rooms: {
    VACANT: { icon: DoorOpen, tone: NEUTRAL.tone },
    UNLINKED: { icon: Unlink, tone: muted },
    ADVERTISED: { icon: Megaphone, tone: teal },
    RESERVED: { icon: Bookmark, tone: amber },
    OCCUPIED: { icon: KeyRound, tone: green },
    MOVING_IN: { icon: LogIn, tone: purple },
    EXTERNAL_RENT: { icon: Ban, tone: gray },
    REPAIR: { icon: Wrench, tone: orange },
  },
  payments: {
    OVERDUE: { icon: AlertTriangle, tone: red },
    PENDING_CONFIRMATION: { icon: Hourglass, tone: purple },
    DUE_SOON: { icon: AlarmClock, tone: orange },
    NOT_DUE: { icon: CalendarClock, tone: blue },
    UNISSUED: { icon: CircleDashed, tone: gray },
    PAID: { icon: BadgeCheck, tone: green },
    NONE: NEUTRAL,
  },
  meters: {
    TODAY: { icon: AlertTriangle, tone: red },
    UPCOMING: { icon: CalendarClock, tone: orange },
    RECORDED: { icon: BadgeCheck, tone: green },
    NONE: NEUTRAL,
  },
  contracts: {
    WITHIN_30: { icon: AlarmClock, tone: red },
    WITHIN_60: { icon: CalendarClock, tone: orange },
    LONG: NEUTRAL,
    NO_LEASE: NEUTRAL,
  },
};
const look = (layer: OverviewLayer, status: string) => LOOKS[layer][status] ?? { icon: FileText, tone: NEUTRAL.tone };

/** Milliseconds since the response arrived, refreshed often enough for a minute countdown. */
function useElapsed(since: number) {
  const [now, setNow] = useState(since);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, [since]);
  return Math.max(0, now - since);
}

type Times = Pick<BranchOverview, "billingNow" | "realNow">;

const dueText = (payment: OverviewPayment) =>
  `${payment.status === "UNISSUED" ? "Hạn dự kiến" : "Hạn"} ${formatInstant(payment.dueAt)}`;

interface Entry {
  key: string;
  href: string | null;
  status: string;
  layer: OverviewLayer;
  title: string;
  lines: (string | null)[];
}

const paymentEntry = (payment: OverviewPayment, times: Times, elapsed: number): Entry => ({
  key: payment.id,
  href: targetHref(payment.target),
  status: payment.status,
  layer: "payments",
  title: `${statusLabel("payments", payment.status)} · ${paymentKindLabel(payment.kind)}`,
  lines: [dueText(payment), payment.status === "PENDING_CONFIRMATION" ? confirmationCountdown(payment, times, elapsed) : null],
});

const meterLines = (meter: OverviewMeter) => [
  `Ngày ghi ${formatDay(meter.meterDate)}`,
  meter.status === "RECORDED" ? null : `Hạn ghi ${formatInstant(meter.deadlineAt)}`,
];
/** The end is exclusive: the lease runs until the start of that day. */
const expiryLines = (expiry: OverviewExpiry) =>
  [`Còn ${expiry.daysRemaining} ngày`, `Mốc kết thúc: 00:00 ngày ${formatDay(expiry.endDateExclusive)}`];

const meterEntry = (meter: OverviewMeter): Entry => ({
  key: meter.contractId,
  href: targetHref(meter.target),
  status: meter.status,
  layer: "meters",
  title: `${statusLabel("meters", meter.status)} · Chi phí tháng ${meter.periodIndex + 1}`,
  lines: meterLines(meter),
});

const expiryEntry = (expiry: OverviewExpiry): Entry => ({
  key: expiry.contractId,
  href: targetHref(expiry.target),
  status: expiry.status,
  layer: "contracts",
  title: statusLabel("contracts", expiry.status),
  lines: expiryLines(expiry),
});

/** The current stay (or listing) and the next one. A ROOM target is the cell menu, not a page. */
function stayEntries(room: OverviewRoom): Entry[] {
  const entries: Entry[] = [];
  const href = room.target?.kind === "ROOM" ? null : targetHref(room.target);
  if (href) {
    entries.push({ key: "current", href, status: room.status, layer: "rooms", title: roomLayerLabel(room, "rooms"), lines: [room.tenantName] });
  }
  const next = room.nextStay;
  if (next && targetHref(next.target)) {
    entries.push({ key: "next", href: targetHref(next.target), status: "MOVING_IN", layer: "rooms", title: "Sắp vào", lines: [next.tenantName, `Ngày vào ${formatDay(next.moveInDate)}`] });
  }
  return entries;
}

function EntryList({ entries }: { entries: Entry[] }) {
  return (
    <ul className="space-y-2">
      {entries.map((entry) => {
        const { icon: Icon, tone } = look(entry.layer, entry.status);
        const content = (
          <>
            <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
              <span className="block font-semibold">{entry.title}</span>
              {entry.lines.filter(Boolean).map((line, i) => <span key={i} className="block text-xs">{line}</span>)}
              {entry.href ? null : <span className="block text-xs">Chưa có đường dẫn mở.</span>}
            </span>
            {entry.href ? <ExternalLink className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : null}
          </>
        );
        const className = `flex min-h-11 items-start gap-2 rounded-xl border-2 p-3 text-sm ${tone}`;
        return (
          <li key={entry.key}>
            {entry.href ? <Link href={entry.href} className={`${className} hover:underline ${ring}`}>{content}</Link> : <div className={className}>{content}</div>}
          </li>
        );
      })}
    </ul>
  );
}

/** Open payments that have no room: listed with the tray so they are not missed. */
export function UnplacedPayments({ overview, fetchedAt }: { overview: BranchOverview; fetchedAt: number }) {
  const elapsed = useElapsed(fetchedAt);
  const id = useId();
  if (overview.unplacedPayments.length === 0) return null;
  return (
    <section aria-labelledby={id} className="space-y-3 rounded-2xl border border-border bg-card p-3">
      <h3 id={id} className="text-sm font-bold">
        Khoản thu chưa xếp phòng ({overview.unplacedPayments.length}) · {monthLabel(overview.month)} và nợ cũ
      </h3>
      <EntryList entries={overview.unplacedPayments.map((p) => paymentEntry(p, overview, elapsed))} />
    </section>
  );
}

const pressable = (pressed: boolean) => `${outlineButton} ${pressed ? "!border-primary !bg-primary/10 ring-1 ring-primary" : ""}`;

/** The map as a status view: one layer at a time; every cell leads to the page where the work is done. */
export default function BranchOverviewLayers({ floors, openRoom, mismatch, overview, month, fetchedAt, error, layer, floorId, onView, onRefresh }: {
  /** The saved map. */
  floors: LayoutDraft;
  /** Opens the room menu of the map (attach, mark, post a listing); absent when it has nothing to offer. */
  openRoom?: (roomId: string) => void;
  /** Whether a listing on this room declares another code than the cell: shows the small reminder. */
  mismatch?: (roomId: string, code: string) => boolean;
  /** null while another month is loading. */
  overview: BranchOverview | null;
  /** The month asked for; "" = the server's current month. */
  month: string;
  fetchedAt: number;
  /** Set when a refresh failed and the data on screen may be old. */
  error: string;
  layer: OverviewLayer;
  floorId: string | null;
  onView: (patch: Partial<Record<"floor" | "layer" | "month", string>>) => void;
  onRefresh: () => void;
}) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<{ layer: OverviewLayer; status: string } | null>(null);
  const [list, setList] = useState<{ title: string; entries: Entry[] } | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const searchId = useId();
  const layerName = useId();
  const elapsed = useElapsed(fetchedAt);

  const ready = !overview || layerReady(overview, layer);
  const highlight = ready && picked?.layer === layer ? picked.status : null;
  const floor = floors.find((f) => f.id === floorId) ?? floors[0];
  const byId = new Map(overview?.rooms.map((r) => [r.roomId, r]));
  const roomsOf = (f: LayoutDraft[number]) => f.rows.flatMap((r) => r.slots.filter((s) => s.roomCode !== null));
  const allSlots = floors.flatMap(roomsOf);
  const filtering = query.trim() !== "" || highlight !== null;
  const matches = (slot: DraftSlot) => {
    const room = byId.get(slot.id ?? "");
    return (!query.trim() || roomMatches(slot.roomCode ?? "", room, query))
      && (!highlight || (!!room && roomLayerStatus(room, layer) === highlight));
  };
  const matchCount = filtering ? allSlots.filter(matches).length : 0;
  const counts = new Map<string, number>();
  for (const slot of allSlots) {
    const room = byId.get(slot.id ?? "");
    if (room && ready) counts.set(roomLayerStatus(room, layer), (counts.get(roomLayerStatus(room, layer)) ?? 0) + 1);
  }
  const labels = LAYER_STATUS_LABEL[layer];
  const shownMonth = month || overview?.month || "";

  const cell = (slot: DraftSlot, place: string) => {
    if (slot.roomCode === null) {
      return <div className="flex min-h-14 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/40 px-1.5 text-xs text-muted-foreground">Ô trống</div>;
    }
    const code = slot.roomCode;
    const room = byId.get(slot.id ?? "");
    const shown = ready ? room : undefined;
    const status = shown ? roomLayerStatus(shown, layer) : "";
    const { icon: Icon, tone } = shown ? look(layer, status) : NEUTRAL;
    const label = !overview ? "Đang tải…" : shown ? roomLayerLabel(shown, layer) : "Chưa có dữ liệu";

    const lines: string[] = [];
    let entries: Entry[] = [];
    if (room && layer === "rooms") {
      if (room.tenantName) lines.push(room.tenantName);
      if (room.nextStay) lines.push(`Sắp vào ${formatDay(room.nextStay.moveInDate)}: ${room.nextStay.tenantName || "chưa có tên"}`);
      entries = stayEntries(room);
    } else if (shown && layer === "meters") {
      const items = shown.meters!;
      if (items[0]) lines.push(...meterLines(items[0]).filter((line) => line !== null));
      entries = items.map(meterEntry);
    } else if (shown && layer === "contracts") {
      const items = shown.contracts!;
      if (items[0]) lines.push(...expiryLines(items[0]));
      entries = items.map(expiryEntry);
    } else if (room && layer === "payments" && room.payments.items.length > 0) {
      const [first] = room.payments.items;
      lines.push(`${room.payments.count} khoản`, dueText(first));
      const countdown = status === "PENDING_CONFIRMATION" ? confirmationCountdown(first, overview!, elapsed) : null;
      if (countdown) lines.push(countdown);
      entries = room.payments.items.map((p) => paymentEntry(p, overview!, elapsed));
    }

    const panel = layer === "rooms" && !!overview && !!openRoom;
    const flagged = !!slot.id && !!mismatch?.(slot.id, code);
    const matched = filtering && matches(slot);
    const className = `flex min-h-24 w-full scroll-mb-28 flex-col items-center justify-center gap-0.5 rounded-lg border-2 px-1.5 py-1.5 text-center [overflow-wrap:anywhere] ${
      filtering && !matched ? "border-dashed border-border bg-card text-muted-foreground" : tone
    } ${matched ? "outline-4 outline-offset-1 outline-foreground" : ""}`;
    const content = (
      <>
        <span className="text-base font-bold">{code}</span>
        <span className="flex items-center justify-center gap-1 text-xs font-semibold">
          <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> <span>{label}</span>
        </span>
        {lines.map((line, i) => <span key={i} className="line-clamp-3 text-xs">{line}</span>)}
        {flagged ? (
          <span className="flex items-center justify-center gap-1 text-xs font-semibold">
            <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> Lệch mã tin
          </span>
        ) : null}
        {entries.length > 1 && !panel ? <span className="text-xs font-semibold underline">Xem {entries.length} mục</span> : null}
      </>
    );
    const name = [`Phòng ${code}`, place, label, ...lines, flagged ? "mã trên tin khác mã ô" : "", matched ? "đang được làm nổi" : ""].filter(Boolean).join(", ");
    const shared = { "data-focus-key": slot.key, className: `${className} ${ring}` };

    // On the room layer the cell opens the room panel (status, main step, links, flags); other layers go to the page.
    if (panel) {
      return <button type="button" {...shared} aria-haspopup="dialog" onClick={() => openRoom!(slot.id!)} aria-label={`${name}. Mở chi tiết phòng`}>{content}</button>;
    }
    if (entries.length > 1) {
      return (
        <button
          type="button" {...shared} aria-haspopup="dialog" aria-label={`${name}. Xem ${entries.length} mục`}
          onClick={(e) => { opener.current = e.currentTarget; setList({ title: `Phòng ${code}`, entries }); }}
        >
          {content}
        </button>
      );
    }
    if (entries[0]?.href) return <Link href={entries[0].href} {...shared} aria-label={`${name}. Mở trang`}>{content}</Link>;
    return <div data-focus-key={slot.key} tabIndex={-1} className={className}>{content}</div>;
  };

  const toolbarButton = (label: string, icon: ReactNode, onClick: () => void, disabled: boolean) => (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className={`${outlineButton} w-11 !px-0`}>{icon}</button>
  );

  return (
    <div className="min-w-0 space-y-3" aria-busy={!overview}>
      <div className="flex flex-wrap items-center gap-2">
        <fieldset className="flex flex-wrap gap-2">
          <legend className="sr-only">Lớp xem trên sơ đồ</legend>
          {(Object.keys(LAYER_LABEL) as OverviewLayer[]).map((id) => (
            <label key={id} className={`${pressable(layer === id)} cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring`}>
              <input type="radio" name={layerName} checked={layer === id} onChange={() => onView({ layer: id })} className="h-4 w-4 accent-[var(--primary)]" />
              {LAYER_LABEL[id]}
            </label>
          ))}
        </fieldset>
        {layer === "payments" && shownMonth ? (
          <div role="group" aria-label="Tháng của hạn thanh toán" className="flex flex-wrap items-center gap-2">
            {toolbarButton("Tháng trước", <ChevronLeft className="h-4 w-4" aria-hidden="true" />, () => onView({ month: shiftMonth(shownMonth, -1) }), shownMonth === "0001-01")}
            <p aria-live="polite" className="min-w-28 text-center text-sm font-bold">{monthLabel(shownMonth)}</p>
            {toolbarButton("Tháng sau", <ChevronRight className="h-4 w-4" aria-hidden="true" />, () => onView({ month: shiftMonth(shownMonth, 1) }), shownMonth === "9999-12")}
            {month ? <button type="button" onClick={() => onView({ month: "" })} className={outlineButton}>Tháng hiện tại</button> : null}
          </div>
        ) : null}
        <button type="button" onClick={onRefresh} aria-label="Làm mới tình trạng phòng" title="Làm mới" className={`${outlineButton} w-11 !px-0 sm:ml-auto`}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {layer === "payments" ? <p className="text-xs text-muted-foreground">Gồm khoản có hạn trong tháng và nợ quá hạn của các tháng trước.</p> : null}
      {layer === "meters" ? <p className="text-xs text-muted-foreground">Bấm vào phòng để mở hóa đơn của hợp đồng; việc ghi chỉ số làm ở đó.</p> : null}
      {layer === "contracts" ? <p className="text-xs text-muted-foreground">Hợp đồng đã xếp phòng còn tối đa 60 ngày. Hợp đồng chưa xếp phòng xem ở mục Cần chú ý.</p> : null}
      {!ready ? <p role="status" className="rounded-xl border border-amber-500/60 bg-amber-500/10 p-3 text-sm">Máy chủ chưa có dữ liệu cho lớp {LAYER_LABEL[layer]}. Lớp Phòng và Thu tiền vẫn dùng được.</p> : null}
      {error ? <p role="alert" className="rounded-xl border border-amber-500/60 bg-amber-500/10 p-3 text-sm">Chưa tải lại được, tình trạng có thể đã cũ. {error}</p> : null}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <label htmlFor={searchId} className="sr-only">Tìm mã phòng hoặc tên người thuê</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input id={searchId} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm mã phòng, người thuê" autoComplete="off" className={`${inputClass} !pl-9`} />
        </div>
        {!ready ? null : overview ? (
          <div role="group" aria-label={`Chú giải, ${allSlots.length} phòng. Bấm để làm nổi`} className="contents">
            {Object.keys(labels).filter((status) => (counts.get(status) ?? 0) > 0 || highlight === status).map((status) => {
              const { icon: Icon, tone } = look(layer, status);
              const count = counts.get(status) ?? 0;
              const pressed = highlight === status;
              return (
                <button
                  key={status} type="button" aria-pressed={pressed}
                  onClick={() => setPicked(pressed ? null : { layer, status })}
                  className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl border-2 px-2.5 text-xs font-semibold ${tone} ${pressed ? "outline-4 outline-offset-1 outline-foreground" : ""} ${ring}`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {labels[status]}: {count}
                </button>
              );
            })}
          </div>
        ) : <p role="status" className="text-sm text-muted-foreground">Đang tải tình trạng phòng…</p>}
        {filtering ? <button type="button" onClick={() => { setQuery(""); setPicked(null); }} className={outlineButton}>Bỏ làm nổi</button> : null}
      </div>
      <p aria-live="polite" className="text-sm font-semibold empty:hidden">
        {filtering && overview ? (matchCount ? `Làm nổi ${matchCount} phòng.` : "Không có phòng nào khớp.") : ""}
      </p>

      {floors.length > 1 ? (
        <div role="group" aria-label="Chọn tầng" className="flex flex-wrap gap-2">
          {floors.map((f) => (
            <button key={f.key} type="button" aria-pressed={f === floor} onClick={() => onView({ floor: f.id ?? "" })} className={`${pressable(f === floor)} max-w-full [overflow-wrap:anywhere]`}>
              {f.label}{filtering && overview ? ` (${roomsOf(f).filter(matches).length} khớp)` : ""}
            </button>
          ))}
        </div>
      ) : null}

      {floor ? (
        <section aria-label={floor.label} className="min-w-0 rounded-2xl border border-border bg-card">
          <h3 className="border-b border-border px-3 py-2 text-sm font-bold [overflow-wrap:anywhere]">{floor.label}</h3>
          {/* The map scrolls sideways in here so the page itself never does. */}
          <div tabIndex={0} role="group" aria-label={`Sơ đồ ${floor.label}`} className={`overflow-x-auto p-3 ${ring}`}>
            {floor.rows.length === 0 ? <p className="text-sm text-muted-foreground">Tầng này chưa có dãy.</p> : null}
            <div className="flex w-max items-start gap-3">
              {floor.rows.map((row) => (
                <div key={row.key} className="w-36 shrink-0 space-y-2">
                  <p className="truncate text-center text-xs font-semibold text-muted-foreground" title={row.label}>{row.label}</p>
                  <ul aria-label={`${row.label}, ${floor.label}`} className="space-y-2">
                    {row.slots.map((slot) => <li key={slot.key}>{cell(slot, `${row.label}, ${floor.label}`)}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <Dialog.Root open={list !== null} onOpenChange={(open) => { if (!open) setList(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
          <Dialog.Content
            aria-describedby={undefined}
            onCloseAutoFocus={(e) => { e.preventDefault(); if (opener.current?.isConnected) opener.current.focus(); }}
            className="fixed left-1/2 top-1/2 z-50 max-h-[85dvh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 space-y-3 overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-xl"
          >
            <div className="flex items-center justify-between gap-2">
              <Dialog.Title className="min-w-0 text-base font-bold [overflow-wrap:anywhere]">{list?.title}</Dialog.Title>
              <Dialog.Close aria-label="Đóng" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted ${ring}`}>
                <X className="h-5 w-5" aria-hidden="true" />
              </Dialog.Close>
            </div>
            <EntryList entries={list?.entries ?? []} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
