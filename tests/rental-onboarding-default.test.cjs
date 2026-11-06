/* eslint-disable @typescript-eslint/no-require-imports -- Node regression tests execute the real TypeScript with isolated dependencies. */
const {test}=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),ts=require("typescript");
const React=require("react"),{renderToStaticMarkup}=require("react-dom/server");
let snapshot,index;
const testReact={...React,useState(initial){return React.useState(index++===0?snapshot:initial);}};
const source=fs.readFileSync(path.join(__dirname,"../components/rental-request/RentalOnboardingPanel.tsx"),"utf8");
const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const mod={exports:{}};
vm.runInThisContext(`(function(require,module,exports){${output}\n})`)(name=>name==="react"?testReact:name.startsWith("@/services/")?{rentalOnboardingService:{},default:{}}:name==="@/utils/apiError"?{getApiErrorMessage:()=>"error"}:["./RentalPaymentModal","./RentalWorkflowPanel","./DepositAgreementPanel","@/components/payment/PaymentDisputePanel","@/components/payment/DepositLedgerSummary","@/components/complaint/ComplaintPanel"].includes(name)?{default:()=>null}:require(name),mod,mod.exports);
function render(role,defaultCase={},stage="REQUIRES_REVIEW",extra={},props={}) {
  snapshot={stage,askerRole:role,serverNow:"2026-11-03T03:00:00Z",startsOn:"2026-11-01",endExclusive:"2027-02-01",payments:[],startChanges:[],history:[],canRequestCancellation:true,
    defaultCase:{eligibleKind:"FIRST_RENT",canComplete:false,...defaultCase},...extra};index=0;
  return renderToStaticMarkup(React.createElement(mod.exports.default,{rentalRequestId:"rental",...props}));
}

test("a tenant deposit signature removes voluntary cancellation even if a stale response offers it",()=>{
  const html=render("TENANT",{},"WAITING_START",{depositAgreementTenantSigned:true,canRequestCancellation:true});
  assert.doesNotMatch(html,/Đề nghị hủy và hoàn tiền/);assert.match(html,/không còn thao tác hủy tự nguyện/);
});
test("automatic default explains the deadline and does not ask the owner to finalize manually",()=>{
  const html=render("LANDLORD",{automatic:true,canComplete:true,notifiedAt:"2026-11-02T03:00:00Z"});
  assert.match(html,/Hệ thống tự xử lý khi hết hạn cuối/);assert.doesNotMatch(html,/Chốt giữ cọc &amp; hủy|Thông báo quá hạn trước khi xử lý cọc/);
});
test("completed unpaid-rent default shows the result without promising a refund or repeating the old warning",()=>{
  const message="Người thuê không thanh toán tháng đầu đúng hạn nên hồ sơ giữ phòng đã bị hủy. Chủ nhà giữ tiền cọc đã nhận. Không có tiền thuê cần hoàn.";
  const html=render("LANDLORD",{notifiedAt:"2026-11-09T00:01:00Z",respondBy:"2026-11-10T00:01:00Z",completedAt:"2026-11-10T00:01:01Z",reason:"Hết hạn sẽ tự chấm dứt HĐ cọc"},"CANCELLED_BY_SYSTEM",{message});
  assert.match(html,/Đã hủy giữ phòng · Chủ nhà giữ tiền cọc/);assert.match(html,/Không có tiền thuê cần hoàn/);
  assert.match(html,/Hạn cuối đã kết thúc:/);assert.match(html,/Đã hủy lúc:/);
  assert.doesNotMatch(html,/Tiền thuê đã nhận phải hoàn riêng|sẽ tự chấm dứt|Hạn phản hồi:/);
});
test("an open final notice never invents a received rent payment",()=>{
  const html=render("TENANT",{notifiedAt:"2026-11-09T00:01:00Z",respondBy:"2026-11-10T00:01:00Z",reason:"Người thuê chưa thanh toán tháng đầu."});
  assert.match(html,/Hạn cuối:/);assert.doesNotMatch(html,/Tiền thuê đã nhận phải hoàn riêng|Đã hủy lúc:/);
});
test("request summary links to the deposit workspace without embedding payment and signature controls",()=>{
  const html=render("TENANT",{},"WAITING_START",{depositAgreementContractId:"deposit-id",depositAgreementTenantSigned:true},{compact:true});
  assert.match(html,/href="\/dashboard\/tenant\/contracts\/deposit-id"/);assert.match(html,/Mở hồ sơ hợp đồng/);
  assert.doesNotMatch(html,/Đề nghị hủy và hoàn tiền|Sổ cọc|Chuyển khoản \/ Gửi chứng từ/);
});
for(const exempt of [false,true])test("request keeps a usable contract workspace before a PDF exists, deposit exemption="+exempt,()=>{
  const html=render("TENANT",{},"WAITING_START",{depositAgreementRequired:!exempt},{compact:true});
  assert.match(html,/href="\/dashboard\/tenant\/contracts\/reservations\/rental"/);
});
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
test("zero-deposit progress skips signing and hides the exemption row instead of showing a bank receipt",()=>{
  for(const role of ["LANDLORD","TENANT"]) {
    const html=render(role,{eligibleKind:null,policyVersion:"RESERVATION_DEFAULT_V2"},"WAITING_START",{
      depositAgreementRequired:false,paymentOpensAt:"2026-11-10T17:00:00Z",payments:[
        {id:"exemption",type:"RESERVATION_DEPOSIT",totalAmount:0,status:"CONFIRMED",confirmedAt:"2026-11-03T00:00:00Z",transferReference:"ZERO-REFERENCE",lineItems:[]},
      ],
    });
    assert.match(html,/Bỏ qua hợp đồng cọc/);assert.match(html,/ký hợp đồng thuê/);
    assert.doesNotMatch(html,/ZERO-REFERENCE|Xác nhận:|Cọc đã nhận được giữ riêng|Tiền cọc giữ chỗ|Chốt giữ cọc/);
  }
});
test("exempt rentals keep first-rent payment and receipt actions visible",()=>{
  const payment={id:"rent",type:"INITIAL",totalAmount:5000000,status:"TRANSFER_REPORTED",direction:"TENANT_TO_LANDLORD",lineItems:[]};
  const owner=render("LANDLORD",{eligibleKind:null},"AWAITING_RENT_CONFIRMATION",{depositAgreementRequired:false,payments:[payment]});
  assert.match(owner,/Tiền thuê tháng đầu/);assert.match(owner,/5\.000\.000/);assert.match(owner,/Xác nhận đã nhận đủ tiền/);
  const tenant=render("TENANT",{eligibleKind:null},"AWAITING_FIRST_RENT",{depositAgreementRequired:false,payments:[{...payment,status:"AWAITING_TRANSFER"}]});
  assert.match(tenant,/Chuyển khoản \/ Gửi chứng từ/);assert.doesNotMatch(tenant,/Xác nhận đã nhận đủ tiền/);
});
test("an unresolved zero-valued deposit record stays visible for reconciliation",()=>{
  const html=render("TENANT",{eligibleKind:null},"REQUIRES_REVIEW",{depositAgreementRequired:false,payments:[
    {id:"legacy",type:"RESERVATION_DEPOSIT",totalAmount:0,status:"DISPUTED",direction:"TENANT_TO_LANDLORD",lineItems:[]},
  ]});
  assert.match(html,/Cần đối soát/);assert.match(html,/Tiền cọc giữ chỗ/);
});
