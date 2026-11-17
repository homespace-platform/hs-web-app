/* eslint-disable @typescript-eslint/no-require-imports -- Isolated TSX regression test. */
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),ts=require("typescript"),React=require("react");

test("deposit panels have unique sibling keys across invoice refreshes",()=>{
  const source=fs.readFileSync(path.join(__dirname,"../app/dashboard/invoices/[contractId]/page.tsx"),"utf8")+"\nexport { InvoicesBody };";
  const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  const data={contract:{id:"root",contractNumber:"HD-1",rentalRequestId:"rental",landlordId:"owner",tenantId:"tenant",status:"ACTIVE"},revision:{charges:[],meters:{}}};
  let state=0;
  const react={...React,useState:initial=>[state++===0?data:initial,()=>{}],useRef:initial=>({current:initial}),useCallback:callback=>callback,useEffect:()=>{}};
  const deposit=()=>null,lifecycle=()=>null,onboarding=()=>null,empty=()=>null;
  const mocks={react,"next/link":{__esModule:true,default:empty},"next/navigation":{useParams:()=>({}),useSearchParams:()=>new URLSearchParams()},
    "@/components/contract/detail/MonthlyInvoicesSection":{__esModule:true,default:empty},
    "@/components/rental-request/RentalOnboardingPanel":{__esModule:true,default:onboarding},
    "@/components/contract/detail/ContractLifecyclePanel":{__esModule:true,default:lifecycle},
    "@/components/contract/detail/SettlementPaymentPanel":{DepositAdjustmentPayments:deposit},
    "@/features/auth/useAuth":{useAuth:()=>({})},"@/hooks/useAgreementChangeSync":{useAgreementChangeSync:()=>{}},
    "@/services/contract.service":{contractService:{}},"@/lib/contract-routes":{contractDetailPath:()=>"/contract"},
    "@/lib/payment-module":{contractStateLabels:{ACTIVE:"Active"},paymentSections:[],paymentSection:()=>"deposit",paymentModulePath:()=>"/invoices"},
    "@/utils/apiError":{getApiErrorMessage:()=>"error"}};
  const loaded={exports:{}};
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`)(name=>mocks[name]??require(name),loaded,loaded.exports);
  const children=loaded.exports.InvoicesBody({actorId:"tenant",contractId:"root",section:"deposit",requestedInvoiceId:null}).props.children.filter(Boolean);
  assert.equal(children.filter(child=>child.type===deposit).length,1);
  assert.equal(children.filter(child=>child.type===lifecycle).length,1);
  assert.equal(children.find(child=>child.type===onboarding).props.showComplaints,false);
  const keys=children.map(child=>child.key).filter(key=>key!==null);
  assert.equal(keys.length,new Set(keys).size);
});
