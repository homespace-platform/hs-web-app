const {test}=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),ts=require("typescript");
const React=require("react"),{renderToStaticMarkup}=require("react-dom/server");
const cache=new Map();
function load(file) {
  if(cache.has(file))return cache.get(file);
  const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,"..",file),"utf8"),{fileName:file,
    compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  const mod={exports:{}};
  const resolve=name=>name==="./rental-request.helper"?load("components/rental-request/rental-request.helper.ts"):
    name==="./EndOfPeriodCharges"?load("components/rental-request/EndOfPeriodCharges.tsx"):require(name);
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`)(resolve,mod,mod.exports);
  cache.set(file,mod.exports);return mod.exports;
}
const {RentalCostSummary}=load("components/rental-request/RentalCostSummary.tsx");
const plan={calculatedAt:"2026-10-21T03:00:00Z",businessDate:"2026-10-21",moveInDate:"2026-11-01",
  depositOnly:true,amountAfterApproval:39320000,firstRentAmount:19660000,firstRentOpensOn:"2026-11-01"};
const estimate={effectiveMonthlyRent:19660000,depositAmount:39320000,estimatedInitialTotal:58980000,
  predictableCharges:[],excludedCharges:[],paymentPlan:plan};
const render=(value=estimate,extra={})=>renderToStaticMarkup(React.createElement(RentalCostSummary,
  {estimate:value,loading:false,error:null,depositBadge:"2 tháng tiền nhà",...extra}));
test("reservation consent is mandatory in browser validation, button gating and submit; never prechecked",()=>{
  const modal=fs.readFileSync(path.join(__dirname,"../components/rental-request/RentalRequestModal.tsx"),"utf8");
  assert.match(modal,/type="checkbox" required checked=\{reservationPolicyAccepted\}/);
  assert.match(modal,/disabled=\{[^}]*!reservationPolicyAccepted/);
  assert.match(modal,/if\(!reservationPolicyAccepted\) \{[\s\S]*?return;/);
  assert.match(modal,/setReservationPolicyAccepted\(false\)/);
  assert.doesNotMatch(modal,/setReservationPolicyAccepted\(true\)/);
  assert.match(modal,/đã đọc và đồng ý điều kiện giữ chỗ \(bắt buộc\)/);
});
test("future move-in separates deposit due after approval from first rent due on move-in",()=>{
  const html=render();
  assert.match(html,/Đặt cọc trước ngày nhận nhà/);assert.match(html,/39\.320\.000/);
  assert.match(html,/Tiền thuê tháng đầu — thanh toán sau/);assert.match(html,/19\.660\.000/);
  assert.match(html,/01\/11\/2026/);assert.match(html,/21\/10\/2026/);assert.match(html,/Không thu lại khoản cọc/);
  assert.doesNotMatch(html,/58\.980\.000|Tổng cần thanh toán ban đầu|>Tiền thuê kỳ đầu</);
});
test("same-day move-in preserves the combined initial payment display",()=>{
  const html=render({...estimate,paymentPlan:{...plan,businessDate:"2026-11-01",depositOnly:false,amountAfterApproval:58980000}});
  assert.match(html,/Thanh toán ban đầu/);assert.match(html,/Tiền thuê kỳ đầu/);assert.match(html,/58\.980\.000/);
  assert.doesNotMatch(html,/Tiền thuê tháng đầu — thanh toán sau|Đặt cọc trước ngày nhận nhà/);
});
test("zero deposit clearly requires no transfer and still defers the first rent",()=>{
  const html=render({...estimate,depositAmount:0,paymentPlan:{...plan,amountAfterApproval:0}});
  assert.match(html,/miễn cọc, không cần chuyển tiền giữ chỗ/);assert.match(html,/thanh toán sau/);
});
test("stale, missing-plan, loading and failed quotes never show a misleading payable amount",()=>{
  for(const html of [render(estimate,{loading:true}),render(estimate,{error:"Không thể tải dự toán"}),
    render({...estimate,paymentPlan:null}),render(null)]) {
    assert.doesNotMatch(html,/58\.980\.000|39\.320\.000/);
    assert.match(html,/Đang tính lịch thanh toán|Chưa thể xác định khoản thanh toán/);
  }
  const modal=fs.readFileSync(path.join(__dirname,"../components/rental-request/RentalRequestModal.tsx"),"utf8");
  assert.match(modal,/estimateFor===estimateKey\?estimateResult:null/);
  assert.match(modal,/disabled=\{[^}]*!estimate\?\.paymentPlan\}/);
  assert.match(modal,/active && seq === estimateSeqRef.current/);
  assert.match(modal,/active = false/);
});
