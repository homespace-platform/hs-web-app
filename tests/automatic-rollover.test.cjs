const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const source = fs.readFileSync(path.join(__dirname, "../components/contract/detail/OverdueActionsPanel.tsx"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
} }).outputText;
const mod = { exports: {} };
const imports = name => name === "@/services/monthly-invoice.service" ? { monthlyInvoiceService: {} }
  : name === "@/utils/apiError" ? { getApiErrorMessage: () => "test error" } : require(name);
vm.runInThisContext(`(function(require,module,exports){${compiled}\n})`)(imports, mod, mod.exports);
const Panel = mod.exports.default;
const base = { id: "bill", canResolveOverdue: false, canDeferToNextPeriod: true,
  overdueActions: [], totalAmount: 2000000 };
const render = (invoice, role = "landlord") => renderToStaticMarkup(React.createElement(Panel, {
  invoice: { ...base, ...invoice }, contractActive: true, isLandlord: role === "landlord",
  isTenant: role === "tenant", refresh: async () => {},
}));

test("automatic rollover history identifies the system, not a landlord decision, and offers no overlapping choice", () => {
  const html = render({ deferredAt: "2026-11-26T17:00:00Z", overdueActions: [{
    id: "auto", type: "AUTOMATIC_ROLLOVER", createdBy: "SYSTEM", createdAt: "2026-11-26T17:00:00Z",
    note: "Đã chốt công nợ sau 10 ngày quá hạn.",
  }] });
  assert.match(html, /Hệ thống tự cộng dồn công nợ sang kỳ sau/);
  assert.match(html, /Hệ thống ghi nhận lúc/);
  assert.doesNotMatch(html, /Chủ nhà ghi nhận lúc/);
  assert.doesNotMatch(html, />Cộng dồn sang kỳ sau<|>Gửi đề nghị chấm dứt</);
});
test("overdue choice explains the ten day fallback and final bill cannot offer rollover", () => {
  const html = render({ canResolveOverdue: true });
  assert.match(html, /Phạt tối đa 10 ngày/);
  assert.match(html, /chờ duyệt gia hạn, đối soát/);
  assert.match(html, />Cộng dồn sang kỳ sau</);
  const final = render({ canResolveOverdue: true, canDeferToNextPeriod: false });
  assert.doesNotMatch(final, />Cộng dồn sang kỳ sau</);
  assert.match(final, /Không còn kỳ thuê kế tiếp chưa phát hành/);
});
