/* eslint-disable @typescript-eslint/no-require-imports -- Isolated TSX regression test. */
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),ts=require("typescript"),React=require("react");
const loadTs=require("./helpers/load-ts.cjs");

// Old /dashboard/invoices/<id>?section=&invoice= links (notifications, bookmarks) must land on the contract page's payment tab.
function redirect(contractId,search){
  const source=fs.readFileSync(path.join(__dirname,"../app/dashboard/invoices/[contractId]/page.tsx"),"utf8");
  const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  const replaced=[],effects=[];
  const mocks={react:{...React,useEffect:fn=>effects.push(fn)},"next/link":{__esModule:true,default:()=>null},
    "next/navigation":{useRouter:()=>({replace:url=>replaced.push(url)}),useParams:()=>({contractId}),useSearchParams:()=>new URLSearchParams(search)},
    "@/lib/payment-module":loadTs("lib/payment-module.ts")};
  const loaded={exports:{}};
  vm.runInThisContext(`(function(require,module,exports){${code}\nexports.Redirect=Redirect;})`)(name=>mocks[name]??require(name),loaded,loaded.exports);
  const tree=loaded.exports.Redirect();
  effects.forEach(fn=>fn());
  return {replaced,tree};
}

test("legacy payments URL redirects to the contract payment tab keeping section and invoice",()=>{
  assert.deepEqual(redirect("c-1","section=monthly&invoice=inv-1").replaced,["/dashboard/contracts/c-1?tab=payment&section=monthly&invoice=inv-1"]);
  assert.deepEqual(redirect("c-1","section=deposit").replaced,["/dashboard/contracts/c-1?tab=payment&section=deposit"]);
  assert.deepEqual(redirect("c-1","").replaced,["/dashboard/contracts/c-1?tab=payment&section=monthly"]);
  assert.deepEqual(redirect("c-1","section=bogus").replaced,["/dashboard/contracts/c-1?tab=payment&section=monthly"]);
  const first="first-rent:3f2c9a4e-1b7d-4c8a-9e21-5d6f0a7b8c90";
  assert.deepEqual(redirect("c-1",`section=monthly&invoice=${encodeURIComponent(first)}`).replaced,[`/dashboard/contracts/c-1?tab=payment&section=monthly&invoice=${encodeURIComponent(first)}`]);
});

test("a malformed invoice is forwarded as a distinct request so the list shows its neutral not-found",()=>{
  assert.deepEqual(redirect("c-1","invoice=..%2Fsecret").replaced,["/dashboard/contracts/c-1?tab=payment&section=monthly&invoice=..%2Fsecret"]);
});

test("an unsafe contract id never redirects and shows a neutral not-found",()=>{
  for(const bad of ["a/b","../x","","a b","-x"]){
    const r=redirect(bad,"section=deposit");
    assert.deepEqual(r.replaced,[],bad);
    assert.equal(r.tree.props.role,"status");
  }
});
