const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),ts=require("typescript"),vm=require("node:vm");
const mod={exports:{}};
const source=ts.transpileModule(fs.readFileSync(path.join(__dirname,"../lib/contract-field-state.ts"),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
vm.runInThisContext(`(function(exports){${source}\n})`)(mod.exports);
const {amendmentFieldChanged:changed}=mod.exports;
const base=()=>({financial:{amountValue:"12400000.00",depositAmountNumber:"24.800.000 VNĐ"},tenant:{occupantCount:4,bankAccountNumber:"000123"},property:{areaText:"50 m²",features:[{featureName:"Diện tích đất",featureValue:"50.00 m²"}]},charges:[{name:"Internet",unitAmount:"90000",billingMethod:"PER_MONTH"},{name:"Rác",unitAmount:"30000",billingMethod:"PER_PERSON_MONTH"}],equipments:[{name:"Giường",quantity:1},{name:"Bàn",quantity:2}],amenities:[{code:"WIFI",name:"WiFi"}],policies:{petPolicy:"Không nuôi",latePaymentFeeMode:"FIXED_PER_DAY"},specialTerms:"Thỏa thuận"});
test("blue source, green actual edits, restore blue; numerical formatting never loses bank-number zeroes",()=>{
  assert.match(mod.exports.fieldStateClass.changed,/text-green-700/);assert.doesNotMatch(mod.exports.fieldStateClass.changed,/red|rose/);
  const a=base(),b=structuredClone(a);assert.equal(changed(a,b,"tenant","occupantCount"),false);
  b.tenant.occupantCount="4";assert.equal(changed(a,b,"tenant","occupantCount"),false);
  b.tenant.occupantCount="5";assert.equal(changed(a,b,"tenant","occupantCount"),true);
  b.tenant.occupantCount=4;assert.equal(changed(a,b,"tenant","occupantCount"),false);
  b.tenant.bankAccountNumber="123";assert.equal(changed(a,b,"tenant","bankAccountNumber"),true);
  b.financial.amountValue="12400000";assert.equal(changed(a,b,"financial","amountValue"),false);
  b.financial.depositAmountValue="24800000";assert.equal(changed(a,b,"financial","depositAmountValue"),false);
});
test("aliases and displayed unit fallbacks do not count as edits",()=>{
  const a=base(),b=structuredClone(a);b.property.unitNumber="Toàn bộ căn";b.property.areaText="50 mét vuông";
  b.property.features[0].featureValue="50 mét vuông";b.charges[0].billingMethod="Tháng";b.policies.latePaymentFeeMode="Mỗi ngày";
  assert.equal(changed(a,b,"property","unitNumber"),false);assert.equal(changed(a,b,"property","areaText"),false);
  assert.equal(changed(a,b,"property","featureValue",0),false);assert.equal(changed(a,b,"charges","billingMethod",0),false);
  assert.equal(changed(a,b,"policies","latePaymentFeeMode"),false);
});
test("deleting and reordering rows keeps untouched cells blue; added and edited cells are green",()=>{
  const a=base(),b=structuredClone(a);b.equipments.splice(0,1);assert.equal(changed(a,b,"equipments","quantity",0),false);
  b.equipments[0].quantity=3;assert.equal(changed(a,b,"equipments","quantity",0),true);assert.equal(changed(a,b,"equipments","name",0),false);
  b.equipments.push({name:"Tủ mới",quantity:1});assert.equal(changed(a,b,"equipments","name",1),true);
  b.charges.reverse();assert.equal(changed(a,b,"charges","unitAmount",0),false);
  b.amenities[0].name="WiFi riêng";assert.equal(changed(a,b,"amenities","name",0),true);
});
test("renames, old policy snapshots and replacement baselines compare the correct source",()=>{
  const a=base(),b=structuredClone(a);b.charges[0].name="Internet mới";
  assert.equal(changed(a,b,"charges","name",0),true);assert.equal(changed(a,b,"charges","unitAmount",0),false);
  b.policies.listingPolicies=[{code:"petPolicy",label:"petPolicy",value:"Không nuôi",displayValue:"Không nuôi"}];
  assert.equal(changed(a,b,"policies","displayValue",0),false);b.policies.listingPolicies[0].displayValue="Nuôi mèo";assert.equal(changed(a,b,"policies","displayValue",0),true);
  const scheduled=base();scheduled.financial.amountValue="12000000";const editor=structuredClone(scheduled);
  assert.equal(changed(scheduled,editor,"financial","amountValue"),false);editor.financial.amountValue="12400000";assert.equal(changed(scheduled,editor,"financial","amountValue"),true);
});
