/* eslint-disable @typescript-eslint/no-require-imports -- Render the shared ledger without API/provider calls. */
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),ts=require("typescript"),React=require("react"),{renderToStaticMarkup}=require("react-dom/server");
const source=fs.readFileSync(path.join(__dirname,"../components/payment/DepositLedgerSummary.tsx"),"utf8");
const loaded={exports:{}};
vm.runInThisContext(`(function(require,module,exports){${ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText}\n})`)(require,loaded,loaded.exports);
const render=ledger=>renderToStaticMarkup(React.createElement(loaded.exports.default,{ledger}));
test("missing ledger and unknown historical amounts are explicit rather than silently zero",()=>{
  assert.match(render(null),/Chưa có sổ cọc/);
  const html=render({status:"REFUNDED",heldAmount:0,retainedAmount:null,confirmedRefundedAmount:null});
  assert.match(html,/Chưa có dữ liệu/);assert.match(html,/0 đ/);
});
test("partial retention remains visible after the real refund, with its reason and date",()=>{
  const html=render({status:"REFUNDED",heldAmount:0,retainedAmount:100000,refundableAmount:0,confirmedReceivedAmount:20000000,confirmedRefundedAmount:19900000,retainedAt:"2026-11-03T03:00:00Z",retainedReason:"Vỡ kính cửa theo biên bản"});
  for(const expected of [/100.000 đ/,/19.900.000 đ/,/20.000.000 đ/,/Vỡ kính cửa/,/Chốt giữ lúc/])assert.match(html,expected);
});
test("reported or disputed refund never claims that money was actually received",()=>{
  const html=render({status:"REFUND_REPORTED",heldAmount:19900000,retainedAmount:100000,refundableAmount:19900000,confirmedRefundedAmount:0});
  assert.match(html,/Chờ bên nhận xác nhận/);assert.match(html,/chưa phải đã nhận tiền hoàn/);
  assert.match(render({status:"DISPUTED"}),/Đang đối soát cọc/);
});
test("admin and renter/landlord views render the same ledger definition",()=>{
  assert.equal(source,fs.readFileSync(path.join(__dirname,"../../hs-admin-portal/src/pages/contracts/DepositLedgerSummary.tsx"),"utf8"));
});
