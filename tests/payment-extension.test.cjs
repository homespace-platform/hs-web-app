const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const panelPath = "../components/contract/detail/PaymentExtensionPanel.tsx";
const source = fs.readFileSync(path.join(__dirname, panelPath), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
} }).outputText;
const mod = { exports: {} };
const imports = name => name === "@/services/monthly-invoice.service" ? { monthlyInvoiceService: {} }
  : name === "@/utils/apiError" ? { getApiErrorMessage: () => "test error" } : require(name);
vm.runInThisContext(`(function(require,module,exports){${compiled}\n})`)(imports, mod, mod.exports);
const Panel = mod.exports.default;
const base = { id: "bill", lateFeeAmount: 300000, originalDueAt: "2027-01-16T16:59:59Z", dueAt: "2027-01-27T03:00:00Z",
  canRequestExtension: false, canResolveOverdue: false, paymentExtensions: [], activeResolution: "NONE" };
const render = (invoice, role) => renderToStaticMarkup(React.createElement(Panel, { invoice: { ...base, ...invoice },
  isTenant: role === "tenant", isLandlord: role === "landlord", refresh: async () => {} }));
const pending = { id: "request", status: "PENDING", days: 7, note: "Xin thêm thời gian trả tiền", requestedAt: "2027-01-19T03:00:00Z",
  respondBy: "2027-01-21T03:00:00Z", frozenLateFee: 300000 };

test("tenant can request only when the server grants permission, range is 1 to 30", () => {
  const html = render({ canRequestExtension: true }, "tenant");
  assert.match(html, /Gửi yêu cầu gia hạn/); assert.match(html, /min="1" max="30"/);
  assert.equal(render({}, "tenant"), "");
  assert.doesNotMatch(render({ canRequestExtension: true }, "landlord"), /Gửi yêu cầu gia hạn/);
});
test("pending request shows frozen fees and deadline, only landlord can approve", () => {
  const invoice = { paymentExtensions: [pending], activeResolution: "EXTENSION_REQUEST" };
  assert.match(render(invoice, "tenant"), /Phản hồi trước/);
  assert.doesNotMatch(render(invoice, "tenant"), /Đồng ý thêm/);
  assert.match(render(invoice, "landlord"), /Đồng ý thêm 7 ngày/);
  assert.doesNotMatch(render({ ...invoice, workflowState: "UNDER_REVIEW" }, "landlord"), /Đồng ý thêm/);
});
test("approved waiver is explicit even after late again, no overlapping direct option", () => {
  const html = render({ lateFeeExempt: true, activeResolution: "PAYMENT_EXTENSION" }, "landlord");
  assert.match(html, /kể cả trễ hạn mới/);
  assert.doesNotMatch(html, />Dời hạn thanh toán</);
});
test("third option is driven by backend eligibility; UI uses request mutex", () => {
  assert.match(render({ canResolveOverdue: true }, "landlord"), /Dời hạn thanh toán/);
  assert.match(source, /mutex\.current = true/);
  assert.match(source, /Number\.isInteger\(days\)/);
  assert.doesNotMatch(source, /Date\.now\(/);
});
