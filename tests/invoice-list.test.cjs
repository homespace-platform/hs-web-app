const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");

const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

function load(source, imports = require) {
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const mod = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports){${compiled}\n})`)(imports, mod, mod.exports);
  return mod.exports;
}

const status = load(read("lib/invoice-status.ts"));
const list = load(read("lib/invoice-list.ts"), (name) => {
  if (name === "@/lib/invoice-status") return status;
  if (name === "@/lib/contract-routes") return { invoiceDetailPath: (id) => `/dashboard/invoices/${id}` };
  if (name === "@/lib/dashboard-role") return {};
  return require(name);
});

const bill = (partial = {}) => ({
  id: partial.id || "inv",
  contractId: "c1",
  periodIndex: partial.periodIndex ?? 0,
  periodStart: "2026-09-01",
  periodEndExclusive: "2026-10-01",
  status: partial.status || "UNPAID",
  workflowState: partial.workflowState || "UNPAID",
  paymentExtensions: partial.paymentExtensions || [],
  activeResolution: partial.activeResolution || "NONE",
  dueAt: partial.dueAt,
  issuedAt: partial.issuedAt,
  rolledToInvoiceId: partial.rolledToInvoiceId,
});

test("landlord treats submitted proof as needs action; tenant treats it as awaiting confirmation", () => {
  const invoice = bill({ status: "UNPAID", workflowState: "UNDER_REVIEW" });
  assert.equal(list.invoiceNeedsAction("landlord", invoice, "TRANSFER_REPORTED"), true);
  assert.equal(list.invoiceNeedsAction("tenant", invoice, "TRANSFER_REPORTED"), false);
  assert.equal(list.invoiceAwaitingConfirmation("tenant", invoice, "TRANSFER_REPORTED"), true);
  assert.equal(list.invoiceAwaitingConfirmation("landlord", invoice, "TRANSFER_REPORTED"), false);
});

test("rolled-over invoices stay completed and are not actionable again", () => {
  const invoice = bill({ status: "ROLLED_OVER", workflowState: "ROLLED_OVER", rolledToInvoiceId: "next" });
  assert.equal(list.invoiceNeedsAction("tenant", invoice, null), false);
  assert.equal(list.invoiceCompleted(invoice, null), true);
  assert.equal(list.invoiceMatchesListTab("completed", "tenant", invoice, null), true);
  assert.equal(list.invoiceMatchesListTab("needs_action", "tenant", invoice, null), false);
});

test("sort puts needs-action before completed with stable due-date order", () => {
  const unpaid = {
    key: "a",
    contract: { id: "c2", contractNumber: "HS-002" },
    invoice: bill({ id: "a", status: "UNPAID", workflowState: "UNPAID", dueAt: "2026-10-20", periodIndex: 1 }),
    paymentStatus: null,
    paymentLoadFailed: false,
    invoiceLoadFailed: false,
  };
  const paid = {
    key: "b",
    contract: { id: "c1", contractNumber: "HS-001" },
    invoice: bill({ id: "b", status: "PAID", workflowState: "PAID", dueAt: "2026-09-01", periodIndex: 0 }),
    paymentStatus: "CONFIRMED",
    paymentLoadFailed: false,
    invoiceLoadFailed: false,
  };
  const overdue = {
    key: "c",
    contract: { id: "c1", contractNumber: "HS-001" },
    invoice: bill({ id: "c", status: "OVERDUE", workflowState: "OVERDUE", dueAt: "2026-10-01", periodIndex: 0 }),
    paymentStatus: null,
    paymentLoadFailed: false,
    invoiceLoadFailed: false,
  };
  const sorted = [paid, unpaid, overdue].sort((a, b) => list.compareInvoiceListRows("tenant", a, b));
  assert.deepEqual(sorted.map((item) => item.invoice.id), ["c", "a", "b"]);
});

test("issued month filter uses issuedAt, not periodStart", () => {
  const invoice = bill({
    periodStart: "2026-09-15",
    issuedAt: "2026-10-01T02:00:00+07:00",
  });
  assert.equal(list.invoiceMatchesIssuedMonth(invoice, "2026-10"), true);
  assert.equal(list.invoiceMatchesIssuedMonth(invoice, "2026-09"), false);
  assert.equal(list.invoiceMatchesIssuedMonth({ issuedAt: undefined }, "2026-10"), false);
});

test("landlord draft action and tenant unpaid action stay role-specific", () => {
  assert.equal(list.invoiceListAction("landlord", bill({ status: "DRAFT", workflowState: "METER_REQUIRED" })).label, "Chốt chỉ số");
  assert.equal(list.invoiceListAction("tenant", bill({ status: "OVERDUE", workflowState: "OVERDUE" })).label, "Thanh toán");
  assert.equal(
    list.invoiceListAction("landlord", bill({ status: "UNPAID", workflowState: "UNDER_REVIEW" }), "TRANSFER_REPORTED").label,
    "Xác nhận thanh toán",
  );
});
