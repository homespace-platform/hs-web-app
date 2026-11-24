const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),ts=require("typescript");
const read=file=>fs.readFileSync(path.join(__dirname,"..",file),"utf8");
function load(file,imports=require){
  const out=ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const mod={exports:{}};vm.runInThisContext(`(function(require,module,exports){${out}\n})`)(imports,mod,mod.exports);return mod.exports;
}
test("both sidebars label /dashboard/invoices as payment history and the breadcrumb agrees",()=>{
  const nav=load("components/dashboard/dashboard-nav.ts");
  for(const groups of [nav.LANDLORD_NAV,nav.TENANT_NAV]){
    const items=groups.flatMap(g=>g.items).filter(i=>i.path==="/dashboard/invoices");
    assert.deepEqual(items.map(i=>i.title),["Lịch sử thanh toán"]);
  }
  const {buildDashboardTrail}=load("components/dashboard/dashboard-breadcrumb.ts");
  assert.equal(buildDashboardTrail("/dashboard/invoices").at(-1).label,"Lịch sử thanh toán");
});
test("legacy receipts route only redirects and keeps a validated ?contract=",()=>{
  const src=read("app/dashboard/invoices/receipts/page.tsx");
  assert.match(src,/safeResourceId/);assert.match(src,/router\.replace\(/);assert.doesNotMatch(src,/PaymentReceiptsPanel/);
});
