/* eslint-disable @typescript-eslint/no-require-imports -- Node test and isolated TS loader. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadTs } = require("./helpers/ts-loader.cjs");

const clocks = { billingNow: "2026-11-30T17:00:00Z", realNow: "2026-11-20T12:00:00Z" };
const work = {
  key: "PAYMENT_CONFIRM:p", type: "PAYMENT_CONFIRM", roomId: null, roomCode: null,
  contextLabel: "HD-1", periodIndex: null, dueAt: "2026-11-30T17:01:00Z",
  clock: "BILLING", priority: "URGENT",
  target: { kind: "PAYMENT", id: "p", href: "/dashboard/payments?paymentId=p" },
};
const detail = { ...clocks, branchId: "b", items: [work], page: 0, size: 20, totalElements: 1 };
const summary = { ...clocks, branches: [{ branchId: "b", count: 1 }, { branchId: "zero", count: 0 }] };
const calls = [];
const service = loadTs("./services/branch-overview.service.ts", {
  "@/lib/axios-client": { get: async (...args) => {
    calls.push(args);
    return { data: { code: 1000, result: args[0].endsWith("summary") ? summary : detail } };
  } },
});
const { parseAttention, parseAttentionSummary, orderByAttention, targetHref, workDeadline, workContext, workLabel } = service;

test("attention parser keeps nullable fields, validates work and supports new work types", () => {
  assert.deepEqual(parseAttention(detail), detail);
  const unknown = { ...work, type: "future", dueAt: null };
  assert.equal(parseAttention({ ...detail, items: [unknown] }).items[0].type, "future");
  assert.equal(workLabel(unknown.type)[1], "Việc cần xem");
  assert.equal(workContext({ roomCode: "101", contextLabel: "101", periodIndex: 0 }), "Phòng 101 · Chi phí tháng 1");
  for (const key of Object.keys(work)) {
    const item = { ...work };
    delete item[key];
    assert.throws(() => parseAttention({ ...detail, items: [item] }), key);
  }
  for (const item of [{ ...work, priority: "later" }, { ...work, dueAt: "invalid" }, { ...work, clock: "local" }]) {
    assert.throws(() => parseAttention({ ...detail, items: [item] }));
  }
  assert.throws(() => parseAttention({ ...detail, totalElements: -1 }));
  assert.throws(() => parseAttention({ ...detail, items: null }));
});

test("summary keeps zero and orders branches by the server, with unmatched branches last", () => {
  assert.deepEqual(parseAttentionSummary(summary), summary.branches);
  assert.throws(() => parseAttentionSummary({ ...summary, branches: [{ branchId: "b", count: 0.5 }] }));
  const original = ["new", "zero", "b", "other"].map(id => ({ id }));
  assert.deepEqual(orderByAttention(original, summary.branches).map(b => b.id), ["b", "zero", "new", "other"]);
  assert.deepEqual(orderByAttention(original, null).map(b => b.id), ["new", "zero", "b", "other"]);
});

test("a zero page size is rejected before rendering the pager", () => {
  assert.throws(() => parseAttention({ ...detail, size: 0 }));
});

test("P4 recovery steps keep the source rental link and their Vietnamese labels", () => {
  const target = { kind: "RENTAL_REQUEST", id: "rental", href: "/dashboard/rental-requests?requestId=rental" };
  const labels = {
    PAYMENT_REVIEW: "Đối soát khoản chuyển bị từ chối",
    CANCELLATION_DECISION: "Chờ quyết định hủy trước khi thuê",
    SIGNING_REOPEN: "Quá hạn ký, cần mở lại hạn",
  };
  const items = Object.keys(labels).map(type => ({ ...work, key: type + ":source", type, target }));
  for (const item of parseAttention({ ...detail, items }).items) {
    assert.equal(workLabel(item.type)[1], labels[item.type]);
    assert.equal(targetHref(item.target), target.href);
  }
});

test("service GETs use Gateway paths and pass pagination without an owner override", async () => {
  assert.deepEqual(await service.default.getAttention("b"), detail);
  assert.deepEqual(await service.default.getAttention("b", 2, 50), detail);
  assert.deepEqual(await service.default.getAttentionSummary(), summary.branches);
  assert.deepEqual(calls, [
    ["/api/v1/branches/b/attention", { params: { page: 0, size: 20 } }],
    ["/api/v1/branches/b/attention", { params: { page: 2, size: 50 } }],
    ["/api/v1/branches/attention-summary"],
  ]);
});

test("deadline respects each server clock and remains pending at the earliest auto-confirm time", () => {
  assert.match(workDeadline(work, clocks, 0), /1 phút/);
  assert.match(workDeadline(work, clocks, 60_000), /chờ cập nhật/);
  assert.match(workDeadline({ ...work, clock: "REAL" }, clocks, 0), /10 ngày/);
  assert.equal(workDeadline({ ...work, dueAt: null }, clocks, 0), null);
});

test("work hrefs reach existing actions and keep encoded IDs and tray hash", () => {
  const routes = [
    ["/dashboard/landlord/contracts/root?tab=payment&section=monthly&invoice=first-rent%3Ap", "invoice", "first-rent:p"],
    ["/dashboard/landlord/contracts/root?tab=payment", "tab", "payment"],
    ["/dashboard/landlord/contracts/root?tab=end&amendmentId=a%20%2F%201", "amendmentId", "a / 1"],
    ["/dashboard/landlord/contracts/root?tab=end&focus=early-exit", "focus", "early-exit"],
    ["/dashboard/contracts/annex?tab=sign", "tab", "sign"],
    ["/dashboard/payments?paymentId=p", "paymentId", "p"],
    ["/dashboard/rental-requests?requestId=r", "requestId", "r"],
    ["/dashboard/viewing-schedules?appointmentId=v", "appointmentId", "v"],
    ["/dashboard/properties/view?id=l", "id", "l"],
    ["/dashboard/properties/new?branchId=b&roomId=101", "roomId", "101"],
    ["/dashboard/branches/b?tab=map#unplaced", "tab", "map"],
  ];
  for (const [href, field, value] of routes) {
    const result = targetHref({ ...work.target, href });
    assert.equal(result, href);
    const url = new URL(result, "https://test.invalid");
    assert.equal(url.searchParams.get(field), value);
    if (value === "map") assert.equal(url.hash, "#unplaced");
  }
  for (const href of ["https://wrong.test/dashboard/x", "//wrong.test/dashboard/x", "/login"]) {
    assert.equal(targetHref({ ...work.target, href }), null);
  }
});

const component = () => null;

test("end tab keeps the old workflow and inline editor placement without deep-link params", () => {
  let params = new URLSearchParams();
  let editing = false;
  const Workflow = () => null;
  const Amendment = () => null;
  const Onboarding = () => null;
  const { default: EndTab, AmendmentSlot } = loadTs("components/contract/page/EndTab.tsx", {
    "next/navigation": { useSearchParams: () => params },
    "@/components/common/PolicyDialog": { PolicyNotice: component },
    "@/components/rental-request/RentalOnboardingPanel": Onboarding,
    "@/components/rental-request/RentalWorkflowPanel": Workflow,
    "@/components/complaint/ComplaintPanel": component,
    "@/components/contract/detail/ContractLifecyclePanel": component,
    "@/components/contract/detail/ContractAmendmentPanel": Amendment,
    "@/components/contract/detail/ContractAmendmentWorkspace": { useAmendmentWorkspace: () => ({ editing }) },
    "./ui": { SectionTitle: component },
  });
  const base = { contract: { id: "c", rentalRequestId: "r", status: "ACTIVE" }, actorId: "owner",
    perspective: "landlord", isLandlord: true, onUpdated: component, onSnapshot: component };
  const active = () => EndTab({ ...base, preActive: false });
  assert.equal(find(active(), Workflow).props.focusRequest, false);
  const oldSlot = find(active(), AmendmentSlot);
  assert.equal(oldSlot.props.focusId, undefined);
  assert.equal(AmendmentSlot(oldSlot.props).type, Amendment);
  assert.equal(AmendmentSlot({ ...oldSlot.props, where: "content" }), null);
  const beforeLease = EndTab({ ...base, preActive: true, contract: { ...base.contract, status: "DRAFT" } });
  assert.deepEqual(find(beforeLease, Onboarding).props.sections, ["end"]);
  assert.equal(find(beforeLease, Workflow), undefined);

  params = new URLSearchParams("tab=end&focus=early-exit&amendmentId=a%20%2F%201");
  assert.equal(find(active(), Workflow).props.focusRequest, true);
  const slot = find(active(), AmendmentSlot);
  assert.equal(AmendmentSlot(slot.props).props.focusId, "a / 1");
  editing = true;
  assert.equal(AmendmentSlot(slot.props), null);
  assert.equal(AmendmentSlot({ ...oldSlot.props, where: "content" }).type, Amendment);
});

test("amendment history only opens and focuses the matching card when linked", t => {
  const effects = [];
  const history = { open: false };
  const lookups = [];
  const target = { closest: () => history, scrollIntoView: () => lookups.push("scroll"), focus: () => lookups.push("focus") };
  const workspace = { contractId: "c", actorId: "owner", perspective: "landlord", data: {
    canPropose: true, proposals: [{ id: "old", status: "REJECTED", comparison: [], evidenceIds: [] }],
  } };
  const { default: AmendmentPanel } = loadTs("components/contract/detail/ContractAmendmentPanel.tsx", {
    react: { useState: initial => [initial, () => {}], useRef: current => ({ current }), useEffect: fn => effects.push(fn) },
    "next/link": component,
    "./ListingSyncControl": component,
    "./AmendmentEffectiveDatePicker": component,
    "./ContractAmendmentWorkspace": {
      useAmendmentWorkspace: () => workspace, activeAmendment: new Set(["REQUESTED"]),
      amendmentDate: String, amendmentTime: String,
    },
  });
  mockGlobal(t, "document", { getElementById: id => {
    lookups.push(id);
    return id === "amendment-old-card" ? target : null;
  } });
  const render = focusId => {
    const slot = AmendmentPanel({ contractId: "c", focusId });
    const contents = slot.type(slot.props);
    effects.splice(0).forEach(effect => effect());
    return contents;
  };
  assert.equal(find(render(undefined), "article").props.id, undefined);
  assert.deepEqual(lookups, []);
  assert.equal(history.open, false);
  assert.equal(find(render("old"), "article").props.id, "amendment-old-card");
  assert.deepEqual(lookups, ["amendment-old-card", "scroll", "focus"]);
  assert.equal(history.open, true);
  const missing = find(render("unknown"), "p", node => node.props.role === "status");
  assert.match(missing.props.children, /Không tìm thấy/);
});

test("unplaced tray stays idle with no hash and focuses its heading after loading", t => {
  const effects = [];
  const actions = [];
  const heading = { offsetParent: {}, scrollIntoView: () => actions.push("scroll"), focus: () => actions.push("focus") };
  const location = { hash: "" };
  mockGlobal(t, "window", { location });
  const { default: Tray } = loadTs("components/branch/UnplacedTray.tsx", {
    react: { useState: initial => [initial, () => {}], useRef: current => ({ current: current ?? heading }),
      useEffect: fn => effects.push(fn), useId: () => "tray" },
    "next/link": component,
    "./CandidatePicker": component,
    "./LayoutBoard": {},
    "./linkUi": { useLinkAction: () => ({}), Pager: component },
  });
  const render = unplaced => {
    const tray = Tray({ branchId: "b", unplaced, rooms: [], loading: !unplaced });
    effects.splice(0).forEach(effect => effect());
    return tray;
  };
  const empty = { items: [], totalElements: 0, page: 0, size: 20 };
  assert.equal(render(empty).props.id, "unplaced");
  assert.deepEqual(actions, []);
  location.hash = "#unplaced";
  render(null);
  assert.deepEqual(actions, []);
  render(empty);
  assert.deepEqual(actions, ["scroll", "focus"]);
});

function find(node, type, matches = () => true) {
  if (Array.isArray(node)) return node.map(child => find(child, type, matches)).find(Boolean);
  if (!node?.props) return undefined;
  return node.type === type && matches(node) ? node : find(node.props.children, type, matches);
}

function mockGlobal(t, name, value) {
  const original = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { value, configurable: true });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, name, original);
    else delete globalThis[name];
  });
}
