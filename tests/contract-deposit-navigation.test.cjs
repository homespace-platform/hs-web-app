const {test}=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),ts=require("typescript");
const React=require("react"),{renderToStaticMarkup}=require("react-dom/server");
function fixture(kind="LEASE") {
  const calls=[],effects=[],navigation=[],updates=[];
  const contract={id:"contract",contractNumber:"HD-TEST",status:"ACTIVE",agreementKind:kind};
  let state=0;const initial=[false,[contract],1,1,"ALL"];
  const hooks={...React,useCallback:callback=>callback,useState:()=>{const index=state++;return [initial[index],value=>updates.push([index,value])];},useRef:value=>({current:value}),useEffect:callback=>effects.push(callback)};
  const module={exports:{}};
  const source=fs.readFileSync(path.join(__dirname,"../components/contract/ContractListView.tsx"),"utf8");
  const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  const dependencies={react:hooks,"next/navigation":{useRouter:()=>({replace:(...args)=>navigation.push(args),push(){}}),useSearchParams:()=>new URLSearchParams({kind})},
    "@/services/contract.service":{contractService:{listContracts:async query=>{calls.push(query);return {result:[contract],totalPages:1};}}},
    "@/utils/apiError":{getApiErrorMessage:e=>e.message},"@/lib/contract-routes":{contractDetailPath:(role,id)=>`/dashboard/${role}/contracts/${id}`,invoiceDetailPath:id=>`/dashboard/invoices/${id}`},
    "./AgreementDocumentActions":{__esModule:true,default:()=>null},"next/link":{__esModule:true,default:({children,...props})=>React.createElement("a",props,children)}};
  vm.runInThisContext(`(function(require,module,exports){${output}\n})`)(name=>dependencies[name]??require(name),module,module.exports);
  const wrapper=module.exports.default({perspective:"tenant"});const tree=wrapper.props.children.type({perspective:"tenant"});
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
  if(kind==="DEPOSIT")assert.match(f.html,/Đã ký đủ HĐ cọc/);
});
test("switching tabs resets filters and keeps the scroll position",()=>{
  const f=fixture();const tab=find(f.tree,n=>n.props?.role==="tab"&&n.props.children==="Hợp đồng cọc");tab.props.onClick();
  assert.deepEqual(f.navigation,[["/dashboard/tenant/contracts?kind=DEPOSIT",{scroll:false}]]);
  assert.deepEqual(f.updates,[[2,1],[4,"ALL"]]);
});
