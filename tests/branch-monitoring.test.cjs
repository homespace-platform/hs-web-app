/* eslint-disable @typescript-eslint/no-require-imports -- Node test and isolated TS loader. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadTs } = require("./helpers/ts-loader.cjs");

const overview = loadTs("services/branch-overview.service.ts");
const { layerReady, parseOverview, roomLayerStatus } = overview;
const Link = () => null;
const { default: Layers } = loadTs("components/branch/BranchOverviewLayers.tsx", {
  "next/link": Link,
  "@/services/branch-overview.service": overview,
  react: { useState: (value) => [value, () => {}], useRef: (current) => ({ current }),
    useEffect: () => {}, useId: () => "fixture-id" },
});
const contractPath = "/dashboard/landlord/contracts/c";
const meter = { contractId: "c", periodIndex: 0, status: "UPCOMING", meterDate: "2026-12-04",
  deadlineAt: "2026-12-04T17:00:00Z",
  target: { kind: "CONTRACT", id: "c", href: contractPath + "?tab=payment&section=monthly" } };
const expiry = { contractId: "c", status: "WITHIN_60", endDateExclusive: "2027-01-05", daysRemaining: 35,
  target: { kind: "CONTRACT", id: "c", href: contractPath + "?tab=end" } };
const oldRoom = { roomId: "r", status: "OCCUPIED", tenantName: null, target: null, nextStay: null,
  payments: { status: "NONE", count: 0, items: [] } };
const fixture = { branchId: "b", month: "2026-12", billingNow: "2026-11-30T17:00:00Z",
  realNow: "2026-11-27T01:00:00Z", unplacedPayments: [] };
const withRoom = (room) => parseOverview({ ...fixture, rooms: [room] });
const floors = [{ id: "floor", key: "floor", label: "Tầng 1", rows: [{
  key: "row", label: "A", slots: [{ id: "r", key: "cell", roomCode: "101" }],
}] }];

function findCell(node) {
  if (Array.isArray(node)) return node.map(findCell).find(Boolean);
  if (node?.props?.["data-focus-key"] === "cell") return node;
  return node?.props ? findCell(node.props.children) : undefined;
}

function renderCell(room, layer) {
  return findCell(Layers({ floors, overview: withRoom(room), month: "", fetchedAt: 0, error: "", layer,
    floorId: "floor", onView: () => {}, onRefresh: () => {} }));
}

test("meter cell shows the server's state and goes to the monthly tab or the exact invoice", () => {
  const room = { ...oldRoom, meters: [meter], contracts: [] };
  const upcoming = renderCell(room, "meters");
  assert.equal(upcoming.type, Link);
  assert.equal(upcoming.props.href, meter.target.href);
  assert.match(upcoming.props["aria-label"], /Sắp đến.*Ngày ghi 04\/12\/2026.*Hạn ghi 00:00.*05\/12\/2026/);

  const invoice = { ...meter, status: "TODAY", target: { kind: "INVOICE", id: "inv-2",
    href: meter.target.href + "&invoice=inv-2" } };
  assert.match(renderCell({ ...room, meters: [invoice] }, "meters").props["aria-label"], /Cần ghi hôm nay/);
  const recorded = renderCell({ ...room, meters: [{ ...invoice, status: "RECORDED" }] }, "meters");
  assert.equal(recorded.props.href, invoice.target.href);
  assert.match(recorded.props["aria-label"], /Đã ghi/);
  assert.doesNotMatch(recorded.props["aria-label"], /Hạn ghi/);
});

test("contract cell shows days and the real last day, most urgent lease first, with a count", () => {
  const room = { ...oldRoom, meters: [], contracts: [expiry] };
  const sixty = renderCell(room, "contracts");
  assert.equal(sixty.props.href, expiry.target.href);
  assert.match(sixty.props["aria-label"], /Còn 35 ngày · hết 04\/01\/2027/);
  assert.equal(roomLayerStatus({ ...room, contracts: [] }, "contracts"), "LONG");
  assert.match(JSON.stringify(renderCell({ ...room, contracts: [] }, "contracts").props.children), /Còn hạn trên 60 ngày/);
  const late = { ...expiry, contractId: "d", status: "WITHIN_30", daysRemaining: -2, endDateExclusive: "2026-11-25" };
  const many = renderCell({ ...room, contracts: [expiry, late] }, "contracts");
  assert.match(many.props["aria-label"], /Hết hạn 24\/11\/2026 · chưa bàn giao.*\+1 hợp đồng khác/);
  assert.doesNotMatch(many.props["aria-label"], /Còn 35 ngày/);
  const text = JSON.stringify(many.props.children);
  assert.doesNotMatch(text, /line-clamp/);
});

test("a pre-P5 or malformed layer leaves the other layers readable", () => {
  assert.equal(layerReady(withRoom(oldRoom), "meters"), false);
  assert.equal(layerReady(withRoom(oldRoom), "payments"), true);
  const partial = withRoom({ ...oldRoom, meters: [{ ...meter, deadlineAt: null }], contracts: [expiry] });
  assert.equal(layerReady(partial, "meters"), false);
  assert.equal(layerReady(partial, "contracts"), true);
  assert.equal(layerReady(withRoom({ ...oldRoom, meters: [], contracts: [] }), "meters"), true);
});
