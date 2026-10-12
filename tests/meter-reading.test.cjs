const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const source = fs.readFileSync(path.join(__dirname, "../components/contract/detail/MeterReading.tsx"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
} }).outputText;
const mod = { exports: {} };
vm.runInThisContext(`(function(require,module,exports){${compiled}\n})`)(require, mod, mod.exports);
const { MeterReadingInput, MeterReadingSummary } = mod.exports;
const input = (props = {}) => renderToStaticMarkup(React.createElement(MeterReadingInput, {
  name: "điện", unit: "kWh", start: 1250, end: "1300", onChange: () => {}, ...props,
}));

test("input distinguishes fixed starting reading from editable ending reading and previews consumption", () => {
  const html = input();
  assert.match(html, /Chỉ số điện đầu kỳ \(kWh\)/);
  assert.match(html, /Chỉ số điện cuối kỳ \(kWh\)/);
  assert.match(html, /1\.300 − 1\.250 = <strong>50 kWh/);
  assert.match(html, /không nhập lượng đã dùng/);
  assert.match(html, /min="1250"/);
});
test("blank end is not treated as zero; equal and invalid readings have explicit warnings", () => {
  assert.match(input({ end: "" }), /Lượng sử dụng = chỉ số cuối kỳ/);
  assert.doesNotMatch(input({ end: "" }), /Hai chỉ số bằng nhau/);
  assert.match(input({ end: "1250" }), /Hai chỉ số bằng nhau nên tiền tiêu thụ bằng 0/);
  assert.match(input({ end: "1200" }), /không được thấp hơn/);
});
test("decimal water readings preview correctly and zero readings are valid", () => {
  assert.match(input({ name: "nước", unit: "m³", start: 0.1, end: "0.3" }), /0,3 − 0,1 = <strong>0,2 m³/);
  assert.match(input({ start: 0, end: "0" }), /0 − 0 = <strong>0 kWh/);
});
test("issued invoice summary displays stored start, end and billed quantity, including zero and missing data", () => {
  const render = (props) => renderToStaticMarkup(React.createElement(MeterReadingSummary, props));
  const html = render({ start: 1250, end: 1300, quantity: 50, unit: "kWh" });
  assert.match(html, /Chỉ số đầu kỳ:.*1\.250 kWh/);
  assert.match(html, /Chỉ số cuối kỳ:.*1\.300 kWh/);
  assert.match(html, /Đã dùng:.*50 kWh/);
  assert.match(render({ start: 0, end: 0, quantity: 0, unit: "m³" }), /Đã dùng:.*0 m³/);
  assert.match(render({ quantity: 0, unit: "m³" }), /Chưa có/);
});
