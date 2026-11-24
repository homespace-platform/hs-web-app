const {test}=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),ts=require("typescript");
const React=require("react"),{renderToStaticMarkup}=require("react-dom/server");
const read=file=>fs.readFileSync(path.join(__dirname,"..",file),"utf8");
const {loadTs}=require("./helpers/ts-loader.cjs");
const load=file=>loadTs(file);
const {selectOnboardingPayment,canReviewReservationReceipt,reservationPaymentTitle}=load("lib/rental-deposit-quick-view.ts");
const {ReservationReceipt,RentalReceiptNotice}=load("components/rental-request/RentalDepositQuickViewModal.tsx");
const deposit={id:"deposit",rentalRequestId:"rental",payeeId:"owner",payerId:"tenant",type:"RESERVATION_DEPOSIT",
  direction:"TENANT_TO_LANDLORD",status:"TRANSFER_REPORTED",totalAmount:12400000,transferReference:"HS123",
  payerReportedAt:"2026-10-22T03:00:00Z",lineItems:[],evidences:[{id:"proof",storageObjectId:"private-proof"}],
  payeeBankAccountSnapshot:{bankName:"Ngân hàng mẫu",accountNumber:"123456",accountHolderName:"Chủ nhà"}};
const rent={...deposit,id:"rent",type:"INITIAL",status:"AWAITING_TRANSFER"};
const render=(payment=deposit,extra={})=>renderToStaticMarkup(React.createElement(ReservationReceipt,
  {payment,actorId:"owner",isLandlord:true,onConfirm(){},onReject(){},onProof(){},...extra}));
test("the paid deposit can be selected explicitly without hijacking the default current-payment view",()=>{
  assert.equal(selectOnboardingPayment([rent,{...deposit,status:"CONFIRMED"}],"rental","deposit").id,"deposit");
  assert.equal(selectOnboardingPayment([rent],"rental").id,"rent");
  assert.equal(selectOnboardingPayment([{...deposit,rentalRequestId:"other"},{...deposit,type:"INITIAL_PAYMENT_REFUND"}],"rental"),null);
});

test("payment quick view opens the reported first month and still allows explicitly viewing the paid deposit",()=>{
  const paidDeposit={...deposit,status:"CONFIRMED"};const reportedRent={...rent,status:"TRANSFER_REPORTED"};
  assert.equal(selectOnboardingPayment([paidDeposit,reportedRent],"rental").id,"rent");
  assert.equal(selectOnboardingPayment([paidDeposit,reportedRent],"rental","deposit").id,"deposit");
  assert.equal(selectOnboardingPayment([paidDeposit,reportedRent],"rental","rent").id,"rent");
  assert.equal(selectOnboardingPayment([paidDeposit,rent],"rental").id,"rent");
  assert.equal(selectOnboardingPayment([paidDeposit],"rental","missing"),null);
  for(const patch of [{rentalRequestId:"other"},{direction:"LANDLORD_TO_TENANT"},{type:"INITIAL_PAYMENT_REFUND"},{type:"MONTHLY_RENT"}])
    assert.equal(selectOnboardingPayment([{...reportedRent,...patch}],"rental","rent"),null);
});

test("first-month transfer notice exposes the exact amount and receipt action directly on the list",()=>{
  const request={status:"ACCEPTED",initialPayment:{id:"rent",type:"INITIAL",displayName:"Tiền thuê tháng đầu",status:"TRANSFER_REPORTED",
    totalAmount:24680000,transferReference:"HSFIRSTRENT",payerReportedAt:"2026-10-31T03:00:00Z",confirmationDueAt:"2026-11-01T03:00:00Z"}};
  const notice=value=>renderToStaticMarkup(React.createElement(RentalReceiptNotice,{request:value,onOpen(){}}));
  const html=notice(request);assert.match(html,/Tiền thuê tháng đầu/);assert.match(html,/24\.680\.000/);
  assert.match(html,/HSFIRSTRENT|Hạn xác nhận/);assert.match(html,/Kiểm tra &amp; xác nhận/);
  assert.doesNotMatch(html,/INITIAL|RESERVATION_DEPOSIT/);
  assert.equal(notice({...request,status:"CANCELLED_BY_OWNER"}),"");
  assert.equal(notice({...request,initialPayment:{...request.initialPayment,status:"CONFIRMED"}}),"");
  const receipt=render({...rent,status:"TRANSFER_REPORTED",totalAmount:24680000,lineItems:[]});
  assert.match(receipt,/Tiền thuê tháng đầu/);assert.match(receipt,/Xác nhận đã nhận đủ tiền/);assert.doesNotMatch(receipt,/Khoản này chỉ là cọc giữ chỗ/);
});
test("only the actual landlord payee may review a reported incoming deposit or combined payment",()=>{
  assert.equal(canReviewReservationReceipt(deposit,"owner",true),true);
  assert.equal(canReviewReservationReceipt({...deposit,type:"INITIAL"},"owner",true),true);
  for(const actor of [null,"tenant","stranger"])assert.equal(canReviewReservationReceipt(deposit,actor,true),false);
  assert.equal(canReviewReservationReceipt(deposit,"owner",false),false);
  for(const status of ["AWAITING_TRANSFER","CONFIRMED","REJECTED","CANCELLED","EXPIRED","OVERDUE"])
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
test("the card's one primary action opens an independent quick modal, refreshes the list and keeps the tenant payment flow",()=>{
  const list=read("components/rental-request/RentalRequestsManagement.tsx"),card=read("components/rental-request/RentalRequestCard.tsx");
  assert.match(list,/review: setDepositQuickTarget/);assert.match(list,/pay: setPaymentTarget/);
  assert.match(list,/onUpdated=\{fetchRequests\}/);
  assert.match(card,/kind === "pay"/);assert.match(card,/kind === "review" && <RentalReceiptNotice request=\{req\} onOpen=\{\(\) => actions\.review\(req\)\}/);
  const modal=read("components/rental-request/RentalDepositQuickViewModal.tsx");
  assert.match(modal,/view\.askerRole!=="LANDLORD"/);assert.match(modal,/payment\.payeeId!==userId/);
  assert.match(modal,/actionLock\.current=true;setBusy\(true\)/);assert.match(modal,/getPaymentProofViewUrl\(storageId\)/);
  assert.match(modal,/Promise\.allSettled/);assert.match(modal,/<ModalShell/);assert.doesNotMatch(modal,/window\.(prompt|confirm)/);
  assert.match(modal,/selectOnboardingPayment\(view\.payments,request\.id,selectedPaymentId \?\? retainedPaymentId\.current\)/);
  assert.match(modal,/confirmReceipt\(current\.payment\.id\)/);
  assert.match(modal,/Chọn khoản thanh toán/);
});
