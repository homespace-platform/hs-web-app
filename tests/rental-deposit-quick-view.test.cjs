const {test}=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),ts=require("typescript");
const React=require("react"),{renderToStaticMarkup}=require("react-dom/server");
const cache=new Map();
const read=file=>fs.readFileSync(path.join(__dirname,"..",file),"utf8");
function load(file) {
  if(cache.has(file))return cache.get(file);
  const output=ts.transpileModule(read(file),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,
    target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  const mod={exports:{}};
  const resolve=name=>name==="@/lib/rental-deposit-quick-view"?load("lib/rental-deposit-quick-view.ts"):
    name==="./rental-request.helper"?load("components/rental-request/rental-request.helper.ts"):
    name.startsWith("@/")?{}:require(name);
  vm.runInThisContext(`(function(require,module,exports){${output}\n})`)(resolve,mod,mod.exports);
  cache.set(file,mod.exports);return mod.exports;
}
const {canOpenDepositQuickView,selectReservationPayment,canReviewReservationReceipt,reservationPaymentTitle}=load("lib/rental-deposit-quick-view.ts");
const {ReservationReceipt}=load("components/rental-request/RentalDepositQuickViewModal.tsx");
const deposit={id:"deposit",rentalRequestId:"rental",payeeId:"owner",payerId:"tenant",type:"RESERVATION_DEPOSIT",
  direction:"TENANT_TO_LANDLORD",status:"TRANSFER_REPORTED",totalAmount:12400000,transferReference:"HS123",
  payerReportedAt:"2026-10-22T03:00:00Z",lineItems:[],evidences:[{id:"proof",storageObjectId:"private-proof"}],
  payeeBankAccountSnapshot:{bankName:"Ngân hàng mẫu",accountNumber:"123456",accountHolderName:"Chủ nhà"}};
const rent={...deposit,id:"rent",type:"INITIAL",status:"AWAITING_TRANSFER"};
const render=(payment=deposit,extra={})=>renderToStaticMarkup(React.createElement(ReservationReceipt,
  {payment,actorId:"owner",isLandlord:true,onConfirm(){},onReject(){},onProof(){},...extra}));
test("quick view keeps the reservation deposit selected even when first-month rent already exists",()=>{
  assert.equal(selectReservationPayment([rent,{...deposit,status:"CONFIRMED"}],"rental").id,"deposit");
  assert.equal(selectReservationPayment([rent],"rental").id,"rent");
  assert.equal(selectReservationPayment([{...deposit,rentalRequestId:"other"},{...deposit,type:"INITIAL_PAYMENT_REFUND"}],"rental"),null);
});
test("owner shortcut is available for receipts, not unaccepted requests or guessed payment data",()=>{
  assert.equal(canOpenDepositQuickView({status:"ACCEPTED",initialPayment:{id:"deposit"}}),true);
  assert.equal(canOpenDepositQuickView({status:"PENDING",initialPayment:{id:"deposit"}}),false);
  assert.equal(canOpenDepositQuickView({status:"ACCEPTED"}),false);
});
test("only the actual landlord payee may review a reported incoming deposit or combined payment",()=>{
  assert.equal(canReviewReservationReceipt(deposit,"owner",true),true);
  assert.equal(canReviewReservationReceipt({...deposit,type:"INITIAL"},"owner",true),true);
  for(const actor of [null,"tenant","stranger"])assert.equal(canReviewReservationReceipt(deposit,actor,true),false);
  assert.equal(canReviewReservationReceipt(deposit,"owner",false),false);
  for(const status of ["AWAITING_TRANSFER","CONFIRMED","REJECTED","DISPUTED","CANCELLED","EXPIRED","OVERDUE"])
    assert.equal(canReviewReservationReceipt({...deposit,status},"owner",true),false);
  assert.equal(canReviewReservationReceipt({...deposit,direction:"LANDLORD_TO_TENANT"},"owner",true),false);
  assert.equal(canReviewReservationReceipt({...deposit,type:"DEPOSIT_ADJUSTMENT"},"owner",true),false);
});
test("reported receipt shows evidence, exact amount and landlord confirmation without tenant upload controls",()=>{
  const html=render();assert.match(html,/Tiền cọc giữ chỗ/);assert.match(html,/12\.400\.000/);
  assert.match(html,/HS123|123456/);assert.match(html,/Xem chứng từ 1/);
  assert.match(html,/Xác nhận đã nhận đủ tiền/);assert.match(html,/Từ chối chứng từ/);
  assert.doesNotMatch(html,/RESERVATION_DEPOSIT|TRANSFER_REPORTED|Tôi đã chuyển khoản|type="file"/);
  assert.doesNotMatch(render(deposit,{actorId:"tenant"}),/Xác nhận đã nhận đủ tiền|Từ chối chứng từ/);
});
test("combined transfer remains visibly combined and zero deposit is never called an actual bank receipt",()=>{
  const combined={...deposit,type:"INITIAL",totalAmount:24800000,lineItems:[
    {id:"d",type:"DEPOSIT",displayName:"Tiền đặt cọc",amount:12400000},
    {id:"r",type:"RENT",displayName:"Tiền thuê kỳ đầu",amount:12400000}]};
  assert.match(render(combined),/Cọc \+ tiền thuê tháng đầu/);assert.match(render(combined),/24\.800\.000/);
  assert.equal(reservationPaymentTitle({...rent,lineItems:[]}),"Tiền thuê tháng đầu");
  const free=render({...deposit,totalAmount:0,status:"CONFIRMED",evidences:[]});
  assert.match(free,/Miễn cọc · Không cần chuyển khoản/);assert.doesNotMatch(free,/Đã xác nhận nhận đủ tiền|Xác nhận đã nhận đủ tiền/);
});
test("shortcut opens an independent quick modal, refreshes the list and retains tenant payment flow",()=>{
  const list=read("components/rental-request/RentalRequestsManagement.tsx");
  assert.match(list,/mode === "RECEIVED" && canOpenDepositQuickView\(req\)/);
  assert.match(list,/onClick=\{\(\)=>setDepositQuickTarget\(req\)\}/);
  assert.match(list,/onUpdated=\{fetchRequests\}/);
  assert.match(list,/mode === "SENT" && req.status === "ACCEPTED" && isPaymentPending/);
  const modal=read("components/rental-request/RentalDepositQuickViewModal.tsx");
  assert.match(modal,/view.askerRole!=="LANDLORD"/);assert.match(modal,/payment.payeeId!==userId/);
  assert.match(modal,/actionLock.current=true;setBusy\(true\)/);assert.match(modal,/getPaymentProofViewUrl\(storageId\)/);
  assert.match(modal,/Promise.allSettled/);assert.match(modal,/<dialog/);
});
