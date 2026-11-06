const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const ts = require("typescript"), React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
function compile(file, dependencies = {}) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(read(file), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, { module, exports: module.exports, require: name => dependencies[name] ?? require(name), console });
  return module.exports;
}
const presentation = compile("lib/payment-transfer-presentation.ts").paymentTransferPresentation;
const line = (type, amount, displayName) => ({ id: type, type, amount, displayName });
const refund = {
  id: "refund", rentalRequestId: "rental", payerId: "owner", payeeId: "tenant", type: "INITIAL_PAYMENT_REFUND",
  direction: "LANDLORD_TO_TENANT", totalAmount: 1000000, transferReference: "HSREFUND", status: "AWAITING_TRANSFER",
  lineItems: [], evidences: [], payeeBankAccountSnapshot: { bankName: "Ngân hàng mẫu", bankCode: "MB", accountNumber: "222222", accountHolderName: "NGUOI THUE" },
};
function fixture(options = {}) {
  const source = read("components/rental-request/RentalPaymentModal.tsx");
  const ast = ts.createSourceFile("modal.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), names = [];
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isArrayBindingPattern(node.name) && node.initializer && ts.isCallExpression(node.initializer)
      && node.initializer.expression.getText(ast) === "useState") names.push(node.name.elements[0].getText(ast));
    ts.forEachChild(node, visit);
  }
  visit(ast);
  const payment = { ...refund, ...options.payment };
  const state = { payment, loading: false, qrLoading: false, showReportForm: Boolean(options.report),
    proofSource: "MOBILE_QR", mobileStatus: "UPLOADED", mobileSessionId: "proof-session", ...options.state };
  let index = 0; const calls = [], updates = [];
  const hooks = { ...React, useState: initial => { const name = names[index++]; return [Object.hasOwn(state, name) ? state[name] : initial, () => {}]; },
    useRef: initial => ({ current: initial }), useEffect() {} };
  const Modal = compile("components/rental-request/RentalPaymentModal.tsx", {
    react: hooks,
    "@/features/auth/useAuth": { useAuth: () => ({ profile: options.actor === null ? null : { id: options.actor ?? "owner" } }) },
    "@/lib/payment-transfer-presentation": { paymentTransferPresentation: presentation },
    "@/services/payment-request.service": { __esModule: true, default: { reportTransfer: async (...args) => { calls.push(args); return { ...payment, status: "TRANSFER_REPORTED" }; } } },
    "@/services/storage.service": { __esModule: true, default: {} },
    "@/utils/apiError": { getApiErrorMessage: error => error.message },
    "@/components/payment/PaymentDisputePanel": { __esModule: true, default: () => null },
    "@/components/complaint/ComplaintPanel": { __esModule: true, default: () => null },
    sonner: { toast: { success() {}, error() {} } }, qrcode: { __esModule: true, default: {} },
  }).default;
  const tree = Modal({ request: options.request ?? { id: "rental" }, paymentId: payment.id, isOpen: true, onClose() {}, onPaymentSuccess: value => updates.push(value) });
  assert.equal(index, names.length);
  return { payment, tree, calls, updates, html: renderToStaticMarkup(tree) };
}
function find(node, predicate) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) return node.map(child => find(child, predicate)).find(Boolean);
  return predicate(node) ? node : find(node.props?.children, predicate);
}

test("existing refund without allocation shows its actual one-million total instead of two zero rent/deposit rows", () => {
  const f = fixture();
  assert.match(f.html, /Chi tiết khoản hoàn/); assert.match(f.html, /Hoàn khoản thanh toán đã nhận/);
  assert.match(f.html, /1\.000\.000/); assert.match(f.html, /tài khoản người thuê/);
  assert.doesNotMatch(f.html, /Chi tiết tiền thuê tháng đầu \/ cọc|Tiền thuê kỳ đầu|Tiền đặt cọc|Chuyển 100% trực tiếp cho chủ nhà/);
  const p = presentation(f.payment); assert.equal(p.rows.length, 1); assert.equal(p.rows[0].amount, p.total);
});
test("current listing or rental amounts cannot override the historical refund payment", () => {
  const f = fixture({ request: { id: "rental", monthlyRentPrice: 99000000, effectiveMonthlyRent: 99000000, depositAmount: 88000000 } });
  assert.doesNotMatch(f.html, /99\.000\.000|88\.000\.000/); assert.match(f.html, /1\.000\.000/);
});
test("new combined refund shows rent and deposit allocation with the exact same total", () => {
  const f = fixture({ payment: { totalAmount: 3000000, lineItems: [line("RENT_REFUND", 1000000, "Hoàn tiền thuê kỳ đầu"), line("DEPOSIT_REFUND", 2000000, "Hoàn tiền đặt cọc")] } });
  assert.match(f.html, /Hoàn tiền thuê kỳ đầu/); assert.match(f.html, /Hoàn tiền đặt cọc/);
  assert.match(f.html, /1\.000\.000/); assert.match(f.html, /2\.000\.000/); assert.match(f.html, /3\.000\.000/);
  assert.equal(presentation(f.payment).rows.reduce((sum, row) => sum + row.amount, 0), 3000000);
});
test("rent-only refund does not invent a deposit or present a zero-deposit refund", () => {
  const f = fixture({ payment: { totalAmount: 250000, lineItems: [line("RENT_REFUND", 250000, "Hoàn tiền thuê"), line("DEPOSIT_REFUND", 0, "Hoàn tiền đặt cọc")] } });
  assert.match(f.html, /250\.000/); assert.doesNotMatch(f.html, /Hoàn tiền đặt cọc/);
});
test("inconsistent, negative or missing detail cannot be presented as a valid allocation", () => {
  for (const items of [[], [line("RENT_REFUND", 0, "Hoàn tiền thuê")], [line("RENT_REFUND", 500000, "Hoàn tiền thuê")], [line("RENT_REFUND", -100, "Hoàn tiền thuê")]]) {
    const p = presentation({ ...refund, lineItems: items });
    assert.equal(p.detailed, false); assert.equal(p.rows.length, 1); assert.equal(p.rows[0].amount, 1000000);
  }
});
test("normal initial and deposit payments retain their incoming amounts and recipient", () => {
  for (const type of ["INITIAL", "RESERVATION_DEPOSIT"]) {
    const f = fixture({ actor: "tenant", payment: { payerId: "tenant", payeeId: "owner", type, direction: "TENANT_TO_LANDLORD",
      lineItems: [line(type === "INITIAL" ? "RENT" : "DEPOSIT", 1000000, type === "INITIAL" ? "Tiền thuê kỳ đầu" : "Tiền cọc giữ chỗ")] } });
    assert.match(f.html, /tài khoản chủ nhà/); assert.match(f.html, /1\.000\.000/); assert.match(f.html, /Tôi đã chuyển khoản/);
    assert.doesNotMatch(f.html, /Chi tiết khoản hoàn|Chủ nhà hoàn trực tiếp/);
  }
});
test("only the actual payer can report a refund transfer", () => {
  assert.match(fixture().html, /Tôi đã chuyển khoản/);
  for (const actor of ["tenant", "stranger", null]) assert.doesNotMatch(fixture({ actor }).html, /Tôi đã chuyển khoản|Khai báo chứng từ chuyển khoản/);
});
test("reported and confirmed refund states refer to tenant receipt instead of landlord receipt", () => {
  const reported = fixture({ payment: { status: "TRANSFER_REPORTED" } });
  assert.match(reported.html, /chờ người thuê xác nhận/); assert.doesNotMatch(reported.html, /chủ nhà xác nhận/);
  const confirmed = fixture({ payment: { status: "CONFIRMED" } });
  assert.match(confirmed.html, /Người thuê đã xác nhận nhận đủ tiền hoàn/); assert.doesNotMatch(confirmed.html, /Chủ nhà đã xác nhận nhận đủ tiền/);
});
test("report submits the payment amount and exact refund ID without reading the rental quote", async () => {
  const f = fixture({ report: true });
  const form = find(f.tree, node => node.type === "form"); assert.ok(form);
  await form.props.onSubmit({ preventDefault() {} });
  assert.deepEqual(JSON.parse(JSON.stringify(f.calls)), [["refund", { expectedAmount: 1000000, evidenceUploadSessionId: "proof-session" }]]);
  assert.equal(f.updates.length, 1);
});
