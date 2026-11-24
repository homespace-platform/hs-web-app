/* eslint-disable @typescript-eslint/no-require-imports -- Isolated TSX regression test. */
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),ts=require("typescript"),React=require("react");
const loadTs=require("./helpers/load-ts.cjs");

function loadComponent(file,mocks){
  const source=fs.readFileSync(path.join(__dirname,"..",file),"utf8");
  const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  const loaded={exports:{}};
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`)(name=>mocks[name]??require(name),loaded,loaded.exports);
  return loaded.exports.default;
}
const kids=node=>[node.props.children].flat(2).filter(Boolean);
const stub=()=>null,distinct=()=>()=>null;

// ---- PaymentTab: lease shows rent invoices only, deposit agreement shows the deposit part
const tabParts={monthly:distinct(),onboarding:distinct(),settlement:distinct()};
function renderTab({contract,search="",preActive=false,revision={charges:[],meters:{}}}){
  const PaymentTab=loadComponent("components/contract/page/PaymentTab.tsx",{
    react:React,"next/link":{__esModule:true,default:stub},"next/navigation":{useSearchParams:()=>new URLSearchParams(search)},
    "@/components/contract/detail/MonthlyInvoicesSection":{__esModule:true,default:tabParts.monthly},
    "@/components/rental-request/RentalOnboardingPanel":{__esModule:true,default:tabParts.onboarding},
    "./DepositSettlementPanel":{__esModule:true,default:tabParts.settlement},"./ui":{Card:stub},
    "@/lib/payment-module":loadTs("lib/payment-module.ts")});
  const initialPayment=React.createElement("div",{id:"initial"});
  return kids(PaymentTab({contract:{id:"c",rentalRequestId:"rr",status:"ACTIVE",...contract},revision,isLandlord:true,preActive,initialPayment,onUpdated:async()=>{},onSnapshot(){}}));
}

test("lease payment tab shows only rent invoices with the requested invoice and revision-derived props",()=>{
  const parts=renderTab({search:"tab=payment&invoice=inv-1",revision:{charges:[{chargeType:"ELECTRICITY",billingMethod:"PER_KWH"}],meters:{electricityInitial:4}}});
  assert.deepEqual(parts.map(p=>p.type===tabParts.monthly?"monthly":p.props.id),["monthly","initial"]);
  const p=parts[0].props;
  assert.equal(p.requestedInvoiceId,"inv-1");assert.equal(p.invalidInvoiceRequest,null);assert.equal(p.isTenant,false);
  assert.equal(p.electricityRequired,true);assert.equal(p.waterRequired,false);assert.equal(p.initialElectricity,"4");assert.equal(p.initialWater,undefined);
  assert.equal(p.contractActive,true);
});

test("a malformed ?invoice= stays a distinct neutral request, never 'no request'",()=>{
  const p=renderTab({search:"section=monthly&invoice=..%2Fsecret"})[0].props;
  assert.equal(p.requestedInvoiceId,null);assert.equal(p.invalidInvoiceRequest,"../secret");
  const synthetic="first-rent:3f2c9a4e-1b7d-4c8a-9e21-5d6f0a7b8c90";
  assert.equal(renderTab({search:`invoice=${encodeURIComponent(synthetic)}`})[0].props.requestedInvoiceId,synthetic);
});

test("deposit agreement payment tab shows the deposit payment and settlement, never rent invoices; a pre-active lease has no settlement",()=>{
  const dc=renderTab({contract:{agreementKind:"DEPOSIT"},preActive:true});
  assert.deepEqual(dc.map(p=>p.type),[tabParts.onboarding,tabParts.settlement,"div"]);
  assert.deepEqual(dc[0].props.sections,["payments"]);assert.equal(dc[1].props.rentalRequestId,"rr");
  const lease=renderTab({preActive:true});
  assert.deepEqual(lease.map(p=>p.type),[tabParts.onboarding,"div"]);
});

// ---- DepositSettlementPanel: adjustments + settlement of the lease that shares the deposit agreement's rental request
function renderSettlement({lease,failed=false,status}){
  const parts={deposit:distinct(),lifecycle:distinct()};
  const effects=[];let slot=0;const values=[lease===undefined?null:{id:"lease",status,...lease},failed,0];
  const Panel=loadComponent("components/contract/page/DepositSettlementPanel.tsx",{
    react:{...React,useState:()=>{const i=slot++;return [values[i],()=>{}];},useEffect:fn=>effects.push(fn),useCallback:fn=>fn},
    "next/link":{__esModule:true,default:stub},"@/components/common/PolicyDialog":{PolicyNotice:stub},
    "@/components/contract/detail/ContractLifecyclePanel":{__esModule:true,default:parts.lifecycle},
    "@/components/contract/detail/SettlementPaymentPanel":{DepositAdjustmentPayments:parts.deposit},
    "@/lib/contract-routes":loadTs("lib/contract-routes.ts"),"@/lib/payment-module":loadTs("lib/payment-module.ts"),
    "@/services/contract.service":{contractService:{getByRentalRequest:async()=>null}}});
  return {tree:Panel({rentalRequestId:"rr",isLandlord:false,onUpdated:async()=>{}}),parts};
}

test("settlement panel mounts adjustments once and the lifecycle settlement without a duplicate ledger",()=>{
  for(const status of ["ACTIVE","EXPIRED","CLOSED"]){
    const {tree,parts}=renderSettlement({lease:{},status});
    const children=kids(tree);
    assert.equal(children.filter(c=>c.type===parts.deposit).length,1);
    assert.equal(children.find(c=>c.type===parts.deposit).props.contractId,"lease");
    const lifecycle=children.find(c=>c.type===parts.lifecycle);
    assert.equal(lifecycle.props.contractId,"lease");assert.equal(lifecycle.props.mode,"settlement");assert.equal(lifecycle.props.showLedger,false);
  }
});

test("terminated lease shows the notice with links to the lease's rent invoices and end tab instead of the settlement panel",()=>{
  const {tree,parts}=renderSettlement({lease:{},status:"TERMINATED"});
  const children=kids(tree);
  assert.ok(!children.some(c=>c.type===parts.lifecycle));
  const notice=children.find(c=>c.type==="section");
  const hrefs=[];(function walk(n){if(!n||typeof n!=="object")return;if(Array.isArray(n))return n.forEach(walk);if(n.props?.href)hrefs.push(n.props.href);walk(n.props?.children);})(notice);
  assert.deepEqual(hrefs,["/dashboard/tenant/contracts/lease?tab=payment&section=monthly","/dashboard/tenant/contracts/lease?tab=end"]);
});

test("no lease yet renders nothing; a failed lookup shows a retry",()=>{
  assert.equal(renderSettlement({lease:undefined}).tree,null);
  assert.equal(renderSettlement({lease:undefined,failed:true}).tree.props.role,"alert");
});
