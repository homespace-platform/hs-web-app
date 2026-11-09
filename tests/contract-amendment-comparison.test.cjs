/* eslint-disable @typescript-eslint/no-require-imports -- Node test loads TypeScript without a browser. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const mod = { exports: {} };
const file = path.join(__dirname, "../lib/contract-amendment-comparison.ts");
const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInThisContext(`(function(exports){${code}\n})`)(mod.exports);
const { formatAmendmentComparisonText: format } = mod.exports;

test("legacy charge comparison localizes the billing method without dropping monetary details", () => {
  const before = "25.000 VND / người / tháng\nĐơn giá: 25000.00\nCách tính: PER_PERSON_MONTH\nTổng phí dự kiến: 25000.00\nGhi chú: 1 người";
  const after = format("charges.SERVICE_OR_GARBAGE", before);
  assert.match(after, /Cách tính: Người \/ tháng/);
  assert.match(after, /Đơn giá: 25000\.00/);
  assert.match(after, /Tổng phí dự kiến: 25000\.00/);
  assert.doesNotMatch(after, /PER_PERSON_MONTH/);
});

test("other comparison values and existing readable method names remain intact", () => {
  assert.equal(format("financial.amountValue", "Cách tính: PER_MONTH"), "Cách tính: PER_MONTH");
  assert.equal(format("charges.ELECTRICITY", "Cách tính: kWh (theo công tơ)"), "Cách tính: kWh (theo công tơ)");
  assert.equal(format("charges.WATER", "Cách tính: PER_M3"), "Cách tính: m³ (theo đồng hồ)");
});
