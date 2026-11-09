/* eslint-disable @typescript-eslint/no-require-imports -- Node VM fixture loads TypeScript modules. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const file = require.resolve("../app/dashboard/properties/new/utils/mapListingDetailToFormState.ts");
const fixture = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText, {
  module: fixture, exports: fixture.exports,
  require: () => ({ furnishingStatusToFormValue: () => "NONE" }),
});
const { mapListingDetailToFormState } = fixture.exports;

test("editing a branch-linked listing restores its own approved monthly fees", () => {
  const detail = {
    id: "listing", branchId: "branch", category: "ROOM", title: "Room", areaM2: 30,
    pricing: { amount: 5000000, unit: "ROOM_MONTH", depositType: "NONE", minimumLeaseMonths: 6 },
    charges: [
      { chargeType: "ELECTRICITY", billingMethod: "PER_KWH", amount: 4000, includedInRent: false },
      { chargeType: "WATER", billingMethod: "PER_M3", amount: 30000, includedInRent: false },
      { chargeType: "OTHER", billingMethod: "PER_MONTH", customName: "Thang máy", amount: 90000, unit: "tháng", includedInRent: false },
    ],
  };
  const branches = [{ id: "branch", name: "Branch", isComplete: false, missingCharges: ["water"],
    defaultCharges: [{ chargeType: "ELECTRICITY", billingMethod: "PER_KWH", amount: 2925 },
      { chargeType: "WATER", billingMethod: "PER_M3", amount: 18750 }] }];
  const form = mapListingDetailToFormState(detail, "edit", branches, "2026-11-09");
  assert.equal(form.monthlyExpenses.electricityPrice, "4000");
  assert.equal(form.monthlyExpenses.waterPrice, "30000");
  assert.equal(form.monthlyExpenses.customFees[0].amount, "90000");
  assert.equal(form.monthlyExpenses.customFees[0].unit, "tháng");
  assert.equal(form.notice, undefined);
});
