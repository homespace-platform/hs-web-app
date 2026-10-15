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

const lib = load("lib/ai-contract-cards.ts");
const { toChatMessage } = load("lib/ai-conversation.ts");
const C1 = "00000000-0000-0000-0000-000000000001";
const C2 = "00000000-0000-0000-0000-000000000002";
const card = (over = {}) => ({ contractId: C1, contractNumber: "HD-DEMO-001", property: "1 Đường Mẫu", askerRole: "TENANT",
  roleLabel: "Người thuê", status: "ACTIVE", statusLabel: "Đang có hiệu lực", leasePhase: "IN_LEASE",
  phaseLabel: "Đang trong thời hạn thuê", leaseStart: "2026-10-16", leaseEndExclusive: "2027-01-16",
  lastRentalDay: "2027-01-15", readAt: "2026-10-16T02:00:00Z", ...over });

test("links are built from verified id and asker role, never taken from data", () => {
  assert.equal(lib.contractHref(card()), `/dashboard/tenant/contracts/${C1}`);
  assert.equal(lib.contractHref(card({ askerRole: "LANDLORD" })), `/dashboard/landlord/contracts/${C1}`);
  assert.equal(lib.contractHref(card({ contractId: "../admin" })), null);
  assert.equal(lib.contractHref(card({ askerRole: "ADMIN" })), null);
  assert.equal(lib.contractHref({ ...card(), href: "https://evil.test" }), `/dashboard/tenant/contracts/${C1}`);
});

test("only well-formed, de-duplicated cards survive and at most five render", () => {
  const many = Array.from({ length: 8 }, (_, i) => card({ contractId: `00000000-0000-0000-0000-${String(i + 1).padStart(12, "0")}` }));
  assert.equal(lib.safeContractCards([...many, card(), null, "x", { contractId: "javascript:alert(1)" }]).length, 5);
  assert.deepEqual(lib.safeContractCards([card(), card()]).map((c) => c.contractId), [C1]);
  assert.deepEqual(lib.safeContractCards(undefined), []);
  assert.deepEqual(lib.safeContractCards([card({ contractNumber: "" }), card({ askerRole: "X" })]), []);
});

test("dates are shown dd/mm/yyyy and unknown values stay unknown", () => {
  assert.equal(lib.formatCardDate("2027-01-15"), "15/01/2027");
  assert.equal(lib.formatCardDate(null), null);
  assert.equal(lib.formatCardDate("garbage"), null);
  assert.equal(lib.formatReadAt("not a date"), null);
});

const Link = ({ children, prefetch, ...props }) => React.createElement("a", props, children);
const Cards = load("components/chat/AiContractCards.tsx", {
  "next/link": Link, "lucide-react": { FileText: () => null },
  "@/lib/ai-contract-cards": lib,
}).default;

test("card shows number, property, role, status, term and a role-correct new-tab link", () => {
  const html = renderToStaticMarkup(React.createElement(Cards, { cards: [card(), card({ contractId: C2, askerRole: "LANDLORD", roleLabel: "Chủ nhà", contractNumber: "HD-2" })] }));
  for (const text of ["HD-DEMO-001", "1 Đường Mẫu", "Bạn là người thuê", "Đang có hiệu lực", "16/10/2026", "15/01/2027", "ngày thuê cuối", "Xem hợp đồng"]) {
    assert.ok(html.includes(text), text);
  }
  assert.ok(html.includes(`href="/dashboard/tenant/contracts/${C1}"`));
  assert.ok(html.includes(`href="/dashboard/landlord/contracts/${C2}"`));
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
});

test("missing data is not rendered as zero or invented, and bad cards render nothing", () => {
  const html = renderToStaticMarkup(React.createElement(Cards, { cards: [card({ leaseStart: null, lastRentalDay: null, readAt: null, property: null })] }));
  for (const text of ["NaN", "undefined", "null", "Thời hạn thuê"]) assert.ok(!html.includes(text), text);
  assert.equal(renderToStaticMarkup(React.createElement(Cards, { cards: [{ contractId: "bad" }] })), "");
  assert.equal(renderToStaticMarkup(React.createElement(Cards, {})), "");
});

test("hostile text is escaped and never becomes a link", () => {
  const html = renderToStaticMarkup(React.createElement(Cards, { cards: [card({ property: '<img src=x onerror=alert(1)>', contractNumber: "<b>x</b>" })] }));
  assert.ok(!html.includes("<img src=x"));
  assert.ok(html.includes("&lt;img"));
});

test("contract states never read as listing states and sources stay separate", () => {
  assert.match(lib.aiStatusNote("NO_RESULTS", ["CORE_CONTRACT"]), /hợp đồng/);
  assert.match(lib.aiStatusNote("NO_RESULTS", []), /tin đăng/);
  assert.match(lib.aiStatusNote("TOOL_UNAVAILABLE", ["CORE_CONTRACT"]), /hợp đồng/);
  assert.match(lib.aiStatusNote("TOOL_UNAVAILABLE"), /tin đăng/);
  assert.match(lib.aiStatusNote("LOGIN_REQUIRED"), /đăng nhập/);
  assert.match(lib.aiStatusNote("NEEDS_CLARIFICATION"), /Chọn hợp đồng/);
  assert.match(lib.aiStatusNote("NOT_FOUND"), /Không tìm thấy hợp đồng/);
  assert.equal(lib.aiStatusNote("ANSWERED"), null);
  assert.match(lib.aiSourceNote(["CORE_CONTRACT", "RAG"]), /hướng dẫn chung/);
  assert.equal(lib.aiSourceNote([]), null);
});

test("old history and listing messages stay intact; cards map only for assistant messages", () => {
  const legacy = toChatMessage({ id: "1", role: "assistant", content: "x", createdAt: "2026-10-16T00:00:00Z", listingIds: [C1], listingPositions: { [C1]: 2 } });
  assert.deepEqual(legacy.listingIds, [C1]);
  assert.equal(legacy.contractCards, undefined);
  const withCards = toChatMessage({ id: "2", role: "assistant", content: "x", createdAt: "2026-10-16T00:00:00Z", contractCards: [card()], dataSources: ["CORE_CONTRACT"] });
  assert.equal(withCards.contractCards.length, 1);
  assert.deepEqual(withCards.dataSources, ["CORE_CONTRACT"]);
  const user = toChatMessage({ id: "3", role: "user", content: "x", createdAt: "2026-10-16T00:00:00Z", contractCards: [card()] });
  assert.equal(user.contractCards, undefined);
});
