const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

function load(relativePath, mocks = {}) {
  const filename = path.join(__dirname, "..", relativePath);
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const localRequire = (name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name);
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`, { filename })(localRequire, module, module.exports);
  return module.exports;
}

const lib = load("lib/ai-appointment-cards.ts");
const notes = load("lib/ai-contract-cards.ts");
const { toChatMessage } = load("lib/ai-conversation.ts");
let search = "";
let effect;
let getAppointment;
const notices = [];
const navigations = [];
const router = { replace: (url, options) => { navigations.push([url, options]); search = url.split("?")[1] ?? ""; } };
const link = load("components/appointment/useAppointmentDeepLink.ts", {
  react: { useEffect: (callback) => { effect = callback; }, useCallback: (callback) => callback },
  "next/navigation": { useSearchParams: () => new URLSearchParams(search), usePathname: () => "/dashboard/viewing-schedules", useRouter: () => router },
  "@/services/appointment.service": { getAppointment: (id) => getAppointment(id) },
  sonner: { toast: { info: (message) => notices.push(message), error: (message) => notices.push(message) } },
});
const A1 = "00000000-0000-0000-0000-0000000000a1";
const A2 = "00000000-0000-0000-0000-0000000000a2";
const card = (over = {}) => ({
  appointmentId: A1, requesterRole: "RENTER", roleLabel: "Người thuê", listingId: "00000000-0000-0000-0000-0000000000b1",
  listingTitle: "Căn hộ Mẫu 1", listingAddress: "1 Đường Mẫu", date: "2026-10-14", startTime: "14:00:00", endTime: "15:00:00",
  status: "CONFIRMED", statusLabel: "Đã xác nhận", temporalPhase: "UPCOMING", phaseLabel: "Sắp diễn ra",
  readAt: "2026-10-14T02:00:00Z", source: "CORE", ...over,
});

test("links are built by the app from id, role and status, never from data", () => {
  assert.equal(lib.appointmentHref(card()), `/dashboard/viewing-schedules/my-bookings?appointmentId=${A1}&status=CONFIRMED`);
  assert.equal(lib.appointmentHref(card({ requesterRole: "OWNER", status: "PENDING" })), `/dashboard/viewing-schedules?appointmentId=${A1}&status=PENDING`);
  assert.equal(lib.appointmentHref(card({ appointmentId: "../admin" })), null);
  assert.equal(lib.appointmentHref(card({ requesterRole: "ADMIN" })), null);
  assert.equal(lib.appointmentHref({ ...card(), href: "https://evil.test" }).startsWith("/dashboard/"), true);
  assert.equal(lib.appointmentHref(card({ status: "x&y=1" })), `/dashboard/viewing-schedules/my-bookings?appointmentId=${A1}`);
});

test("only well-formed, de-duplicated cards survive and at most five render", () => {
  const many = Array.from({ length: 8 }, (_, i) => card({ appointmentId: `00000000-0000-0000-0000-${String(i + 1).padStart(12, "0")}` }));
  assert.equal(lib.safeAppointmentCards([...many, card(), null, "x", { appointmentId: "javascript:alert(1)" }]).length, 5);
  assert.deepEqual(lib.safeAppointmentCards([card(), card()]).map((c) => c.appointmentId), [A1]);
  assert.deepEqual(lib.safeAppointmentCards(undefined), []);
  assert.deepEqual(lib.safeAppointmentCards([card({ listingTitle: "" }), card({ requesterRole: "X" })]), []);
});

test("weekday is derived from the calendar date and times are trimmed", () => {
  assert.equal(lib.formatCardDay("2026-10-14"), "Thứ Tư, 14/10/2026");
  assert.equal(lib.formatCardDay("garbage"), null);
  assert.equal(lib.formatTimeRange("14:00:00", "15:30:00"), "14:00–15:30");
  assert.equal(lib.formatTimeRange(null, null), null);
  assert.equal(lib.formatReadAt("not a date"), null);
});

test("stored status and time phase are shown together without inventing attendance", () => {
  assert.equal(lib.appointmentStateText(card()), "Đã xác nhận");
  assert.equal(lib.appointmentStateText(card({ temporalPhase: "PAST" })), "Đã xác nhận · đã qua giờ hẹn");
  assert.equal(lib.appointmentStateText(card({ temporalPhase: "IN_PROGRESS" })), "Đã xác nhận · đang trong giờ hẹn");
  assert.match(lib.appointmentStateText(card({ statusSyncPending: true, temporalPhase: "PAST" })), /chưa cập nhật trạng thái/);
  const done = lib.appointmentStateText(card({ status: "COMPLETED", statusLabel: "Đã hoàn thành", temporalPhase: "PAST" }));
  assert.equal(done, "Đã hoàn thành");
  assert.doesNotMatch(done, /tham dự|đã đến/);
});

const Link = ({ children, prefetch, ...props }) => React.createElement("a", props, children);
const Cards = load("components/chat/AiAppointmentCards.tsx", {
  "next/link": Link, "lucide-react": { CalendarClock: () => null }, "@/lib/ai-appointment-cards": lib,
}).default;

test("card shows listing, role, status, current time, snapshot time and a role-correct new-tab link", () => {
  const html = renderToStaticMarkup(React.createElement(Cards, { cards: [card(), card({ appointmentId: A2, requesterRole: "OWNER", roleLabel: "Chủ nhà" })] }));
  assert.match(html, /Căn hộ Mẫu 1/);
  assert.match(html, /Bạn là người thuê/);
  assert.match(html, /Bạn là chủ nhà/);
  assert.match(html, /Thứ Tư, 14\/10\/2026, 14:00–15:00/);
  assert.match(html, /Đọc lúc/);
  assert.match(html, new RegExp(`href="/dashboard/viewing-schedules/my-bookings\\?appointmentId=${A1}&amp;status=CONFIRMED"`));
  assert.match(html, new RegExp(`href="/dashboard/viewing-schedules\\?appointmentId=${A2}&amp;status=CONFIRMED"`));
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
});

test("a proposed time is a separate, unapproved line and never replaces the current time", () => {
  const html = renderToStaticMarkup(React.createElement(Cards, {
    cards: [card({ rescheduleRequested: true, proposedDate: "2026-10-16", proposedStartTime: "09:00:00", proposedEndTime: "10:00:00" })],
  }));
  assert.match(html, /Thời gian hiện tại: <\/span><span[^>]*>Thứ Tư, 14\/10\/2026, 14:00–15:00/);
  assert.match(html, /Đề xuất đổi sang Thứ Sáu, 16\/10\/2026, 09:00–10:00 \(chưa được duyệt/);
});

test("hostile listing text is escaped and no link comes from the data", () => {
  const html = renderToStaticMarkup(React.createElement(Cards, {
    cards: [{ ...card({ listingTitle: "<script>alert(1)</script>" }), href: "javascript:alert(1)", url: "https://evil.test" }],
  }));
  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /javascript:|evil\.test/);
});

test("no cards renders nothing", () => {
  assert.equal(renderToStaticMarkup(React.createElement(Cards, { cards: [] })), "");
  assert.equal(renderToStaticMarkup(React.createElement(Cards, {})), "");
});

test("status notes name the appointment module and never read as contract or listing", () => {
  const src = ["CORE_APPOINTMENT"];
  assert.match(notes.aiStatusNote("NO_RESULTS", src), /lịch xem nhà/);
  assert.match(notes.aiStatusNote("TOOL_UNAVAILABLE", src), /lịch xem nhà/);
  assert.match(notes.aiStatusNote("LOGIN_REQUIRED", src), /lịch xem nhà/);
  assert.match(notes.aiStatusNote("NEEDS_CLARIFICATION", src), /lịch/);
  assert.match(notes.aiStatusNote("NOT_FOUND", src), /lịch/);
  for (const status of ["NO_RESULTS", "TOOL_UNAVAILABLE", "LOGIN_REQUIRED", "NEEDS_CLARIFICATION", "NOT_FOUND"]) {
    assert.doesNotMatch(notes.aiStatusNote(status, src), /hợp đồng|tin đăng đang/);
  }
  // Old behaviour for contract and listing answers is unchanged.
  assert.match(notes.aiStatusNote("NO_RESULTS", ["CORE_CONTRACT"]), /hợp đồng/);
  assert.match(notes.aiStatusNote("NO_RESULTS", []), /tin đăng/);
});

test("source line separates personal Core data from RAG and is absent when nothing was read", () => {
  assert.match(notes.aiSourceNote(["CORE_APPOINTMENT"], "ANSWERED"), /lịch xem nhà của bạn/);
  assert.match(notes.aiSourceNote(["CORE_APPOINTMENT", "RAG"], "ANSWERED"), /hướng dẫn chung/);
  assert.equal(notes.aiSourceNote(["CORE_APPOINTMENT"], "TOOL_UNAVAILABLE"), null);
  assert.equal(notes.aiSourceNote(["CORE_APPOINTMENT"], "LOGIN_REQUIRED"), null);
  assert.match(notes.aiSourceNote(["CORE_CONTRACT"]), /hợp đồng/);
});

test("history restores appointment cards for assistant messages only; old messages still work", () => {
  const restored = toChatMessage({ id: "1", role: "assistant", content: "ok", createdAt: "2026-10-14T02:00:00Z", appointmentCards: [card()], dataSources: ["CORE_APPOINTMENT"] });
  assert.equal(restored.appointmentCards.length, 1);
  assert.equal(toChatMessage({ id: "2", role: "user", content: "hi", createdAt: "2026-10-14T02:00:00Z", appointmentCards: [card()] }).appointmentCards, undefined);
  const old = toChatMessage({ id: "3", role: "assistant", content: "cũ", createdAt: "2026-10-14T02:00:00Z" });
  assert.equal(old.appointmentCards, undefined);
  assert.deepEqual(lib.safeAppointmentCards(old.appointmentCards), []);
});

test("deep link accepts only a UUID id and a whitelisted status hint", () => {
  assert.deepEqual({ ...link.parseDeepLink(`?appointmentId=${A1.toUpperCase()}&status=PENDING`) }, { id: A1, hint: "PENDING" });
  assert.deepEqual({ ...link.parseDeepLink(`?appointmentId=${A1}&status=HACK`) }, { id: A1, hint: null });
  assert.equal(link.parseDeepLink("?appointmentId=1;drop"), null);
  assert.equal(link.parseDeepLink(""), null);
  assert.equal(link.tabForStatus("CONFIRMED"), "CALENDAR");
  assert.equal(link.tabForStatus("CANCELLED"), "CANCELLED");
  assert.equal(link.tabForStatus("EXPIRED"), null);
});

test("same-page links load each exact id once and use current status, not the stale hint", async () => {
  const calls = [];
  const opened = [];
  getAppointment = async (id) => {
    calls.push(id);
    return { id, ownerId: "owner", renterId: "renter", status: "CANCELLED" };
  };
  const onOpen = (appointment, tab) => { if (appointment) opened.push([appointment.id, tab]); };
  search = `appointmentId=${A1}&status=PENDING`;
  link.useAppointmentDeepLink({ authenticated: true, userId: "owner", side: "OWNER", onOpen });
  const cleanup = effect();
  await new Promise(setImmediate);
  cleanup();
  search = `appointmentId=${A2}`;
  link.useAppointmentDeepLink({ authenticated: true, userId: "owner", side: "OWNER", onOpen });
  effect();
  await new Promise(setImmediate);
  assert.deepEqual(calls, [A1, A2]);
  assert.deepEqual(opened, [[A1, "CANCELLED"], [A2, "CANCELLED"]]);
});

test("navigating away ignores a late detail response and forbidden ids show a safe notice", async () => {
  let resolve;
  let opened = false;
  getAppointment = () => new Promise((done) => { resolve = done; });
  search = `appointmentId=${A1}`;
  link.useAppointmentDeepLink({ authenticated: true, userId: "owner", side: "OWNER", onOpen: (appointment) => { opened = Boolean(appointment); } });
  const cleanup = effect();
  cleanup();
  resolve({ id: A1, status: "CONFIRMED" });
  await new Promise(setImmediate);
  assert.equal(opened, false);
  getAppointment = async () => { throw { response: { status: 403 } }; };
  link.useAppointmentDeepLink({ authenticated: true, userId: "owner", side: "OWNER", onOpen: (appointment) => { opened = Boolean(appointment); } });
  effect();
  await new Promise(setImmediate);
  assert.equal(opened, false);
  assert.match(notices.at(-1), /không có quyền/);
});

test("closing clears only the appointment query and the same booking link can open again", async () => {
  let opened = 0;
  let selected = { id: "old" };
  getAppointment = async (id) => ({ id, ownerId: "owner", renterId: "renter", status: "PENDING" });
  search = `appointmentId=${A1}&status=PENDING&keep=1`;
  const options = { authenticated: true, userId: "owner", side: "OWNER", onOpen: (appointment) => { selected = appointment; if (appointment) opened++; } };
  const clear = link.useAppointmentDeepLink(options);
  let cleanup = effect();
  assert.equal(selected, null);
  await new Promise(setImmediate);
  clear();
  assert.equal(search, "keep=1");
  assert.equal(navigations.at(-1)[1].scroll, false);
  cleanup();
  search = `appointmentId=${A1}&keep=1`;
  link.useAppointmentDeepLink(options);
  cleanup = effect();
  await new Promise(setImmediate);
  assert.equal(opened, 2);
  cleanup();
  link.useAppointmentDeepLink({ ...options, userId: "renter", side: "OWNER" });
  effect();
  await new Promise(setImmediate);
  assert.equal(opened, 2);
  assert.match(notices.at(-1), /không thuộc phía/);
});

test("appointment refresh ignores badge events and coalesces a socket/push burst", async () => {
  let listener;
  let refreshes = 0;
  let detail = { id: A1, status: "PENDING" };
  let detailReads = 0;
  let unsubscribed = false;
  const { useAppointmentNotifications } = load("components/appointment/useAppointmentNotifications.ts", {
    react: { useEffect: (callback) => { effect = callback; } },
    "@/services/notification.service": { subscribe: (callback) => { listener = callback; return () => { unsubscribed = true; }; } },
    "@/services/appointment.service": { getAppointment: async () => { detailReads++; return { id: A1, status: "CONFIRMED" }; } },
  });
  useAppointmentNotifications({ authenticated: true, refresh: async () => { refreshes++; }, detailId: A1, setDetail: (update) => { detail = update(detail); } });
  const cleanup = effect();
  listener({ type: "unread-count", count: 2 });
  listener({ type: "read", id: "notification" });
  await new Promise((resolve) => setTimeout(resolve, 270));
  assert.equal(refreshes, 0);
  listener({ type: "appointment-changed", bookingId: A1 });
  listener({ type: "appointment-changed" });
  listener({ type: "appointment-changed", bookingId: A1 });
  await new Promise((resolve) => setTimeout(resolve, 270));
  assert.equal(refreshes, 1);
  assert.equal(detailReads, 1);
  assert.equal(detail.status, "CONFIRMED");
  listener({ type: "appointment-changed" });
  cleanup();
  await new Promise((resolve) => setTimeout(resolve, 270));
  assert.equal(refreshes, 1);
  assert.equal(unsubscribed, true);
});
