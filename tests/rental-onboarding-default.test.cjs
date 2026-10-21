const {test}=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),ts=require("typescript");
const React=require("react"),{renderToStaticMarkup}=require("react-dom/server");
let snapshot,index;
const testReact={...React,useState(initial){return React.useState(index++===0?snapshot:initial);}};
const source=fs.readFileSync(path.join(__dirname,"../components/rental-request/RentalOnboardingPanel.tsx"),"utf8");
const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const mod={exports:{}};
vm.runInThisContext(`(function(require,module,exports){${output}\n})`)(name=>name==="react"?testReact:name.startsWith("@/services/")?{rentalOnboardingService:{},default:{}}:name==="@/utils/apiError"?{getApiErrorMessage:()=>"error"}:name==="./RentalPaymentModal"?{default:()=>null}:require(name),mod,mod.exports);
function render(role,defaultCase={},stage="REQUIRES_REVIEW") {
  snapshot={stage,askerRole:role,serverNow:"2026-11-03T03:00:00Z",startsOn:"2026-11-01",endExclusive:"2027-02-01",payments:[],startChanges:[],history:[],canRequestCancellation:true,
    defaultCase:{eligibleKind:"FIRST_RENT",canComplete:false,...defaultCase}};index=0;
  return renderToStaticMarkup(React.createElement(mod.exports.default,{rentalRequestId:"rental"}));
}
test("owner has notice first; retention is exposed only with server completion permission",()=>{
  assert.match(render("LANDLORD"),/Thông báo quá hạn trước khi xử lý cọc/);
  assert.doesNotMatch(render("LANDLORD"),/Chốt giữ cọc &amp; hủy/);
  assert.match(render("LANDLORD",{canComplete:true,notifiedAt:"2026-11-02T03:00:00Z"}),/Chốt giữ cọc &amp; hủy/);
});
test("tenant can respond and request mutual cancellation but never retain their own deposit",()=>{
  const html=render("TENANT",{canComplete:true,notifiedAt:"2026-11-02T03:00:00Z"});
  assert.match(html,/Phản hồi \/ Yêu cầu đối soát/);assert.match(html,/Đề nghị hủy và hoàn tiền/);
  assert.doesNotMatch(html,/Chốt giữ cọc &amp; hủy|Thông báo quá hạn trước khi xử lý cọc/);
});
test("disputed case explains reconciliation; closed or signed case does not pretend old notice is pending",()=>{
  const disputed=render("LANDLORD",{notifiedAt:"2026-11-02T03:00:00Z",disputedAt:"2026-11-03T00:00:00Z",eligibleKind:null});
  assert.match(disputed,/Chặn giữ cọc, cần đối soát/);assert.doesNotMatch(disputed,/Chốt giữ cọc &amp; hủy/);
  const closed=render("TENANT",{notifiedAt:"2026-11-02T03:00:00Z"},"CANCELLED_BY_RENTER");
  assert.match(closed,/Thông báo cũ không còn áp dụng/);assert.doesNotMatch(closed,/Phản hồi \/ Yêu cầu đối soát/);
});
