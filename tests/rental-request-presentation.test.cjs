/* eslint-disable @typescript-eslint/no-require-imports -- Node regression tests execute the real TypeScript with isolated dependencies. */
const {test}=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),ts=require("typescript");
const cache=new Map();
function load(file){
  if(cache.has(file))return cache.get(file);
  const out=ts.transpileModule(fs.readFileSync(path.join(__dirname,"..",file),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const mod={exports:{}};
  vm.runInThisContext(`(function(require,module,exports){${out}\n})`)(n=>n==="@/lib/rental-labels"?load("lib/rental-labels.ts"):require(n),mod,mod.exports);
  cache.set(file,mod.exports);return mod.exports;
}
const {presentRentalRequest:present,primaryCardAction,preTenancySteps,isClosedRequest,transferWindowClosed}=load("lib/rental-request-presentation.ts");
const accepted=(payment,extra={})=>({status:"ACCEPTED",initialPayment:payment?{status:payment}:null,...extra});
const phase=(input)=>present({role:"TENANT",...input}).phase;

test("closed requests ignore a leftover active contract (the old list showed 'Đã thuê' for a cancelled request)",()=>{
  for(const status of ["REJECTED","EXPIRED","CANCELLED_BY_RENTER","CANCELLED_BY_OWNER","CANCELLED_BY_SYSTEM"])
    assert.equal(phase({request:{status},contract:{status:"ACTIVE"}}),"closed");
  assert.equal(present({role:"TENANT",request:{status:"COMPLETED"}}).label,"Đã thuê thành công");
});
test("pending reads differently for each side and has no payment wording",()=>{
  assert.equal(present({role:"LANDLORD",request:{status:"PENDING"}}).label,"Chờ bạn duyệt");
  assert.equal(present({role:"TENANT",request:{status:"PENDING"}}).label,"Chờ chủ nhà duyệt");
});
test("precedence: refund > active lease > reported > rejected > contract stage > paid > unpaid",()=>{
  assert.equal(phase({request:accepted("CONFIRMED",{cancellationRefundPending:true}),contract:{status:"ACTIVE"}}),"refund");
  assert.equal(phase({request:accepted(),stage:"CANCELLATION_REFUND_PENDING"}),"refund");
  assert.equal(phase({request:accepted("TRANSFER_REPORTED"),contract:{status:"ACTIVE"}}),"rented");
  assert.equal(phase({request:accepted("CONFIRMED"),contract:{status:"DRAFT"},livePaymentStatus:"TRANSFER_REPORTED"}),"reported");
  assert.equal(phase({request:accepted("TRANSFER_REPORTED"),livePaymentStatus:"REJECTED"}),"rejected");
  assert.equal(phase({request:accepted("REJECTED"),contract:{status:"PENDING_REVIEW"}}),"rejected");
  assert.equal(phase({request:accepted("CONFIRMED"),contract:{status:"PENDING_REVIEW"}}),"contract");
  assert.equal(phase({request:accepted("CONFIRMED")}),"paid");
  assert.equal(phase({request:accepted("AWAITING_TRANSFER")}),"unpaid");
  assert.equal(phase({request:accepted()}),"unpaid");
  assert.equal(phase({request:accepted("AWAITING_TRANSFER"),stage:"AWAITING_RENT_CONFIRMATION"}),"reported");
});
test("list and modal give the same answer for the same input (one function, role decides the wording only)",()=>{
  const input={request:accepted("TRANSFER_REPORTED")};
  assert.equal(present({role:"LANDLORD",...input}).phase,present({role:"TENANT",...input}).phase);
  assert.match(present({role:"LANDLORD",...input}).label,/chờ bạn xác nhận/);
  assert.match(present({role:"TENANT",...input}).label,/chờ xác nhận/);
});
test("one primary action per role and phase",()=>{
  assert.equal(primaryCardAction("LANDLORD",{phase:"pending"}),"respond");
  assert.equal(primaryCardAction("LANDLORD",{phase:"reported"}),"review");
  assert.equal(primaryCardAction("LANDLORD",{phase:"paid"},{canCreateContract:true}),"createContract");
  assert.equal(primaryCardAction("LANDLORD",{phase:"paid"}),"open");
  assert.equal(primaryCardAction("LANDLORD",{phase:"unpaid"}),"open");
  assert.equal(primaryCardAction("TENANT",{phase:"unpaid"}),"pay");
  assert.equal(primaryCardAction("TENANT",{phase:"rejected"}),"pay");
  assert.equal(primaryCardAction("TENANT",{phase:"pending"}),"open");
  assert.equal(primaryCardAction("TENANT",{phase:"reported"}),"open");
});
test("closed statuses stop polling",()=>{
  assert.equal(isClosedRequest("COMPLETED"),true);assert.equal(isClosedRequest("CANCELLED_BY_SYSTEM"),true);
  assert.equal(isClosedRequest("ACCEPTED"),false);assert.equal(isClosedRequest("PENDING"),false);
});
const states=(v)=>preTenancySteps(v)?.map(s=>s.state).join(",");
test("stepper: done / current / upcoming come from the stage",()=>{
  assert.equal(states({stage:"AWAITING_DEPOSIT"}),"current,upcoming,upcoming,upcoming");
  assert.equal(states({stage:"AWAITING_DEPOSIT_SIGNATURE"}),"done,current,upcoming,upcoming");
  assert.equal(states({stage:"WAITING_START"}),"done,done,current,upcoming");
  assert.equal(states({stage:"READY_TO_SIGN"}),"done,done,done,current");
  assert.equal(states({stage:"COMPLETED"}),"done,done,done,done");
  assert.equal(states({stage:"WAITING_START",depositAgreementRequired:false}),"done,skipped,current,upcoming");
});
test("stepper: a review stage uses the next action, closed paths have no stepper",()=>{
  assert.equal(states({stage:"REQUIRES_REVIEW",nextAction:{code:"SIGNING_OVERDUE"}}),"done,done,done,current");
  assert.equal(states({stage:"REQUIRES_REVIEW",nextAction:{code:"REVIEW_PAYMENT"},hasRentPayment:true}),"done,done,current,upcoming");
  assert.equal(states({stage:"REQUIRES_REVIEW",nextAction:{code:"REVIEW_PAYMENT"}}),"current,upcoming,upcoming,upcoming");
  for(const stage of ["CANCELLATION_REQUESTED","CANCELLATION_REFUND_PENDING","CANCELLED_BY_RENTER","EXPIRED","PENDING","SOMETHING_NEW"])assert.equal(preTenancySteps({stage}),null);
});

// Card render: ONE primary action per state, no duplicated CTA areas.
const React=require("react"),{renderToStaticMarkup}=require("react-dom/server");
const {loadTs}=require("./helpers/ts-loader.cjs");
const stub=()=>null;
const Card=loadTs("components/rental-request/RentalRequestCard.tsx",{
  "next/image":{__esModule:true,default:()=>null},"next/link":{__esModule:true,default:({children,href,...p})=>React.createElement("a",{href,...p},children)},
  "@/components/contract/AgreementDocumentActions":{__esModule:true,default:stub},
  "@/components/common/PolicyDialog":{PolicyNotice:({summary})=>React.createElement("div",null,summary)},
  "@/lib/listing-detail-access":{listingDetailPath:id=>"/rent/"+id},
  "@/hooks/useNowMs":{useNowMs:()=>Date.parse("2026-11-24T00:00:00Z")},
}).default;
const actions=new Proxy({},{get:()=>()=>{}});
const base={id:"r",listingId:"l",listingTitle:"Phòng A",listingAddress:"HN",listingThumbnail:null,listingPrice:5000000,renterName:"An",renterPhone:"0900",
  renterEmail:null,moveInDate:"2026-12-01",leaseMonths:12,occupantCount:1,depositAmount:5000000,createdAt:"2026-11-01T00:00:00Z",status:"PENDING"};
const render=(req,mode,extra={})=>renderToStaticMarkup(React.createElement(Card,{req:{...base,...req},mode,holdLabel:"45 phút",busy:false,creatingContract:false,canManage:true,canManageContract:true,actions,...extra}));
test("landlord PENDING card: accept/reject, hold minutes from the policy, no cancel; tenant PENDING: cancel, no accept",()=>{
  const owner=render({}, "RECEIVED");
  assert.match(owner,/Chấp thuận · giữ chỗ 45 phút/);assert.match(owner,/Từ chối/);assert.doesNotMatch(owner,/Hủy yêu cầu|60p/);
  const tenant=render({}, "SENT");
  assert.match(tenant,/Hủy yêu cầu/);assert.doesNotMatch(tenant,/Chấp thuận|Từ chối/);assert.match(tenant,/Mở hồ sơ/);assert.doesNotMatch(tenant,/Xem chi tiết/);assert.match(owner,/Xem chi tiết/);
});
test("tenant ACCEPTED unpaid: Thanh toán; landlord reported: Kiểm tra & xác nhận; closed: nothing to pay",()=>{
  const unpaid={status:"ACCEPTED",initialPayment:{id:"p",status:"AWAITING_TRANSFER",totalAmount:1,canCancelImmediately:false}};
  assert.match(render(unpaid,"SENT"),/Thanh toán/);assert.doesNotMatch(render(unpaid,"RECEIVED"),/Thanh toán|Kiểm tra &amp; xác nhận/);
  const reported={status:"ACCEPTED",initialPayment:{id:"p",status:"TRANSFER_REPORTED",totalAmount:1}};
  const html=render(reported,"RECEIVED");
  assert.equal((html.match(/Kiểm tra &amp; xác nhận/g)||[]).length,1);assert.doesNotMatch(render(reported,"SENT"),/Kiểm tra &amp; xác nhận/);
  assert.doesNotMatch(render({status:"CANCELLED_BY_RENTER"},"SENT"),/Thanh toán|Hủy yêu cầu/);
});

test("a rejected deposit / first rent past its deadline cannot be resent: no pay button, landlord must reconcile",()=>{
  const payment={type:"INITIAL",status:"REJECTED",dueAt:"2026-01-01T00:00:00Z"};
  assert.equal(transferWindowClosed(payment,Date.parse("2026-01-01T00:00:01Z")),true);
  assert.equal(transferWindowClosed(payment,Date.parse("2025-12-31T23:59:59Z")),false);
  assert.equal(transferWindowClosed({...payment,status:"AWAITING_TRANSFER"},Date.parse("2027-01-01T00:00:00Z")),false);
  assert.equal(transferWindowClosed({...payment,type:"INITIAL_PAYMENT_REFUND"},Date.parse("2027-01-01T00:00:00Z")),false);
  assert.equal(transferWindowClosed({status:"REJECTED"},Date.parse("2027-01-01T00:00:00Z")),false);
  const tenant=present({role:"TENANT",request:accepted("REJECTED"),paymentLapsed:true});
  assert.equal(tenant.phase,"rejected");assert.equal(tenant.lapsed,true);
  assert.equal(primaryCardAction("TENANT",tenant),"open");
  assert.match(present({role:"LANDLORD",request:accepted("REJECTED"),paymentLapsed:true}).hint,/đối soát/);
  assert.equal(primaryCardAction("TENANT",present({role:"TENANT",request:accepted("REJECTED")})),"pay");
});
test("card: a rejected transfer past its deadline offers no resend button",()=>{
  const late=render({status:"ACCEPTED",initialPayment:{id:"p",type:"INITIAL",status:"REJECTED",dueAt:"2026-11-23T00:00:00Z",totalAmount:1}},"SENT");
  assert.doesNotMatch(late,/Gửi lại chứng từ/);assert.match(late,/Quá hạn|quá hạn/);
  const open=render({status:"ACCEPTED",initialPayment:{id:"p",type:"INITIAL",status:"REJECTED",dueAt:"2026-11-25T00:00:00Z",totalAmount:1}},"SENT");
  assert.match(open,/Gửi lại chứng từ/);
});
