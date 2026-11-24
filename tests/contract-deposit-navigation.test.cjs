/* eslint-disable @typescript-eslint/no-require-imports -- Isolated TSX component tests. */
const {test}=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),ts=require("typescript");
const React=require("react"),{renderToStaticMarkup}=require("react-dom/server");
function fixture(kind="LEASE",status="ACTIVE") {
  const calls=[],effects=[],navigation=[],updates=[];
  const contract={id:"contract",contractNumber:"HD-TEST",status,agreementKind:kind};
  let state=0;const initial=[false,[contract],1,1,"ALL"];
  const hooks={...React,useCallback:callback=>callback,useState:()=>{const index=state++;return [initial[index],value=>updates.push([index,value])];},useRef:value=>({current:value}),useEffect:callback=>effects.push(callback)};
  const fixtureModule={exports:{}};
  const source=fs.readFileSync(path.join(__dirname,"../components/contract/ContractListView.tsx"),"utf8");
  const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  const dependencies={react:hooks,"next/navigation":{useRouter:()=>({replace:(...args)=>navigation.push(args),push(){}}),useSearchParams:()=>new URLSearchParams({kind})},
    "@/components/common/PolicyDialog":{ PolicyNotice: ({ summary, children, text }) => require("react").createElement("div", null, summary, children, text), PolicyConsent: () => null },
    "@/services/contract.service":{contractService:{listContracts:async query=>{calls.push(query);return {result:[contract],totalPages:1};}}},
    "@/utils/apiError":{getApiErrorMessage:e=>e.message},"@/lib/contract-routes":{contractDetailPath:(role,id)=>`/dashboard/${role}/contracts/${id}`,invoiceDetailPath:id=>`/dashboard/invoices/${id}`},
    "./AgreementDocumentActions":{__esModule:true,default:()=>null},"next/link":{__esModule:true,default:({children,...props})=>React.createElement("a",props,children)}};
  const labelsModule={exports:{}};
  vm.runInThisContext("(function(require,module,exports){"+ts.transpileModule(fs.readFileSync(path.join(__dirname,"../lib/rental-labels.ts"),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText+"\n})")(require,labelsModule,labelsModule.exports);
  dependencies["@/lib/rental-labels"]=labelsModule.exports;
  vm.runInThisContext(`(function(require,module,exports){${output}\n})`)(name=>dependencies[name]??require(name),fixtureModule,fixtureModule.exports);
  const wrapper=fixtureModule.exports.default({perspective:"tenant"});const tree=wrapper.props.children.type({perspective:"tenant"});
  return {tree,html:renderToStaticMarkup(tree),effects,calls,navigation,updates};
}
function find(node,predicate) {
  if(!node||typeof node!=="object")return;
  if(Array.isArray(node))return node.map(n=>find(n,predicate)).find(Boolean);
  return predicate(node)?node:find(node.props?.children,predicate);
}
for(const kind of ["LEASE","DEPOSIT"])test(kind+" tab filters on the server and keeps the other document kind out of its results",async()=>{
  const f=fixture(kind);assert.match(f.html,/role="tablist"/);assert.match(f.html,/Hợp đồng cọc/);assert.match(f.html,/Hợp đồng thuê/);
  const tab=find(f.tree,n=>n.props?.role==="tab"&&n.props["aria-selected"]===true);
  assert.equal(tab.props.children,kind==="DEPOSIT"?"Hợp đồng cọc":"Hợp đồng thuê");
  const windowBefore=global.window;global.window={setInterval:()=>0,clearInterval(){}};
  try {const cleanup=f.effects[0]();await new Promise(resolve=>setImmediate(resolve));cleanup();}
  finally {global.window=windowBefore;}
  assert.equal(f.calls.length,1);assert.equal(f.calls[0].agreementKind,kind);assert.equal(f.calls[0].role,"TENANT");
  assert.equal(f.calls[0].includeDepositFallback,undefined);
  assert.equal(f.calls[0].status,undefined);
  if(kind==="DEPOSIT")assert.match(f.html,/Đã ký đủ/);
});
test("switching tabs resets filters and keeps the scroll position",()=>{
  const f=fixture();const tab=find(f.tree,n=>n.props?.role==="tab"&&n.props.children==="Hợp đồng cọc");tab.props.onClick();
  assert.deepEqual(f.navigation,[["/dashboard/tenant/contracts?kind=DEPOSIT",{scroll:false}]]);
  assert.deepEqual(f.updates,[[2,1],[4,"ALL"]]);
});

test("status chips are four client-side groups with counts and no per-status API filter",()=>{
  const f=fixture("DEPOSIT","CLOSED");
  for(const label of ["Cần tôi xử lý","Đang chờ bên kia","Đã ký đủ","Đã kết thúc"])assert.match(f.html,new RegExp(label));
  const ended=find(f.tree,n=>n.type==="button"&&Array.isArray(n.props.children)&&String(n.props.children.join("")).startsWith("Đã kết thúc"));assert.ok(ended);
  ended.props.onClick();assert.deepEqual(f.updates,[[4,"ENDED"]]);
  assert.match(f.html,/Hợp đồng cọc đã hoàn tất|Đã đóng/);
});
test("one primary action per card comes from the row's own data",()=>{
  const sign=fixture("LEASE","TENANT_SIGNATURE_PENDING");
  assert.match(sign.html,/Ký số/);assert.match(sign.html,/tab=sign/);
  const active=fixture("LEASE","ACTIVE");assert.match(active.html,/Xem hóa đơn/);assert.match(active.html,/\/dashboard\/invoices\/contract/);
  const closedDeposit=fixture("DEPOSIT","CLOSED");assert.match(closedDeposit.html,/Mở hồ sơ/);assert.doesNotMatch(closedDeposit.html,/Xem hóa đơn/);
});
