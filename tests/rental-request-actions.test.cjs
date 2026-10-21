const {test}=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),ts=require("typescript");
const source=fs.readFileSync(path.join(__dirname,"../lib/rental-request-actions.ts"),"utf8");
const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};vm.runInThisContext(`(function(module,exports){${output}\n})`)(mod,mod.exports);
const canCancel=mod.exports.canCancelRentalRequest;
const unpaid={status:"ACCEPTED",initialPayment:{status:"AWAITING_TRANSFER",totalAmount:100,canCancelImmediately:true}};
test("both screens use the shared permission without requiring the tenant role",()=>{
  for(const file of ["RentalRequestsManagement","RentalRequestDetailModal"]) {
    const text=fs.readFileSync(path.join(__dirname,`../components/rental-request/${file}.tsx`),"utf8");
    assert.match(text,/canCancelRentalRequest\((req|detail),linkedContract/);
    assert.doesNotMatch(text,/mode === "SENT" && (req|detail).status === "PENDING" &&/);
  }
  assert.equal(canCancel({status:"PENDING"}),true);assert.equal(canCancel(unpaid),true);
});
test("paid deposit flag, absent data, reported/rejected/disputed status and execution contracts cannot show immediate cancel",()=>{
  assert.equal(canCancel({...unpaid,initialPayment:{...unpaid.initialPayment,canCancelImmediately:false}}),false);
  assert.equal(canCancel({status:"ACCEPTED"}),false);
  for(const status of ["TRANSFER_REPORTED","CONFIRMED","DISPUTED","REJECTED"])assert.equal(canCancel(unpaid,null,status),false);
  for(const status of ["PENDING_REVIEW","LANDLORD_SIGNATURE_PENDING","TENANT_SIGNATURE_PENDING","ACTIVE","CANCELLED"])assert.equal(canCancel(unpaid,{status}),false);
  for(const status of ["COMPLETED","CANCELLED_BY_OWNER","CANCELLED_BY_RENTER","EXPIRED"])assert.equal(canCancel({...unpaid,status}),false);
});
test("zero-deposit waiver is cancellable only when server confirms both payments are safe",()=>{
  assert.equal(canCancel({...unpaid,initialPayment:{status:"CONFIRMED",totalAmount:0,canCancelImmediately:true}}),true);
  assert.equal(canCancel({...unpaid,initialPayment:{status:"CONFIRMED",totalAmount:0,canCancelImmediately:false}}),false);
});
