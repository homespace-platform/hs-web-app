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
test("early extensions explain adding days to the current deadline rather than shortening it",()=>{
  const invoice={dueAt:"2026-12-08T16:59:59Z",originalDueAt:"2026-12-08T16:59:59Z",serverNow:"2026-12-04T03:00:00Z",
    paymentExtensions:[{...pending,days:1,respondBy:"2026-12-06T03:00:00Z"}],activeResolution:"EXTENSION_REQUEST"};
  for(const role of ["tenant","landlord"]) {
    const html=render(invoice,role);
    assert.match(html,/Đang xin gia hạn thêm 1 ngày/);assert.match(html,/Duyệt trước hạn: cộng số ngày vào hạn hiện tại/);
    assert.match(html,/Đã quá hạn: tính từ lúc chủ nhà đồng ý/);
    assert.doesNotMatch(html,/Đang xin thêm 1 ngày, tính từ lúc chủ nhà đồng ý/);
  }
});
test("new approval explains resuming fees after the deadline and preserving the invoice cap", () => {
  const html = render({ paymentExtensions: [{ ...pending, status: "APPROVED", newDueAt: base.dueAt, lateFeeResumesAfterDue: true }],
    lateFeeExempt: false, activeResolution: "PAYMENT_EXTENSION" }, "landlord");
  assert.match(html, /Không tăng phí trong thời gian gia hạn/);
  assert.match(html, /Quá hạn mới, phí tiếp tục tính theo hợp đồng/);
  assert.match(html, /trần tổng phí của hóa đơn không đặt lại/);
  assert.doesNotMatch(html, /miễn tăng phí cho hóa đơn này/);
  assert.doesNotMatch(html, />Dời hạn thanh toán</);
});
test("legacy waiver remains visible and does not claim that fees resume", () => {
  const html = render({ lateFeeExempt: true, paymentExtensions: [{ ...pending, status: "APPROVED", newDueAt: base.dueAt }] }, "landlord");
  assert.match(html, /Quyết định gia hạn cũ miễn tăng phí/);assert.match(html, /không tự truy thu/);
  assert.doesNotMatch(html, /Quá hạn mới, phí tiếp tục/);
});
test("exempt initial rent without any extension does not display a misleading extension panel", () => {
  assert.equal(render({ lateFeeExempt: true }, "tenant"), "");
});
test("third option is driven by backend eligibility; UI uses request mutex", () => {
  assert.match(render({ canResolveOverdue: true }, "landlord"), /Dời hạn thanh toán/);
  assert.match(source, /mutex\.current = true/);
  assert.match(source, /Number\.isInteger\(days\)/);
  assert.doesNotMatch(source, /Date\.now\(/);
});
