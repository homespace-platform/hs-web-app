/* eslint-disable @typescript-eslint/no-require-imports -- Node VM fixture loads TypeScript modules. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const file = require.resolve("../lib/branch-form.ts");
const fixture = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText, { module: fixture, exports: fixture.exports, require: () => ({}) });
const { buildOptionalCharge, toFormCategory } = fixture.exports;

test("a not-applicable fee is still sent as an explicit row without an amount", () => {
  const row = buildOptionalCharge("INTERNET", "NOT_APPLICABLE", "50000", "phòng/tháng", 4);
  assert.deepEqual({ ...row }, {
    chargeType: "INTERNET", billingMethod: "NOT_APPLICABLE", amount: undefined,
    currency: "VND", unit: "", includedInRent: false, sortOrder: 4,
  });
  assert.equal(buildOptionalCharge("INTERNET", "PER_MONTH", "50000", "phòng/tháng", 4).amount, 50000);
});

test("the API category in upper case maps to the lower-case form key", () => {
  assert.equal(toFormCategory("ROOM"), "room");
  assert.equal(toFormCategory("APARTMENT"), "apartment");
  assert.equal(toFormCategory(undefined), "house");
});

test("the branch page uses both helpers", () => {
  const page = fs.readFileSync(require.resolve("../app/dashboard/branches/page.tsx"), "utf8");
  assert.match(page, /setCategory\(toFormCategory\(branch\.category\)\)/);
  assert.equal((page.match(/buildOptionalCharge\(/g) || []).length >= 3, true);
});
