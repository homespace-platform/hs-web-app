const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
function load(source, imports = require) {
  const compiled = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const mod = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports){${compiled}\n})`)(imports, mod, mod.exports);
  return mod.exports;
}
const invoiceStatus = load(read("lib/invoice-status.ts"));
const presentation = invoiceStatus.invoiceStatusPresentation;
const invoicePeriodLabel = invoiceStatus.invoicePeriodLabel;
const invoicePeriodSecondaryLabel = invoiceStatus.invoicePeriodSecondaryLabel;
function moduleImports(name) {
  if (name.startsWith("@/lib/")) return load(read(name.replace("@/", "") + ".ts"), moduleImports);
  return require(name);
}
const state = (status = "UNPAID", workflowState = "UNDER_REVIEW") => ({ status, workflowState });
test("first rent has its own label without deposit or expense month zero; cancelled receipt is not due",()=>{
  assert.equal(invoicePeriodLabel({periodIndex:-1,billingPeriod:{kind:"INITIAL_RENT",paymentPeriodNumber:1}}),"Tiền thuê tháng 1");
  assert.equal(presentation(state("CANCELLED","CANCELLED"),"CANCELLED").kind,"cancelled");
});
test("submitted proof takes priority over unpaid/overdue badge without marking invoice paid", () => {
  for (const status of ["UNPAID", "OVERDUE"]) {
    const invoice = state(status);
    assert.equal(presentation(invoice, "TRANSFER_REPORTED").label, "Đã báo chuyển · Chờ xác nhận");
    assert.match(presentation(invoice, "TRANSFER_REPORTED").className, /blue/);
    assert.equal(invoice.status, status);
  }
});
test("disputed and rejected proof are not described as awaiting confirmation", () => {
  assert.equal(presentation(state(), "DISPUTED").label, "Đang đối soát");
  assert.equal(presentation(state(), "REJECTED").label, "Chứng từ bị từ chối");
});
test("confirmed payment and paid invoices retain green completed badge", () => {
  assert.equal(presentation(state(), "CONFIRMED").label, "Đã thanh toán");
  assert.match(presentation(state("PAID", "PAID")).className, /emerald/);
});
test("draft and transferred debt do not inherit a stale pending payment label", () => {
  assert.equal(presentation(state("DRAFT", "METER_REQUIRED"), "TRANSFER_REPORTED").label, "Nháp / Chờ phát hành");
  assert.equal(presentation(state("ROLLED_OVER", "ROLLED_OVER"), "TRANSFER_REPORTED").label, "Đã chuyển nợ");
});
test("missing review payment data does not falsely call it unpaid or confirmed", () => {
  assert.equal(presentation(state()).label, "Chờ xác nhận / đối soát");
  assert.equal(presentation(state("UNPAID", "UNPAID"), "AWAITING_TRANSFER").label, "Chưa thanh toán");
  assert.equal(presentation(state("OVERDUE", "OVERDUE"), "OVERDUE").label, "Quá hạn");
});

const detailSource = read("components/contract/detail/MonthlyInvoicesSection.tsx");
let initialStates = [], stateIndex = 0;
const testReact = { ...React, useState(initial) {
  const index = stateIndex++;
  return React.useState(index < initialStates.length ? initialStates[index] : initial);
} };
const Detail = load(detailSource, name => name === "react" ? testReact
  : name === "@/lib/invoice-status" ? { invoiceStatusPresentation: presentation, invoicePeriodLabel, invoicePeriodSecondaryLabel }
  : name.startsWith("@/lib/") ? moduleImports(name)
  : name.startsWith("@/services/") ? { default: {}, monthlyInvoiceService: {} }
  : name === "@/utils/apiError" ? { getApiErrorMessage: () => "test error" }
  : name.startsWith("./") ? { default: () => null, MeterReadingInput: () => null, MeterReadingSummary: () => null }
  : name === "@/components/ui/vnd-money-input" ? { default: ({label, value}) => React.createElement("input", {"aria-label":label, value:value ?? "", readOnly:true}) }
  : name === "next/image" ? { default: () => null } : require(name)).default;
test("both parties see pending badge on actual detail component, owner retains confirmation action", () => {
  const invoice = { ...state(), id: "bill", periodIndex: 0, periodStart: "2026-11-12", periodEndExclusive: "2026-12-12",
    paymentRequestId: "payment", totalAmount: 1000000, lateFeeAmount: 0, serverNow: "2026-12-12T03:00:00Z",
    lines: [], overdueActions: [], paymentExtensions: [], activeResolution: "NONE", canResolveOverdue: false,
    canRequestExtension: false, canDeferToNextPeriod: false };
  const payment = { id: "payment", invoiceId: "bill", status: "TRANSFER_REPORTED", totalAmount: 1000000, evidences: [] };
  for (const isLandlord of [true, false]) {
    initialStates = [[invoice], [payment], false]; stateIndex = 0;
    const html = renderToStaticMarkup(React.createElement(Detail, { contractId: "contract", contractActive: true,
      isLandlord, isTenant: !isLandlord, electricityRequired: false, waterRequired: false, unsupportedWaterRate: false }));
    assert.match(html, /Đã báo chuyển · Chờ xác nhận/);
    assert.doesNotMatch(html, />Chưa thanh toán</);
    if (isLandlord) assert.match(html, /Xác nhận đã nhận tiền/);
    else assert.doesNotMatch(html, />Xác nhận đã nhận tiền</);
  }
});
test("list and detail share the same status mapper; list reads actual payment state", () => {
  const listSource = read("app/dashboard/invoices/page.tsx");
  assert.match(detailSource, /invoiceStatusPresentation\(invoice, payment\?\.status\)/);
  assert.match(listSource, /getContractPayments\(contract.id\)/);
  assert.match(read("components/dashboard/invoices/ContractPaymentCard.tsx"), /monthlySummary/);
  assert.match(listSource, /cancelled|refreshKey/);
});

test("actual month-one view uses original combined transfer without monthly penalty or month-zero expenses",()=>{
  const invoice={...state("UNPAID","UNPAID"),id:"first-rent:original",periodIndex:-1,periodStart:"2026-11-01",periodEndExclusive:"2026-12-01",
    billingPeriod:{kind:"INITIAL_RENT",paymentPeriodNumber:1},paymentRequestId:"original",totalAmount:5000000,lateFeeAmount:0,
    serverNow:"2026-11-01T03:00:00Z",dueAt:"2026-11-02T03:00:00Z",lines:[{type:"RENT",description:"Tiền thuê tháng 1",amount:5000000}],overdueActions:[],paymentExtensions:[]};
  const payment={id:"original",status:"AWAITING_TRANSFER",totalAmount:15000000,evidences:[],dueAt:invoice.dueAt};
  initialStates=[[invoice],[payment],false];stateIndex=0;
  const html=renderToStaticMarkup(React.createElement(Detail,{contractId:"root",rentalRequestId:"rental",isTenant:true,isLandlord:false}));
  assert.match(html,/Tiền thuê tháng 1/);assert.match(html,/Chỉ chuyển một lần theo QR gốc/);
  assert.doesNotMatch(html,/Chi phí tháng 0|Phạt chậm thanh toán tối đa|Thanh toán ban đầu/);
  assert.match(html,/Tôi đã chuyển khoản/);
});
test("supplementary final costs are never labeled as rent period four", () => {
  assert.equal(invoicePeriodLabel({ periodIndex: 3, finalCostSupplement: true }), "Chi phí bổ sung kỳ cuối");
  assert.equal(invoicePeriodLabel({ periodIndex: 2, billingPeriod: { kind: "FINAL_SETTLEMENT" } }), "Chi phí cuối hợp đồng");
});

test("payment numbers are independent of expense months for three and twelve month leases", () => {
  for (const months of [3, 12]) {
    for (let index = 0; index < months - 1; index++) {
      assert.equal(invoicePeriodLabel({ periodIndex: index, billingPeriod: { kind: "RECURRING", paymentPeriodNumber: index + 2 } }), `Kỳ thanh toán ${index + 2}`);
    }
    assert.equal(invoicePeriodLabel({ periodIndex: months - 1, billingPeriod: { kind: "FINAL_SETTLEMENT" } }), "Chi phí cuối hợp đồng");
  }
  assert.equal(invoicePeriodLabel({ periodIndex: 0, status: "PAID", lines: [{ type: "RENT" }] }), "Kỳ thanh toán 2");
  assert.equal(invoicePeriodLabel({ periodIndex: 11, status: "PAID", lines: [{ type: "ELECTRICITY" }] }), "Chi phí cuối hợp đồng");
  assert.match(invoicePeriodLabel({ periodIndex: 2, status: "DRAFT" }), /Chờ thông tin/);
});

const initialSource = read("components/contract/detail/InitialPaymentHistory.tsx");
const InitialHistory = load(initialSource, name => name === "react" ? testReact
  : name === "@/components/rental-request/RentalOnboardingPanel" ? { default: () => null }
  : name.startsWith("@/services/") ? { default: {} } : require(name)).default;
test("initial payment history delegates to the onboarding panel so deposit and first rent keep separate receipts", () => {
  const html = renderToStaticMarkup(React.createElement(InitialHistory, { rentalRequestId: "rental", defaultOpen: true }));
  assert.match(html, /<details open/);
  assert.match(initialSource, /<RentalOnboardingPanel rentalRequestId=\{rentalRequestId\} \/>/);
  assert.doesNotMatch(html, /<img|Tôi đã chuyển khoản/);
  const panel = read("components/rental-request/RentalOnboardingPanel.tsx");
  // Reported is not confirmed, and confirming one payment never implies the other.
  assert.match(panel, /TRANSFER_REPORTED: "Đã báo chuyển · Chờ xác nhận"/);
  assert.match(panel, /CONFIRMED: "Đã xác nhận"/);
});
