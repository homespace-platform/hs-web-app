const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const lifecycleSource = fs.readFileSync(path.join(__dirname, "../components/contract/detail/ContractLifecyclePanel.tsx"), "utf8");
const paymentSource = fs.readFileSync(path.join(__dirname, "../components/contract/detail/SettlementPaymentPanel.tsx"), "utf8");
let fixture = null, stateIndex = 0;
const mockReact = { ...React, useState(initial) {
  const value = stateIndex++ === 0 && fixture ? fixture : initial;
  return React.useState(value);
} };
function load(source, lifecycle, namespace = false) {
  const compiled = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const mod = { exports: {} };
  const imports = name => name === "react" ? (lifecycle ? mockReact : React)
    : name === "next/link" ? { default: ({ children, ...props }) => React.createElement("a", props, children) }
    : name === "next/image" ? { default: ({ unoptimized, ...props }) => React.createElement("img", props) }
    : name === "./SettlementPaymentPanel" ? { default: () => null }
    : name === "./MeterReading" ? MeterComponents
    : name === "@/lib/invoice-status" ? load(fs.readFileSync(path.join(__dirname, "../lib/invoice-status.ts"), "utf8"), false, true)
    : name.startsWith("@/services/") ? { contractLifecycleService: {}, default: {} }
    : name === "@/utils/apiError" ? { getApiErrorMessage: () => "test error" }
    : name === "@/lib/contract-routes" ? { contractDetailPath: (role, id) => `/dashboard/${role}/contracts/${id}`, invoiceDetailPath: id => `/dashboard/invoices/${id}` }
    : require(name);
  vm.runInThisContext(`(function(require,module,exports){${compiled}\n})`)(imports, mod, mod.exports);
  return namespace ? mod.exports : mod.exports.default;
}
const MeterComponents = load(fs.readFileSync(path.join(__dirname, "../components/contract/detail/MeterReading.tsx"), "utf8"), false, true);
const Lifecycle = load(lifecycleSource, true), Payment = load(paymentSource, false);
const signingSource = fs.readFileSync(path.join(__dirname, "../components/contract/detail/SmartCaSignaturePanel.tsx"), "utf8");
const Signing = load(signingSource, false);
const base = { endExclusive: "2027-01-12", canRequestRenewal: false, canProposeClosure: false, heldDeposit: 20000000,
  billing: { allPaid: true, canIssueSupplement: false, bills: [] },
  renewals: [], renewalOpensAt: "2026-12-12T17:00:00Z", renewalSignBy: "2027-01-10T17:00:00Z" };
function renderLifecycle(data, isLandlord, mode = "all") {
  fixture = { ...base, ...data }; stateIndex = 0;
  return renderToStaticMarkup(React.createElement(Lifecycle, { contractId: "root", isLandlord, mode }));
}
function renderPayment(status, isLandlord, direction = "LANDLORD_TO_TENANT") {
  return renderToStaticMarkup(React.createElement(Payment, { isLandlord, refresh: async () => {}, payment: {
    id: "refund", totalAmount: 20000000, status, direction, evidences: [], qrImageUrl: "https://vietqr.test/refund",
    payeeBankAccountSnapshot: { bankName: "VCB", accountNumber: "1234", accountHolderName: "TENANT" },
  } }));
}
test("renewal action and signing links respect party and server state", () => {
  assert.match(renderLifecycle({ canRequestRenewal: true }, false), /Gửi yêu cầu gia hạn/);
  const r = { id: "renewal", months: 3, status: "REQUESTED", note: "Tiếp tục thuê", startsOn: "2027-01-12", endExclusive: "2027-04-12" };
  assert.match(renderLifecycle({ renewals: [r] }, true), /Duyệt &amp; tạo văn bản/);
  assert.doesNotMatch(renderLifecycle({ renewals: [r] }, false), /Duyệt &amp; tạo văn bản/);
  assert.doesNotMatch(renderLifecycle({ renewals: [{ ...r, status: "APPROVED", agreementContractId: "child", agreementStatus: "DRAFT" }] }, false), /Mở văn bản gia hạn/);
  assert.match(renderLifecycle({ renewals: [{ ...r, status: "APPROVED", agreementContractId: "child", agreementStatus: "TENANT_SIGNATURE_PENDING" }] }, false), /target="_blank"/);
});

test("separate payment module preserves settlement consent and hides contract renewal actions", () => {
  const data = { canRequestRenewal: true, closure: { status: "PROPOSED", proposalVersion: 1, refundAmount: 20000000 },
    renewals: [{ id: "renewal", months: 3, status: "APPROVED", agreementContractId: "child", agreementStatus: "TENANT_SIGNATURE_PENDING" }] };
  const settlement = renderLifecycle(data, false, "settlement");
  assert.match(settlement, /Đồng ý quyết toán/);assert.doesNotMatch(settlement, /Gửi yêu cầu gia hạn|Mở văn bản gia hạn/);
  const renewal = renderLifecycle(data, false, "renewal");
  assert.match(renewal, /Gửi yêu cầu gia hạn/);assert.doesNotMatch(renewal, /Đồng ý quyết toán|Bàn giao &amp; tiền cọc/);
});

test("renewal disabled before server opening date, enabled for tenant only, cutoff explained", () => {
  assert.match(renderLifecycle({ serverNow: "2027-09-12T16:59:59Z", renewalOpensAt: "2027-09-12T17:00:00Z" }, false), /Mở yêu cầu từ/);
  assert.match(renderLifecycle({ serverNow: "2027-09-12T17:00:00Z", canRequestRenewal: true }, false), /Gửi yêu cầu gia hạn/);
  assert.doesNotMatch(renderLifecycle({ canRequestRenewal: true }, true), /Gửi yêu cầu gia hạn/);
  assert.match(renderLifecycle({ serverNow: "2027-01-11T17:00:00Z" }, false), /Đã hết thời gian yêu cầu\/ký gia hạn/);
});
test("only tenant consents to a versioned proposal; consent is not receipt", () => {
  const closure = { status: "PROPOSED", proposalVersion: 2, refundAmount: 20000000, balanceAmount: 0, note: "Không khấu trừ" };
  assert.match(renderLifecycle({ closure }, false), /Đồng ý quyết toán/);
  assert.match(renderLifecycle({ closure }, false), /Đây chưa phải xác nhận đã nhận tiền hoàn/);
  assert.doesNotMatch(renderLifecycle({ closure }, true), /Đồng ý quyết toán/);
  assert.match(lifecycleSource, /consent !== proposalKey/);
  assert.match(lifecycleSource, /data\?\.closure\?\.proposalVersion/);
  assert.match(lifecycleSource, /mutex\.current = true/);
});
test("refund QR belongs to landlord while actual receipt belongs to tenant", () => {
  assert.match(renderPayment("AWAITING_TRANSFER", true), /Tôi đã chuyển khoản/);
  assert.doesNotMatch(renderPayment("AWAITING_TRANSFER", false), /Tôi đã chuyển khoản/);
  assert.match(renderPayment("TRANSFER_REPORTED", false), /Xác nhận đã nhận tiền/);
  assert.doesNotMatch(renderPayment("TRANSFER_REPORTED", true), /Xác nhận đã nhận tiền/);
});
test("balance settlement reverses roles and overdue obligation stays payable", () => {
  assert.match(renderPayment("OVERDUE", false, "TENANT_TO_LANDLORD"), /Tôi đã chuyển khoản/);
  assert.match(renderPayment("TRANSFER_REPORTED", true, "TENANT_TO_LANDLORD"), /Xác nhận đã nhận tiền/);
  assert.doesNotMatch(renderPayment("CONFIRMED", true), /Tôi đã chuyển khoản/);
  assert.match(paymentSource, /expectedAmount: payment.totalAmount/);
  assert.match(paymentSource, /window.confirm/);
});
test("unpaid final bills show payment step and hide deposit proposal; only owner can issue supplement", () => {
  const closure = { status: "WAITING_HANDOVER", proposalVersion: 0 };
  const billing = { allPaid: false, canIssueSupplement: true, bills: [{ id: "final", periodIndex: 2, status: "UNPAID", totalAmount: 255000, paymentStatus: "TRANSFER_REPORTED" }] };
  const html = renderLifecycle({ closure, billing }, true);
  assert.match(html, /Bước 1 · Hoàn tất hóa đơn kỳ cuối/);
  assert.match(html, /Đã thanh toán · Chờ chủ nhà xác nhận/);
  assert.match(html, /Bước quyết toán\/hoàn cọc đang khóa/);
  assert.doesNotMatch(html, /Gửi đề xuất quyết toán/);
  assert.match(html, /Phát hành hóa đơn bổ sung kỳ cuối/);
  assert.doesNotMatch(renderLifecycle({ closure, billing: { ...billing, canIssueSupplement: false } }, false), /Phát hành hóa đơn bổ sung kỳ cuối/);
});
test("deposit proposal contains no utility input or deduction, preserves explicit billing-first gate", () => {
  const html = renderLifecycle({ closure: { status: "WAITING_HANDOVER", proposalVersion: 0 }, canProposeClosure: true }, true);
  assert.match(html, /Bước 2 · Lập đề xuất quyết toán cọc/);
  assert.doesNotMatch(html, /Điện bàn giao cuối|Nước bàn giao cuối/);
  assert.match(lifecycleSource, /!data.billing.allPaid/);
  assert.match(lifecycleSource, /crypto.randomUUID/);
  assert.match(lifecycleSource, /api.propose\(contractId, \{ otherDeduction/);
});

test("paid final bills collapse and supplemental invoice remains a closed optional exception", () => {
  const html = renderLifecycle({ closure: { status: "WAITING_HANDOVER", proposalVersion: 0 }, canProposeClosure: true,
    billing: { allPaid: true, canIssueSupplement: true, bills: [] } }, true);
  assert.match(html, /Đã hoàn tất ✓ — xem chi tiết/);
  assert.match(html, /Ngoại lệ · Bổ sung chi phí chưa thu \(không bắt buộc\)/);
  assert.doesNotMatch(html, /<details open/);
  assert.match(html, /Không có khoản khấu trừ: đề xuất hoàn nguyên cọc/);
  assert.match(html, /Thêm khoản khấu trừ/);
  assert.match(html, /Hoàn cho người thuê dự kiến/);
  assert.match(lifecycleSource, /expectedProposalVersion:/);
});

test("tenant sees itemized proposal and reasoned objection without forced acceptance", () => {
  const closure = { status: "PROPOSED", proposalVersion: 1, refundAmount: 19900000,
    deductions: [{ description: "Vỡ kính cửa", amount: 100000, evidenceIds: ["private-photo"] }] };
  const html = renderLifecycle({ closure }, false);
  assert.match(html, /Vỡ kính cửa/); assert.match(html, /100.000 đ/);
  assert.match(html, /Xem minh chứng 1/); assert.doesNotMatch(html, /href="private-photo"/);
  assert.match(html, /Lý do khiếu nại quyết toán/); assert.match(html, /Minh chứng khiếu nại/);
  assert.match(html, /không coi im lặng là đồng ý/);
  assert.doesNotMatch(renderLifecycle({ closure }, true), /Lý do khiếu nại quyết toán/);
});

test("dispute reason history and overdue attention are visible without payment assumption", () => {
  const closure = { status: "DISPUTED", proposalVersion: 1, respondBy: "2027-01-16T03:00:00Z", responseOverdueAt: "2027-01-16T03:00:00Z",
    history: [{ type: "DISPUTED", proposalVersion: 1, at: "2027-01-14T03:00:00Z", note: "Kính đã vỡ trước bàn giao", evidenceIds: ["proof"], deductions: [] }] };
  const html = renderLifecycle({ closure }, true);
  assert.match(html, /Chủ nhà cần phản hồi đối soát/); assert.match(html, /Đã quá hạn phản hồi/);
  assert.match(html, /Kính đã vỡ trước bàn giao/); assert.match(html, /Lịch sử quyết toán/);
  assert.match(html, /chưa tạo QR hoàn cọc/); assert.doesNotMatch(html, /Đồng ý quyết toán/);
  assert.match(renderLifecycle({ serverNow: "2027-01-31T03:00:00Z", closure: { status: "REFUND_PENDING", proposalVersion: 1,
    refundDueAt: "2027-01-29T03:00:00Z" } }, false), /Đã quá hạn chuyển tiền quyết toán/);
});
test("expired and closed contract no longer displays misleading signature wait", () => {
  for (const status of ["EXPIRED", "CLOSED"]) {
    const html = renderToStaticMarkup(React.createElement(Signing, { contract: { id: "root", status },
      state: { smartCaEnabled: true, activeRequest: null }, isLandlord: true, isTenant: false, hasReadyPdf: true, onUpdated: async () => {} }));
    assert.doesNotMatch(html, /đang chờ bên còn lại hoàn tất bước ký số/);
    assert.match(html, status === "EXPIRED" ? /hóa đơn, bàn giao và hoàn cọc/ : /hoàn tất quyết toán/);
  }
});
test("supplement form shows latest billed meter values even when bill order is unsorted", () => {
  const billing = { allPaid: true, canIssueSupplement: true, bills: [
    { id: "earlier", periodIndex: 1, status: "PAID", totalAmount: 0, electricityEnd: 1400, waterEnd: 150 },
    { id: "supplement", periodIndex: 3, finalCostSupplement: true, status: "PAID", totalAmount: 0, electricityEnd: 1600, waterEnd: 220 },
    { id: "final", periodIndex: 2, status: "PAID", totalAmount: 0, electricityEnd: 1500, waterEnd: 200 },
  ] };
  const html = renderLifecycle({ billing, closure: { status: "WAITING_HANDOVER", proposalVersion: 0 } }, true);
  assert.match(html, /Chỉ số điện đã tính trên hóa đơn \(kWh\)/);
  assert.match(html, /Chỉ số nước đã tính trên hóa đơn \(m³\)/);
  assert.match(html, /min="1600"/); assert.match(html, /min="220"/);
  assert.match(html, /1\.600<\/p>/); assert.match(html, />220<\/p>/);
  assert.doesNotMatch(html, /min="1400"|min="1500"/);
  assert.deepEqual(billing.bills.map(b => b.id), ["earlier", "supplement", "final"]);
});
