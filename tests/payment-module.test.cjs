/* eslint-disable @typescript-eslint/no-require-imports -- Node tests load the real TypeScript with isolated imports. */
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
  assert.equal(api.paymentSection("initial"),"monthly");
  assert.equal(api.paymentModulePath("a/b", "monthly", "x y"), "/dashboard/contracts/a%2Fb?tab=payment&section=monthly&invoice=x+y");
  assert.equal(api.paymentSection("deposit"), "deposit");assert.equal(api.paymentSection("unknown"), "monthly");
});

test("untrusted route ids pass only as a single safe segment before they reach a path or comparison", () => {
  assert.equal(api.safeResourceId("  3f2c-AB_9  "), "3f2c-AB_9");
  for (const bad of [null, undefined, "", "   ", "a/b", "../x", "a b", "-leading", 'a"]', "a'b", "a".repeat(65), "%2e%2e"]) assert.equal(api.safeResourceId(bad), null, String(bad));
  assert.equal(api.safeResourceId("a".repeat(64)), "a".repeat(64));
  const uuid = "3f2c9a4e-1b7d-4c8a-9e21-5d6f0a7b8c90";
  assert.equal(api.safeInvoiceSelectionId(uuid), uuid);
  assert.equal(api.safeInvoiceSelectionId(` first-rent:${uuid} `), `first-rent:${uuid}`);
  assert.equal(api.safeResourceId(`first-rent:${uuid}`), null, "contract path validation does not accept the synthetic id");
  for (const bad of [null, "", "first-rent:", "first-rent:a/b", "first-rent:../x", "first-rent:first-rent:x", "first-rent:-x", "other:abc", "a:b", "first-rent:" + "a".repeat(65)]) assert.equal(api.safeInvoiceSelectionId(bad), null, String(bad));
  assert.equal(api.paymentModulePath("root", "monthly", `first-rent:${uuid}`), `/dashboard/contracts/root?tab=payment&section=monthly&invoice=first-rent%3A${uuid}`);
  assert.equal(api.paymentModulePath("root", "deposit", undefined), "/dashboard/contracts/root?tab=payment&section=deposit");
  assert.equal(api.paymentQuery("deposit"), "tab=payment&section=deposit");
});

test("landing sends ?section=deposit on a lease to its deposit agreement, everything else to the contract's own page", () => {
  const lease = { id: "lease", depositAgreementContractId: "dc-1" };
  const target = (contract, search = "", hash = "", side = "tenant") => api.contractLandingTarget(side, contract, search, hash);
  assert.equal(target(lease, "?tab=payment&section=deposit"), "/dashboard/tenant/contracts/dc-1?tab=payment");
  assert.equal(target(lease, "?tab=payment&section=monthly&invoice=i1", "", "landlord"), "/dashboard/landlord/contracts/lease?tab=payment&section=monthly&invoice=i1");
  assert.equal(target(lease, "?tab=sign"), "/dashboard/tenant/contracts/lease?tab=sign");
  assert.equal(target(lease, "", "#monthly-invoices"), "/dashboard/tenant/contracts/lease?tab=payment&section=monthly#monthly-invoices");
  // no deposit agreement, or an unsafe id: nothing to open, fall back to the lease's end tab
  assert.equal(target({ id: "lease" }, "?section=deposit"), "/dashboard/tenant/contracts/lease?tab=end");
  assert.equal(target({ id: "lease", depositAgreementContractId: "../x" }, "?section=deposit"), "/dashboard/tenant/contracts/lease?tab=end");
  // the deposit agreement itself and child documents stay where they are
  assert.equal(target({ id: "dc-1", agreementKind: "DEPOSIT" }, "?tab=payment&section=deposit"), "/dashboard/tenant/contracts/dc-1?tab=payment&section=deposit");
  assert.equal(target({ id: "amend", agreementKind: "AMENDMENT", parentContractId: "lease" }, "?section=deposit"), "/dashboard/tenant/contracts/amend?section=deposit");
});
