/* eslint-disable @typescript-eslint/no-require-imports -- Exercise the actual TS modules with isolated dependencies. */
const { test } = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm"), ts = require("typescript");
const React = require("react"), { renderToStaticMarkup } = require("react-dom/server");
function load(file, imports, globals = {}) {
  const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const mod = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${output}\n})`, { ...globals })(imports, mod, mod.exports);
  return mod.exports;
}
const service = load("services/membership-receipt.service.ts", (n) => n === "@/lib/axios-client" ? { default: {} } : require(n), { atob, Blob, Uint8Array, encodeURIComponent });
const stub = (n) => n === "react" ? React : n === "lucide-react" ? { FileCheck2: () => null, Loader2: () => null } : n === "sonner" ? { toast: {} } : n.startsWith("@/services") ? { membershipReceiptService: {} } : n === "@/utils/apiError" ? { getApiErrorMessage: () => "" } : require(n);
const { MembershipReceiptList } = load("components/dashboard/invoices/MembershipReceiptsPanel.tsx", stub, { Intl, Date });
const row = (o) => ({ id: "1", orderId: "o", receiptNumber: "HS-MB-20261128-AAAA", itemName: "Gói hội viên Starter", kind: "PLAN", quantity: 1, periodDays: 30, totalAmount: 49000, currency: "VND", provider: "SEPAY", issuedAt: "2026-11-28T03:00:00Z", pdfStatus: "READY", ...o });
const html = (rows) => renderToStaticMarkup(React.createElement(MembershipReceiptList, { rows, onPdf() {}, onRetry() {} }));

test("decodePdf accepts only real PDF bytes", () => {
  assert.equal(service.decodePdf(Buffer.from("%PDF-1.7 x").toString("base64")).size, 10);
  assert.throws(() => service.decodePdf("bm90IGEgcGRm"));
  assert.throws(() => service.decodePdf("***"));
  assert.throws(() => service.decodePdf(undefined));
});
test("empty state names the membership tab content", () => {
  assert.match(html([]), /Chưa có biên nhận gói hội viên/);
});
test("rows show number, plan, gateway, and a PDF button only when ready", () => {
  const ready = html([row()]);
  assert.match(ready, /HS-MB-20261128-AAAA/); assert.match(ready, /Gói hội viên Starter/); assert.match(ready, /SePay/); assert.match(ready, /Tải PDF/);
  const pending = html([row({ pdfStatus: "PENDING", provider: "ETH" })]);
  assert.match(pending, /Đang tạo PDF/); assert.doesNotMatch(pending, /Tải PDF/); assert.match(pending, /Ví ETH/);
  assert.match(html([row({ pdfStatus: "FAILED" })]), /Thử tạo lại PDF/);
});
