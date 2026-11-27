/* eslint-disable @typescript-eslint/no-require-imports -- Node test and isolated TS loader. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadTs } = require("./helpers/ts-loader.cjs");

const calls = [];
const overview = loadTs("services/branch-overview.service.ts", {
  "@/config/listing-status.config": loadTs("config/listing-status.config.ts"),
  "@/lib/axios-client": { get: async (...args) => {
    calls.push(args);
    return { data: { code: 1000, result: fixture } };
  } },
});
const { safeInvoiceSelectionId } = loadTs("lib/payment-module.ts");
const { targetHref, isMonth, shiftMonth, monthLabel, formatInstant, confirmationCountdown,
  roomMatches, roomLayerStatus, roomLayerLabel, statusLabel, paymentKindLabel, parseOverview } = overview;

const contract = { kind: "CONTRACT", id: "c", href: "/dashboard/landlord/contracts/c?tab=overview" };
const firstRent = { kind: "INVOICE", id: "first-rent:p", href: "/dashboard/landlord/contracts/c?tab=payment&section=monthly&invoice=first-rent%3Ap" };
const request = { kind: "RENTAL_REQUEST", id: "rental", href: "/dashboard/rental-requests?requestId=rental" };
const payment = { id: "first-rent:p", kind: "INITIAL", contractId: "c", status: "PENDING_CONFIRMATION",
  dueAt: "2026-11-30T17:00:00Z", confirmationDueAt: "2026-11-30T17:01:00Z", clock: "BILLING", target: firstRent };
const room = { roomId: "r1", status: "OCCUPIED", tenantName: "Đặng Thảo", target: contract,
  nextStay: { tenantName: "Hồ Ánh", moveInDate: "2026-12-12", target: request },
  payments: { status: "PENDING_CONFIRMATION", count: 1, items: [payment] } };
const fixture = { branchId: "branch", month: "2026-12", billingNow: "2026-11-30T17:00:00Z", realNow: "2026-11-20T12:00:00Z",
  rooms: [room, { roomId: "r2", status: "VACANT", tenantName: null, target: null, nextStay: null,
    payments: { status: "NONE", count: 0, items: [] } }],
  unplacedPayments: [{ ...payment, id: "first-rent:q", contractId: null, confirmationDueAt: null, status: "OVERDUE", target: request }],
};

test("Core JSON preserves nullable keys, ordered items and the server's main status", () => {
  assert.deepEqual(parseOverview(fixture), fixture);
  assert.equal(roomLayerStatus(room, "rooms"), "OCCUPIED");
  assert.equal(roomLayerStatus(room, "payments"), "PENDING_CONFIRMATION");
  assert.equal(roomLayerStatus(fixture.rooms[1], "payments"), "NONE");
  assert.equal(statusLabel("payments", "DUE_SOON"), "Sắp đến hạn / Đang gia hạn");
  assert.equal(paymentKindLabel("PROJECTED"), "Kỳ dự kiến");
  assert.throws(() => parseOverview({ ...fixture, rooms: [{ ...room, payments: { ...room.payments, items: null } }] }));
  assert.throws(() => parseOverview({ ...fixture, unplacedPayments: [null] }));
});

const listing = { kind: "LISTING", id: "l1", href: "/dashboard/properties/view?id=l1" };
const roomWith = (patch) => ({ roomId: "r3", status: "VACANT", tenantName: null, target: listing, nextStay: null,
  payments: { status: "NONE", count: 0, items: [] }, ...patch });

test("UNLINKED and VACANT with a nullable listingStatus parse; unknown room status is still rejected", () => {
  const rooms = [roomWith({ status: "UNLINKED", target: null }), roomWith({ listingStatus: "PENDING_REVIEW" }),
    roomWith({ listingStatus: null }), roomWith({})];
  assert.deepEqual(parseOverview({ ...fixture, rooms }).rooms, rooms);
  assert.throws(() => parseOverview({ ...fixture, rooms: [roomWith({ status: "NOPE" })] }));
  assert.throws(() => parseOverview({ ...fixture, rooms: [roomWith({ listingStatus: 5 })] }));
});

test("room cell wording: Chưa gắn tin, and Trống with the listing's Vietnamese status", () => {
  assert.equal(statusLabel("rooms", "UNLINKED"), "Chưa gắn tin");
  assert.deepEqual(Object.keys(overview.ROOM_STATUS_LABEL).slice(0, 2), ["VACANT", "UNLINKED"]);
  assert.equal(roomLayerLabel(roomWith({ listingStatus: "PENDING_REVIEW" }), "rooms"), "Trống · Chờ duyệt");
  assert.equal(roomLayerLabel(roomWith({ listingStatus: "HIDDEN" }), "rooms"), "Trống · Đã ẩn");
  assert.equal(roomLayerLabel(roomWith({ listingStatus: "FUTURE" }), "rooms"), "Trống · Đang cập nhật");
  assert.equal(roomLayerLabel(roomWith({ listingStatus: null }), "rooms"), "Trống");
  assert.equal(roomLayerLabel(roomWith({}), "rooms"), "Trống");
  assert.equal(roomLayerLabel(roomWith({ listingStatus: "HIDDEN" }), "payments"), "Không có khoản");
  assert.equal(roomLayerLabel(roomWith({ status: "UNLINKED", listingStatus: "HIDDEN" }), "rooms"), "Chưa gắn tin");
});

test("contracts layer: no expiry listed means over 60 days when occupied, otherwise no lease", () => {
  const expiry = { contractId: "c", status: "WITHIN_30", endDateExclusive: "2026-12-10", daysRemaining: 13, target: contract };
  const occupied = roomWith({ status: "OCCUPIED", contracts: [] });
  assert.equal(roomLayerStatus(occupied, "contracts"), "LONG");
  assert.equal(statusLabel("contracts", "LONG"), "Trên 60 ngày");
  assert.equal(roomLayerLabel(occupied, "contracts"), "Còn hạn trên 60 ngày");
  for (const status of ["VACANT", "UNLINKED", "ADVERTISED", "RESERVED", "MOVING_IN", "EXTERNAL_RENT", "REPAIR"]) {
    assert.equal(roomLayerStatus(roomWith({ status, contracts: [] }), "contracts"), "NO_LEASE", status);
  }
  assert.equal(roomLayerLabel(roomWith({ contracts: [] }), "contracts"), "Không có hợp đồng");
  assert.equal(roomLayerStatus(roomWith({ status: "OCCUPIED", contracts: [expiry] }), "contracts"), "WITHIN_30");
  assert.deepEqual(Object.values(overview.LAYER_STATUS_LABEL.contracts), ["≤ 30 ngày", "31–60 ngày", "Trên 60 ngày", "Không có hợp đồng"]);
  // The server now sends LONG; an unknown status is still a bad shape.
  const ready = (item) => overview.layerReady({ rooms: [roomWith({ contracts: [item] })] }, "contracts");
  assert.equal(ready({ ...expiry, status: "LONG", daysRemaining: 90 }), true);
  assert.equal(ready({ ...expiry, status: "SOON" }), false);
  assert.equal(ready({ ...expiry, endDateExclusive: "later" }), false);
  // Expired and not handed over: daysRemaining <= 0 (also negative) is valid.
  assert.equal(ready({ ...expiry, daysRemaining: -3 }), true);
});

test("lease wording: last day is the day before the exclusive end, with no time zone shift", () => {
  const e = (endDateExclusive, daysRemaining) => ({ endDateExclusive, daysRemaining });
  assert.equal(overview.expiryText(e("2026-12-10", 13)), "Còn 13 ngày · hết 09/12/2026");
  assert.equal(overview.expiryText(e("2027-01-01", 5)), "Còn 5 ngày · hết 31/12/2026");
  assert.equal(overview.expiryText(e("2028-03-01", 90)), "Còn 90 ngày · hết 29/02/2028");
  assert.equal(overview.expiryText(e("2026-11-27", 0)), "Hết hạn 26/11/2026 · chưa bàn giao");
  assert.equal(overview.expiryText(e("2026-11-20", -7)), "Hết hạn 19/11/2026 · chưa bàn giao");
  // Most urgent (fewest days) first, whatever order the server used.
  assert.deepEqual(overview.sortExpiries([e("a", 40), e("b", -2), e("c", 10)]).map((x) => x.endDateExclusive), ["b", "c", "a"]);
  const room = roomWith({ status: "OCCUPIED", contracts: [
    { contractId: "x", status: "LONG", endDateExclusive: "2027-06-01", daysRemaining: 200, target: contract },
    { contractId: "y", status: "WITHIN_30", endDateExclusive: "2026-12-10", daysRemaining: 13, target: contract },
  ] });
  assert.equal(roomLayerStatus(room, "contracts"), "WITHIN_30");
  assert.equal(roomLayerLabel(room, "contracts"), "Còn 13 ngày · hết 09/12/2026");
});

test("a payment layer missing its status fails parsing instead of rendering a neutral cell", () => {
  const broken = structuredClone(fixture);
  delete broken.rooms[0].payments.status;
  assert.throws(() => parseOverview(broken));
});

test("overview GET omits the month for server default and sends the selected month unchanged", async () => {
  assert.deepEqual(await overview.default.getOverview("branch"), fixture);
  assert.deepEqual(await overview.default.getOverview("branch", "2026-12"), fixture);
  assert.deepEqual(calls, [
    ["/api/v1/branches/branch/overview", { params: undefined }],
    ["/api/v1/branches/branch/overview", { params: { month: "2026-12" } }],
  ]);
});

test("month selection is strict and the calendar label/time use Vietnamese months and midnight", () => {
  for (const value of ["0001-01", "2026-12", "9999-12"]) assert.equal(isMonth(value), true);
  for (const value of [null, "", "0000-01", "2026-00", "2026-13", "2026-1", "2026-12-31", " 2026-12", "10000-01"]) {
    assert.equal(isMonth(value), false, String(value));
  }
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2027-01", -1), "2026-12");
  assert.equal(monthLabel("0001-01"), "Tháng 1/0001");
  assert.match(formatInstant(fixture.billingNow), /00:00.*01\/12\/2026/);
  assert.equal(formatInstant("invalid"), "");
});

test("confirmation countdown uses the clock on each item, keeping pending after zero", () => {
  assert.equal(confirmationCountdown(payment, fixture, 0), "Tự xác nhận sớm nhất sau 1 phút");
  assert.match(confirmationCountdown(payment, fixture, 60_000), /chờ cập nhật/);
  assert.match(confirmationCountdown({ ...payment, clock: "REAL" }, fixture, 60_000), /10 ngày 5 giờ/);
  assert.equal(confirmationCountdown({ ...payment, confirmationDueAt: null }, fixture, 0), null);
  assert.equal(roomLayerStatus(room, "payments"), "PENDING_CONFIRMATION");
});

test("room search uses code, current tenant and next tenant with Vietnamese accent folding", () => {
  for (const value of ["  a-101 ", "DANG", "ho anh"]) assert.equal(roomMatches("A-101", room, value), true);
  assert.equal(roomMatches("A-101", room, "A-102"), false);
});

test("targets reach the exact existing contract, monthly invoice, first rent and rental routes", () => {
  const otherTargets = [contract, request,
    { href: "/dashboard/landlord/contracts/c?tab=payment&section=monthly&invoice=inv-2" },
    { href: "/dashboard/landlord/contracts/c?tab=payment&section=monthly" },
    { href: "/dashboard/landlord/contracts/c?tab=payment" },
    { href: "/dashboard/properties/view?id=listing" },
  ];
  for (const target of otherTargets) assert.equal(targetHref(target), target.href);
  const url = new URL(targetHref(firstRent), "https://test.invalid");
  assert.equal(url.pathname, "/dashboard/landlord/contracts/c");
  assert.equal(url.searchParams.get("tab"), "payment");
  assert.equal(url.searchParams.get("section"), "monthly");
  assert.equal(safeInvoiceSelectionId(url.searchParams.get("invoice")), firstRent.id);
  assert.equal(targetHref(null), null);
  assert.equal(targetHref({ href: "https://test.invalid/dashboard/landlord/contracts/c" }), null);
});

test("Back from an invoice restores the branch map's selected floor, layer and month", (t) => {
  const entries = [new URL("https://test.invalid/dashboard/branches/branch?tab=map&other=keep")];
  const browser = { get location() { return entries.at(-1); }, history: {
    replaceState: (_state, _title, path) => { entries[entries.length - 1] = new URL(path, entries.at(-1)); },
    pushState: (_state, _title, path) => entries.push(new URL(path, entries.at(-1))),
    back: () => entries.pop(),
  } };
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { value: browser, configurable: true });
  t.after(() => {
    if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow);
    else delete globalThis.window;
  });

  const Editor = () => null;
  const Link = () => null;
  const floors = [{ id: "floor-1", key: "floor-1", label: "Tầng 1", rows: [] },
    { id: "floor-2", key: "floor-2", label: "Tầng 2", rows: [{ key: "row", label: "Dãy A",
      slots: [{ id: "r1", key: "cell", roomCode: "201" }] }] }];
  let stateIndex;
  const mocks = {
    react: {
      useState: (initial) => [stateIndex++ === 4
        ? { month: browser.location.searchParams.get("month") ?? "", data: fixture, error: "", at: 1 } : initial, () => {}],
      useCallback: (fn) => fn, useMemo: (fn) => fn(), useRef: (current) => ({ current }), useEffect: () => {}, useId: () => "test-id",
    },
    "next/navigation": { useSearchParams: () => browser.location.searchParams },
    "next/link": Link,
    "@/services/branch-assignment.service": {}, "@/services/branch-overview.service": overview,
    "./BranchLayoutEditor": Editor, "./RoomPanel": {},
    "./UnplacedTray": {}, "./LayoutBoard": {}, "./linkUi": {},
  };
  const { default: BranchMap } = loadTs("components/branch/BranchMap.tsx", mocks);
  const mapLayers = () => {
    stateIndex = 0;
    const editor = BranchMap({ branchId: "branch" }).props.children.find((child) => child?.type === Editor);
    return editor.props.links.overview({ floors, openRoom: () => {} });
  };
  const mapProps = () => mapLayers().props;
  assert.equal(mapProps().layer, "rooms");
  mapProps().onView({ floor: "floor-2" });
  mapProps().onView({ layer: "payments" });
  mapProps().onView({ month: "2026-12" });
  assert.equal(entries.length, 1);

  const layers = mapLayers();
  const cell = findCell(layers.type(layers.props), "cell");
  assert.equal(cell.type, Link);
  assert.match(cell.props.className, /bg-purple-50/);
  assert.equal(cell.props.href, firstRent.href);
  browser.history.pushState(null, "", cell.props.href);
  assert.equal(browser.location.searchParams.get("invoice"), firstRent.id);
  browser.history.back();
  const { floorId, layer, month } = mapProps();
  assert.deepEqual({ floorId, layer, month }, { floorId: "floor-2", layer: "payments", month: "2026-12" });
  assert.equal(browser.location.searchParams.get("tab"), "map");
  assert.equal(browser.location.searchParams.get("other"), "keep");
});

function findCell(node, key) {
  if (Array.isArray(node)) return node.map((child) => findCell(child, key)).find(Boolean);
  if (!node?.props) return undefined;
  return node.props["data-focus-key"] === key ? node : findCell(node.props.children, key);
}
