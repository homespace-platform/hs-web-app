const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const source = fs.readFileSync(path.join(__dirname, "../components/contract/detail/InvoiceLineCalculation.tsx"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
} }).outputText;
const mod = { exports: {} };
vm.runInThisContext(`(function(require,module,exports){${compiled}\n})`)(require, mod, mod.exports);
const Calculation = mod.exports.default;
const render = (overrides = {}) => renderToStaticMarkup(React.createElement(Calculation, {
  line: { type: "LATE_FEE", quantity: 10, unitPrice: 100000, amount: 1000000, quantityUnit: "ngày", ...overrides },
})).replace(/\u00a0/g, " ");

test("daily penalty shows daily rate multiplied by the frozen billed days, not a lump sum", () => {
  assert.match(render(), /100\.000 ₫\/ngày × 10 ngày/);
  assert.doesNotMatch(render(), /1 × 1\.000\.000/);
  assert.match(render({ quantity: 3, amount: 300000 }), /100\.000 ₫\/ngày × 3 ngày/);
});
test("lower fee cap is explained without pretending multiplication equals the capped amount", () => {
  const html = render({ amount: 700000 });
  assert.match(html, /100\.000 ₫\/ngày × 10 ngày/);
  assert.match(html, /Phí tính theo đơn giá: 1\.000\.000 ₫; áp dụng mức trần còn 700\.000 ₫/);
});
test("fixed-once policy is shown once and old unknown breakdown never invents a number of days", () => {
  assert.match(render({ quantity: 1, quantityUnit: "lần", amount: 100000 }), /100\.000 ₫ × 1 lần/);
  const legacy = render({ quantity: 1, quantityUnit: undefined, unitPrice: 700000, amount: 700000 });
  assert.match(legacy, /hóa đơn cũ chưa lưu chi tiết số ngày/);
  assert.doesNotMatch(legacy, /×/);
});
test("other invoice lines retain their quantity and price calculation", () => {
  assert.match(render({ type: "ELECTRICITY", quantity: 50, unitPrice: 3925, amount: 196250 }), /50 × 3\.925 ₫/);
});
