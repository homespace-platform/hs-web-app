const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
function load(file) {
  const source = fs.readFileSync(path.join(__dirname, "..", file + ".ts"), "utf8");
  const mod = { exports: {} };
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInThisContext(`(function(require,module,exports){${compiled}\n})`)(name => name.startsWith("@/lib/") ? load(name.replace("@/", "")) : require(name), mod, mod.exports);
  return mod.exports;
}
const api = load("lib/payment-module");
const bill = (id, status, amount, index = 0) => ({ id, contractId: "root", status, workflowState: status,
  totalAmount: amount, periodIndex: index, paymentRequestId: id + "-pay", paymentExtensions: [] });
test("monthly summary counts transferred debt only in receiving bill and separates reported payments", () => {
  const bills = [bill("old", "ROLLED_OVER", 100), bill("new", "UNPAID", 250, 1), bill("pending", "OVERDUE", 300, 2), bill("paid", "PAID", 800, 3)];
  const payments = [{ id: "new-pay", status: "AWAITING_TRANSFER" }, { id: "pending-pay", status: "TRANSFER_REPORTED" }];
  const summary = api.monthlySummary(bills, payments);
  assert.equal(summary.amount, 250); assert.equal(summary.tone, "warning");
  assert.match(summary.detail, /chờ xác nhận/);
  assert.equal(bills[0].status, "ROLLED_OVER");
  assert.equal(api.monthlySummary([bills[2]], payments).amount, 300);
  assert.equal(api.monthlySummary([bills[2]], payments).tone, "info");
});
test("missing payment or invoice data never becomes zero debt or paid", () => {
  for (const args of [[undefined, []], [[], undefined]]) {
    const result = api.monthlySummary(...args); assert.equal(result.amount, undefined);assert.equal(result.tone, "muted");
    assert.doesNotMatch(result.label, /Đã thanh toán/);
  }
  assert.equal(api.initialSummary().amount, undefined);
});
test("completed refund retains original transferred amount when held deposit becomes zero", () => {
  const data = { heldDeposit: 0, billing: { allPaid: true }, closure: { status: "CLOSED", refundAmount: 26720000 },
    refundPayment: { totalAmount: 26720000, status: "CONFIRMED" } };
  const summary = api.depositSummary(data);assert.equal(summary.amount, 26720000);assert.equal(summary.tone, "success");
  assert.match(summary.detail, /xác nhận nhận tiền/);
  assert.equal(api.depositSummary({ ...data, refundPayment: { ...data.refundPayment, status: "TRANSFER_REPORTED" }, closure: { status: "REFUND_PENDING" } }).tone, "info");
});
test("deposit dispute, unaccepted proposal and zero settlement stay distinct", () => {
  const data = { heldDeposit: 100, billing: { allPaid: true }, closure: { status: "PROPOSED", refundAmount: 50 } };
  assert.match(api.depositSummary(data).label, /Chờ người thuê/);
  assert.match(api.depositSummary({ ...data, closure: { status: "DISPUTED" } }).label, /đối soát/);
  assert.equal(api.depositSummary({ ...data, closure: { status: "CLOSED", refundAmount: 0, balanceAmount: 0 } }).amount, 0);
});
test("invoice selection follows deep link or party action, preserving newest history and input order", () => {
  const bills = [bill("paid", "PAID", 20, 0), bill("pending", "UNPAID", 40, 1), bill("last", "PAID", 10, 2)];
  const payments = [{ id: "pending-pay", status: "TRANSFER_REPORTED" }];
  assert.equal(api.chooseInvoice(bills, payments, "landlord"), "pending");
  assert.equal(api.chooseInvoice(bills, payments, "tenant", "paid"), "paid");
  assert.equal(api.chooseInvoice(bills, payments, "tenant", "wrong-contract-id"), "pending");
  assert.equal(api.chooseInvoice(bills.filter(b => b.status === "PAID"), [], "tenant"), "last");
  assert.deepEqual(bills.map(b => b.id), ["paid", "pending", "last"]);
});
test("module URLs encode contract and invoice identity and default to monthly safely", () => {
  assert.deepEqual(api.paymentSections.map(s=>s.id),["monthly","deposit"]);
  assert.equal(api.paymentSection("initial"),"monthly");
  assert.equal(api.paymentModulePath("a/b", "monthly", "x y"), "/dashboard/invoices/a%2Fb?section=monthly&invoice=x+y");
  assert.equal(api.paymentSection("deposit"), "deposit");assert.equal(api.paymentSection("unknown"), "monthly");
});

test("first rent is counted without deposit, cancelled bills are not outstanding, retained deposit stays visible",()=>{
  const first={...bill("first","PAID",5000000,-1),billingPeriod:{kind:"INITIAL_RENT",paymentPeriodNumber:1}};
  assert.equal(api.monthlySummary([first,bill("cancelled","CANCELLED",5000000)],[]).tone,"success");
  const summary=api.depositSummary(undefined,{deposit:{status:"RETAINED_BY_LANDLORD",heldAmount:0,retainedAmount:10000000,retainedReason:"Quá hạn ký sau thông báo"}});
  assert.equal(summary.amount,10000000);assert.match(summary.label,/giữ cọc/);
});
